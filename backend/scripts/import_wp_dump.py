"""
Import WooCommerce data from a phpMyAdmin SQL dump (gzipped or plain) directly
into the local Postgres used by this FastAPI app. No MySQL restore required.

What it does:
- Parses INSERT statements for wp_posts, wp_postmeta, wp_terms, wp_term_taxonomy,
  and wp_term_relationships from the dump.
- Reconstructs products, variations, categories/brands/tags, prices, stock, images.
- Writes Product records into Postgres (via SQLAlchemy SessionLocal).
- Stores variations inside the Product.attributes["variants"] list so the
  frontend can render them; aggregates stock/price from variations when needed.

Usage:
    python backend/scripts/import_wp_dump.py path/to/u554181877_qSob8.sql.gz

Notes:
- Expects the app's DATABASE_URL to point to your target Postgres.
- Keeps image URLs as-is (points to old host). If you re-host images elsewhere,
  adjust the URLs after importing.
"""

from __future__ import annotations

import argparse
import gzip
import os
import re
from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

import sys
import unicodedata
from html import unescape

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db import SessionLocal
from app.models.product import Product as ProductModel
from app.models.brand import Brand
from app.models.category import Category


# --------- Low-level SQL INSERT parser (MySQL-style) ---------


def _stream_insert_statements(path: Path, tables: set[str]) -> Iterator[Tuple[str, List[str], str]]:
    """
    Yield (table_name, columns, values_sql) for INSERT statements targeting
    one of the requested tables. Streams the dump to avoid loading everything
    in memory.
    """
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", errors="replace") as f:
        buf: List[str] = []
        active = False
        target = None
        for line in f:
            if line.startswith("INSERT INTO `"):
                target = None
                for tbl in tables:
                    if line.startswith(f"INSERT INTO `{tbl}`"):
                        target = tbl
                        break
                if not target:
                    continue
                buf = [line]
                active = True
                if line.strip().endswith(");"):
                    stmt = "".join(buf)
                    columns, values_sql = _split_insert(stmt)
                    yield target, columns, values_sql
                    buf = []
                    active = False
            elif active:
                buf.append(line)
                if line.strip().endswith(");"):
                    stmt = "".join(buf)
                    columns, values_sql = _split_insert(stmt)
                    yield target, columns, values_sql
                    buf = []
                    active = False


def _split_insert(stmt: str) -> Tuple[List[str], str]:
    """
    Split an INSERT statement into (columns, values_sql_string).
    More lenient than a strict regex to tolerate newlines/spacing and dumps
    that don’t end the statement on the same line.
    """
    # Remove trailing semicolon if present
    stmt = stmt.strip()
    if stmt.endswith(";"):
        stmt = stmt[:-1]

    # Find the VALUES keyword (allow newline/whitespace between)
    m_vals = re.search(r"\bVALUES\b", stmt, re.IGNORECASE)
    if not m_vals:
        raise ValueError(f"Cannot find VALUES in INSERT: {stmt[:200]}")

    idx = m_vals.start()
    header = stmt[:idx]
    values_sql = stmt[m_vals.end() :].lstrip()

    # Extract column list from header
    m = re.search(r"INSERT INTO `[^`]+` \(([^)]+)\)", header, re.S)
    if not m:
        raise ValueError(f"Cannot parse column list in INSERT: {stmt[:200]}")
    cols_raw = m.group(1)
    cols = [c.strip(" `") for c in cols_raw.split(",")]
    return cols, values_sql


def _parse_values(values_sql: str) -> List[List[Any]]:
    """
    Parse the VALUES portion of an INSERT INTO ... VALUES (...),(...);
    Returns a list of rows; each row is a list of raw string/None.
    Handles MySQL single-quoted strings with backslash escapes.
    """
    rows: List[List[Any]] = []
    i = 0
    n = len(values_sql)
    # Expect sequence of rows wrapped in parentheses, separated by commas.
    while i < n:
        # skip leading whitespace / commas
        while i < n and values_sql[i] in " \n\t,":
            i += 1
        if i >= n:
            break
        if values_sql[i] != "(":
            raise ValueError(f"Expected '(' at position {i}: {values_sql[i:i+20]}")
        i += 1
        row: List[Any] = []
        field_chars: List[str] = []
        in_string = False
        escape = False
        while i < n:
            ch = values_sql[i]
            i += 1
            if in_string:
                if escape:
                    # simple backslash escapes
                    if ch == "n":
                        field_chars.append("\n")
                    elif ch == "r":
                        field_chars.append("\r")
                    elif ch == "t":
                        field_chars.append("\t")
                    else:
                        field_chars.append(ch)
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == "'":
                    in_string = False
                else:
                    field_chars.append(ch)
            else:
                if ch == "'":
                    in_string = True
                elif ch == ",":
                    val = _convert_field("".join(field_chars))
                    row.append(val)
                    field_chars = []
                elif ch == ")":
                    val = _convert_field("".join(field_chars))
                    row.append(val)
                    rows.append(row)
                    break
                else:
                    field_chars.append(ch)
        # move past possible comma after row
        while i < n and values_sql[i] in " \n\t,":
            i += 1
    return rows


def _convert_field(raw: str) -> Any:
    raw = raw.strip()
    if raw.upper() == "NULL":
        return None
    return raw


# --------- Data containers ---------


@dataclass
class WPPost:
    id: int
    post_type: str
    post_parent: int
    post_title: str
    post_name: str
    post_content: str
    post_excerpt: str
    post_status: str
    guid: str
    post_mime_type: str = ""


# --------- Parsing the dump into useful structures ---------


def load_wp_data(dump_path: Path) -> Tuple[Dict[int, WPPost], Dict[int, Dict[str, List[str]]], Dict[int, Dict[str, str]], Dict[int, List[int]]]:
    """
    Returns:
      posts: id -> WPPost (only for product/product_variation/attachment)
      postmeta: post_id -> {meta_key: [values]}
      taxonomies: term_taxonomy_id -> {"taxonomy": str, "term_id": int}
      relationships: object_id -> [term_taxonomy_id,...]
    """
    target_tables = {
        "wp_posts",
        "wp_postmeta",
        "wp_terms",
        "wp_term_taxonomy",
        "wp_term_relationships",
    }
    posts: Dict[int, WPPost] = {}
    postmeta: Dict[int, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    terms: Dict[int, Dict[str, str]] = {}
    term_taxonomy: Dict[int, Dict[str, Any]] = {}
    relationships: Dict[int, List[int]] = defaultdict(list)

    for table, cols, values_sql in _stream_insert_statements(dump_path, target_tables):
        rows = _parse_values(values_sql)
        if table == "wp_posts":
            col_idx = {c: i for i, c in enumerate(cols)}
            for row in rows:
                try:
                    post_type = (row[col_idx.get("post_type")]).strip("'") if "post_type" in col_idx else ""
                except Exception:
                    continue
                if post_type not in {"product", "product_variation", "attachment"}:
                    continue
                pid = int(row[col_idx["ID"]])
                posts[pid] = WPPost(
                    id=pid,
                    post_type=post_type,
                    post_parent=int(row[col_idx.get("post_parent", 0)] or 0),
                    post_title=(row[col_idx.get("post_title", "")] or "").strip("'"),
                    post_name=(row[col_idx.get("post_name", "")] or "").strip("'"),
                    post_content=(row[col_idx.get("post_content", "")] or "").strip("'"),
                    post_excerpt=(row[col_idx.get("post_excerpt", "")] or "").strip("'"),
                    post_status=(row[col_idx.get("post_status", "")] or "").strip("'"),
                    guid=(row[col_idx.get("guid", "")] or "").strip("'"),
                    post_mime_type=(row[col_idx.get("post_mime_type", "")] or "").strip("'"),
                )
        elif table == "wp_postmeta":
            col_idx = {c: i for i, c in enumerate(cols)}
            for row in rows:
                pid = int(row[col_idx["post_id"]])
                key = (row[col_idx["meta_key"]] or "").strip("'")
                val = row[col_idx["meta_value"]]
                if isinstance(val, str) and val.startswith("'") and val.endswith("'"):
                    val = val[1:-1]
                postmeta[pid][key].append(val if val is not None else "")
        elif table == "wp_terms":
            col_idx = {c: i for i, c in enumerate(cols)}
            for row in rows:
                tid = int(row[col_idx["term_id"]])
                terms[tid] = {
                    "name": (row[col_idx["name"]] or "").strip("'"),
                    "slug": (row[col_idx["slug"]] or "").strip("'"),
                }
        elif table == "wp_term_taxonomy":
            col_idx = {c: i for i, c in enumerate(cols)}
            for row in rows:
                ttid = int(row[col_idx["term_taxonomy_id"]])
                term_taxonomy[ttid] = {
                    "term_id": int(row[col_idx["term_id"]]),
                    "taxonomy": (row[col_idx["taxonomy"]] or "").strip("'"),
                    "parent": int(row[col_idx.get("parent", 0)] or 0),
                }
        elif table == "wp_term_relationships":
            col_idx = {c: i for i, c in enumerate(cols)}
            for row in rows:
                obj = int(row[col_idx["object_id"]])
                ttid = int(row[col_idx["term_taxonomy_id"]])
                relationships[obj].append(ttid)

    # enrich term_taxonomy with names
    taxonomies: Dict[int, Dict[str, str]] = {}
    for ttid, data in term_taxonomy.items():
        term = terms.get(data["term_id"], {})
        taxonomies[ttid] = {
            "taxonomy": data["taxonomy"],
            "name": term.get("name", ""),
            "slug": term.get("slug", ""),
            "parent": str(data.get("parent", 0)),
        }

    return posts, postmeta, taxonomies, relationships


# --------- WP -> Product transformation helpers ---------


def _first(meta: Dict[str, List[str]], key: str) -> Optional[str]:
    vals = meta.get(key) or []
    return vals[0] if vals else None


def _decimal(value: Optional[str]) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _html_to_text(value: str) -> str:
    """
    Minimal HTML-to-text: handle common breaks, strip tags, unescape entities.
    """
    if not value:
        return ""
    text = value
    # list items to bullet lines
    text = re.sub(r"<li[^>]*>", "\n- ", text, flags=re.IGNORECASE)
    text = text.replace("</li>", "")
    # paragraph/line breaks
    text = re.sub(r"<br\\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<p[^>]*>", "", text, flags=re.IGNORECASE)
    # strip remaining tags
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    # normalize whitespace per line, preserve newlines
    lines = []
    for line in text.splitlines():
        cleaned = " ".join(line.split())
        if cleaned:
            lines.append(cleaned)
    return "\n".join(lines)


def _normalize_token(value: Optional[str]) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFD", value)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^\w]+", "", text, flags=re.UNICODE).lower()


def _is_stockish(value: Optional[str]) -> bool:
    if not value:
        return False
    norm = _normalize_token(value)
    if not norm:
        return False
    stock_tokens = {"stock", "stok", "στοκ", "στοκσ"}
    return any(tok in norm for tok in stock_tokens)


def _build_product_image_urls(meta: Dict[str, List[str]], attachments: Dict[int, WPPost]) -> List[str]:
    urls: List[str] = []
    thumb_id = _first(meta, "_thumbnail_id")
    if thumb_id and thumb_id.isdigit():
        att = attachments.get(int(thumb_id))
        if att and att.guid:
            urls.append(att.guid)
    gallery = _first(meta, "_product_image_gallery")
    if gallery:
        for gid in [g for g in gallery.split(",") if g.strip()]:
            if gid.isdigit():
                att = attachments.get(int(gid))
                if att and att.guid:
                    urls.append(att.guid)
    # deduplicate preserving order
    seen = set()
    deduped = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped


def _collect_terms(
    obj_id: int,
    relationships: Dict[int, List[int]],
    taxonomies: Dict[int, Dict[str, str]],
) -> Dict[str, List[Dict[str, str]]]:
    result: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for ttid in relationships.get(obj_id, []):
        tinfo = taxonomies.get(ttid)
        if not tinfo:
            continue
        parent_slug = ""
        if tinfo.get("parent"):
            parent_info = taxonomies.get(int(tinfo["parent"]))
            if parent_info:
                parent_slug = parent_info.get("slug", "")
        result[tinfo["taxonomy"]].append(
            {"name": tinfo["name"], "slug": tinfo["slug"], "parent_slug": parent_slug}
        )
    return result


def _build_variants(parent_id: int, posts: Dict[int, WPPost], postmeta: Dict[int, Dict[str, List[str]]], attachments: Dict[int, WPPost]) -> Tuple[List[Dict[str, Any]], int, Optional[Decimal], Optional[Decimal]]:
    variants: List[Dict[str, Any]] = []
    total_stock = 0
    min_price: Optional[Decimal] = None
    min_reg: Optional[Decimal] = None
    status_map = {
        "instock": "in_stock",
        "onbackorder": "preorder",
        "outofstock": "unavailable",
    }

    for vid, vpost in posts.items():
        if vpost.post_type != "product_variation" or vpost.post_parent != parent_id:
            continue
        meta = postmeta.get(vid, {})
        sku = _first(meta, "_sku") or f"{vpost.post_name or vpost.id}"
        ean = (
            _first(meta, "_ean")
            or _first(meta, "_barcode")
            or _first(meta, "_alg_ean")
        )
        price = _decimal(_first(meta, "_price"))
        reg = _decimal(_first(meta, "_regular_price"))
        sale = _decimal(_first(meta, "_sale_price"))
        # Woo's _price is already the "current" price (sale if present), but we still prefer sale explicitly
        use_price = sale if sale not in (None, Decimal("0")) else price or reg
        # discountPrice in our app = original/regular price (compare_at)
        compare = reg if reg and use_price and reg > use_price else None
        stock = int(float(_first(meta, "_stock") or 0))
        stock_status = status_map.get((_first(meta, "_stock_status") or "").lower())
        allow_backorder = (_first(meta, "_backorders") or "").lower() in {"yes", "notify"}
        total_stock += stock

        attr_pairs = {}
        for k, vals in meta.items():
            if k.startswith("attribute_"):
                val = vals[0] if vals else ""
                attr_pairs[k.replace("attribute_", "", 1)] = val

        images = _build_product_image_urls(meta, attachments)
        variants.append(
            {
                "sku": sku,
                "ean": ean,
                "price": float(use_price or 0),
                "discountPrice": float(compare) if compare else None,
                "compare_at": float(compare) if compare else None,
                "stock": stock,
                "allowBackorder": allow_backorder,
                "status": stock_status,
                "attributes": attr_pairs,
                "images": images,
            }
        )

        if use_price is not None:
            if min_price is None or use_price < min_price:
                min_price = use_price
        if reg is not None:
            if min_reg is None or reg < min_reg:
                min_reg = reg

    return variants, total_stock, min_price, min_reg


# --------- Main import routine ---------


def import_dump(dump_path: Path):
    posts, postmeta, taxonomies, relationships = load_wp_data(dump_path)

    # separate attachments for image lookup
    attachments = {pid: p for pid, p in posts.items() if p.post_type == "attachment"}

    session = SessionLocal()
    brand_cache: Dict[str, int] = {}
    category_cache: Dict[str, int] = {}

    def upsert_brand(name: Optional[str]) -> Optional[int]:
        if not name:
            return None
        slug = slugify(name)
        if slug in brand_cache:
            return brand_cache[slug]
        existing = session.query(Brand).filter(Brand.slug == slug).first()
        if existing:
            brand_cache[slug] = existing.id
            return existing.id
        brand = Brand(name=name, slug=slug)
        session.add(brand)
        session.commit()
        brand_cache[slug] = brand.id
        return brand.id

    def upsert_category(name: Optional[str], slug: Optional[str], parent_slug: Optional[str] = None) -> Optional[int]:
        if not name and not slug:
            return None
        slug_val = slugify(slug or name or "")
        if slug_val in category_cache:
            return category_cache[slug_val]

        parent_id = None
        if parent_slug:
            parent_slug_val = slugify(parent_slug)
            parent_existing = session.query(Category).filter(Category.slug == parent_slug_val).first()
            if parent_existing:
                category_cache[parent_slug_val] = parent_existing.id
                parent_id = parent_existing.id

        existing = session.query(Category).filter(Category.slug == slug_val).first()
        if existing:
            category_cache[slug_val] = existing.id
            return existing.id

        cat = Category(title=name or slug_val, slug=slug_val, parent_id=parent_id)
        session.add(cat)
        session.commit()
        category_cache[slug_val] = cat.id
        return cat.id

    def slugify(text: str) -> str:
        s = (text or "").strip().lower()
        # allow unicode letters/digits, collapse others to hyphen
        s = re.sub(r"[^\w]+", "-", s, flags=re.UNICODE)
        return s.strip("-") or "cat"

    def infer_category(product_cats: List[Dict[str, str]], lower_tags: List[str]) -> Tuple[Optional[str], Optional[str]]:
        """
        Prefer the first product_cat term: use its name/slug directly.
        Fallback to tag keywords if no category present.
        """
        # If any category explicitly mentions stock, prefer that so we can surface stock PLP buckets
        for c in product_cats:
            name = (c.get("name") or "").lower()
            slug = (c.get("slug") or "").lower()
            if _is_stockish(name) or _is_stockish(slug):
                return c.get("name") or "Stock", c.get("slug") or "stock"

        if product_cats:
            primary = product_cats[0]
            return primary.get("name"), primary.get("slug")

        # From tags if no product_cat
        if any(s in t for t in lower_tags for s in ["γυαλιά ηλίου", "γυαλια ηλιου", "γυαλιά-ηλίου"]):
            return "Γυαλιά Ηλίου", "gialia-iliou"
        if any(s in t for t in lower_tags for s in ["γυαλιά οράσεως", "γυαλια ορασεως", "οράσεως"]):
            return "Γυαλιά Οράσεως", "gialia-oraseos"
        if any(_is_stockish(t) for t in lower_tags):
            return "Stock", "stock"
        return None, None

    def infer_audience(product_cats: List[Dict[str, str]], lower_tags: List[str]) -> Optional[str]:
        # from categories
        for c in product_cats:
            n = (c.get("name") or "").lower()
            s = (c.get("slug") or "").lower()
            if "unisex" in n or "unisex" in s:
                return "unisex"
            if "ανδρ" in n or "ανδρ" in s or "andrika" in s:
                return "male"
            if "γυν" in n or "γυν" in s or "gynaikeia" in s:
                return "female"

        # from tags
        has_male = any("ανδρ" in t for t in lower_tags)
        has_female = any("γυν" in t for t in lower_tags)
        has_unisex = any("unisex" in t for t in lower_tags)
        if has_unisex or (has_male and has_female):
            return "unisex"
        if has_male and not has_female:
            return "male"
        if has_female and not has_male:
            return "female"
        return None

    imported = 0
    for pid, post in posts.items():
        if post.post_type != "product":
            continue

        meta = postmeta.get(pid, {})

        # Variations
        variants, variants_stock, min_var_price, min_var_reg = _build_variants(pid, posts, postmeta, attachments)

        reg = _decimal(_first(meta, "_regular_price"))
        sale = _decimal(_first(meta, "_sale_price"))
        base_price = _decimal(_first(meta, "_price"))
        price = base_price or sale or reg or min_var_price or Decimal("0")
        compare_at = None
        if sale and reg and sale < reg:
            compare_at = reg
            price = sale
        elif min_var_reg and compare_at is None and compare_at != price and min_var_reg > price:
            compare_at = min_var_reg

        stock = int(float(_first(meta, "_stock") or 0))
        if variants:
            stock = variants_stock if variants_stock else stock

        stock_status_map = {
            "instock": "in_stock",
            "onbackorder": "preorder",
            "outofstock": "unavailable",
        }
        base_stock_status = stock_status_map.get((_first(meta, "_stock_status") or "").lower())

        if variants:
            has_in_stock = any((v.get("stock") or 0) > 0 or v.get("status") == "in_stock" for v in variants)
            has_preorder = any(v.get("status") == "preorder" for v in variants)
            catalog_status = (
                "in_stock" if has_in_stock else
                "preorder" if has_preorder else
                "unavailable"
            )
        else:
            catalog_status = base_stock_status or "in_stock"

        status = "published" if post.post_status == "publish" else "draft"
        visible = status == "published"

        images = _build_product_image_urls(meta, attachments)
        terms = _collect_terms(pid, relationships, taxonomies)
        brand_label = None
        category_label = None
        category_slug = None
        category_parent_slug = None
        if "product_brand" in terms and terms["product_brand"]:
            brand_label = terms["product_brand"][0]["name"]
        elif "pwb-brand" in terms and terms["pwb-brand"]:
            brand_label = terms["pwb-brand"][0]["name"]
        tags = [t["name"] for t in terms.get("product_tag", [])]

        lower_tags = [t.lower() for t in tags]
        product_cats = terms.get("product_cat", [])
        category_label, category_slug = infer_category(product_cats, lower_tags)

        audience_hint = infer_audience(product_cats, lower_tags)

        attrs = {
            "brand_label": brand_label,
            "category_label": category_label,
            "category_value": category_slug,
            "tags": tags,
        }
        if audience_hint:
            attrs["audience"] = audience_hint
        if variants:
            attrs["variants"] = variants
        if catalog_status:
            attrs["catalog_status"] = catalog_status
        if _is_stockish(category_label) or _is_stockish(category_slug) or any(_is_stockish(t) for t in tags):
            attrs["is_stock"] = True
            attrs["stock_category"] = "stock"

        sku = _first(meta, "_sku") or (post.post_name or f"SKU-{pid}")
        slug = post.post_name or f"product-{pid}"
        title = post.post_title or slug
        # Prefer short description; fallback to full content
        raw_description = post.post_excerpt or post.post_content or ""
        description = _html_to_text(raw_description)

        brand_id = upsert_brand(brand_label)
        category_id = upsert_category(category_label, category_slug, category_parent_slug)

        product = ProductModel(
            sku=sku,
            ean=_first(meta, "_ean") or _first(meta, "_barcode") or _first(meta, "_alg_ean"),
            slug=slug,
            title_el=title,
            title_en=title,
            description=description,
            images=images,
            price=price or Decimal("0"),
            compare_at_price=compare_at,
            attributes=attrs,
            stock=stock,
            status=status,
            visible=visible,
            brand_id=brand_id,
            category_id=category_id,
        )
        session.add(product)
        imported += 1
        if imported % 500 == 0:
            session.commit()
            print(f"Imported {imported} products...")

    session.commit()
    session.close()
    print(f"Import complete. Products imported: {imported}")


def main():
    parser = argparse.ArgumentParser(description="Import WooCommerce dump into Postgres without MySQL restore.")
    parser.add_argument("dump_path", type=Path, help="Path to u554181877_qSob8.sql or .sql.gz")
    args = parser.parse_args()

    if not args.dump_path.exists():
        raise SystemExit(f"Dump file not found: {args.dump_path}")

    import_dump(args.dump_path)


if __name__ == "__main__":
    main()
