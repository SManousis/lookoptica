import unicodedata
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, load_only
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.db import SessionLocal
from app.models.product import Product

router = APIRouter(prefix="/shop-products", tags=["shop-products"])

# Pydantic shapes
class Variant(BaseModel):
    sku: str | None = None
    ean: str | None = None
    color: str | None = None
    price: float | None = None
    discountPrice: float | None = None
    stock: int | None = None
    reorderLevel: int | None = None
    images: list[str] = Field(default_factory=list)
    attributes: dict = Field(default_factory=dict)
    status: str | None = None
    isDefault: bool = False

    class Config:
        extra = "ignore"


class ProductListItem(BaseModel):
    sku: str
    slug: str | None
    title: dict
    price: float
    discountPrice: float | None = None
    stock: int | None = None
    brand: Optional[str] = None        
    category: Optional[str] = None     
    audience: Optional[str] = None
    images: list[str] = []
    status: Optional[str] = None
    attributes: dict = Field(default_factory=dict)
    isStock: Optional[bool] = None


class CompactProductListItem(BaseModel):
    slug: str | None
    title: dict
    price: float
    discountPrice: float | None = None
    brand: Optional[str] = None
    category: Optional[str] = None
    images: list[str] = Field(default_factory=list)
    productType: Optional[str] = None


class ProductDetail(ProductListItem):
    ean: str | None
    images: list
    attributes: dict
    stock: int
    description: str | None = None
    variants: List[Variant] = Field(default_factory=list)
    reorderLevel: int | None = None
    status: str | None = None

# DB session dependency (correct pattern)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
ALLOWED_STATUSES = {"published", "in_stock", "preorder"}
SUNGLASSES_CATEGORY_ALIASES = [
    "sunglasses",
    "sun-glasses",
    "γυαλια ηλιου",
    "γυαλιά ηλίου",
]
FRAMES_CATEGORY_ALIASES = [
    "ophthalmic_frames",
    "frames",
    "σκελετοι ορασεως",
    "σκελετοί οράσεως",
    "γυαλια ορασεως",
]


def _normalize_category_string(value: Any) -> str:
    """
    Mirror the frontend normalization:
    - lowercase
    - strip diacritics
    - keep only letters/numbers
    """
    if value is None:
        return ""
    text = unicodedata.normalize("NFD", str(value)).lower()
    return "".join(ch for ch in text if ch.isalnum())


def _matches_category_alias(value: Any, aliases: List[str]) -> bool:
    normalized = _normalize_category_string(value)
    if not normalized:
        return False
    for alias in aliases:
        norm_alias = _normalize_category_string(alias)
        if not norm_alias:
            continue
        if (
            normalized == norm_alias
            or normalized.startswith(norm_alias)
            or normalized.endswith(norm_alias)
            or norm_alias in normalized
        ):
            return True
    return False


def _gather_category_candidates(
    *,
    cat_value: Optional[str],
    raw_categories: List[str],
    tags: List[str],
    slug: Optional[str],
    title_el: Optional[str],
    title_en: Optional[str],
    product_type: Optional[str],
) -> List[str]:
    # Include everything that can reasonably indicate a category.
    candidates: List[str] = []
    if cat_value:
        candidates.append(cat_value)
    candidates.extend(raw_categories)
    candidates.extend(tags)
    if product_type:
        candidates.append(product_type)
    if slug:
        candidates.append(slug)
    if title_el:
        candidates.append(title_el)
    if title_en:
        candidates.append(title_en)
    # Deduplicate while preserving order
    return list(dict.fromkeys([c for c in candidates if c]))


def _compact_product_item(product: Product) -> CompactProductListItem:
    attrs = product.attributes if isinstance(product.attributes, dict) else {}
    category = (
        attrs.get("category_label")
        or attrs.get("category")
        or attrs.get("category_value")
    )
    product_type = attrs.get("product_type")
    if not category and product_type == "contact_lens":
        category = "contact_lenses"

    return CompactProductListItem(
        slug=product.slug,
        title={"el": product.title_el, "en": product.title_en},
        price=float(product.price or 0),
        discountPrice=(
            float(product.compare_at_price)
            if product.compare_at_price is not None
            else None
        ),
        brand=attrs.get("brand_label") or attrs.get("brand"),
        category=category,
        images=(product.images or [])[:1],
        productType=product_type,
    )


def _category_candidates_for_product(product: Product) -> List[str]:
    attrs = product.attributes if isinstance(product.attributes, dict) else {}
    raw_categories = [
        value
        for key in ("category_label", "category", "category_value")
        if isinstance((value := attrs.get(key)), str)
    ]
    raw_tags = attrs.get("tags") or []
    tags = (
        [tag for tag in raw_tags if isinstance(tag, str)]
        if isinstance(raw_tags, list)
        else []
    )
    return _gather_category_candidates(
        cat_value=raw_categories[0] if raw_categories else None,
        raw_categories=raw_categories,
        tags=tags,
        slug=product.slug,
        title_el=product.title_el,
        title_en=product.title_en,
        product_type=attrs.get("product_type"),
    )


@router.get("", response_model=List[ProductListItem])
def list_products(
    q: Optional[str] = Query(None),
    category: Optional[List[str]] = Query(None),
    audience: Optional[List[str]] = Query(None),
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    try:
        # Normalize pagination params
        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        # Normalize filters coming from the PLP
        category_aliases = [c for c in (category or []) if c]
        audience_filters = [a for a in (audience or []) if a]

        base_stmt = select(Product).where(
            Product.visible.is_(True),
            Product.status.in_(ALLOWED_STATUSES),
        )
        if q:
            like = f"%{q.lower()}%"
            base_stmt = base_stmt.where(
                (Product.title_el.ilike(like))
                | (Product.title_en.ilike(like))
                | (Product.sku.ilike(like))
            )

        # Secondary tiebreaker (id) is required: many products share the exact
        # same created_at from the bulk import, and OFFSET pagination is only
        # stable/correct across repeated calls when the ORDER BY is fully
        # deterministic - otherwise Postgres can return tied rows in a
        # different order per query, silently skipping or duplicating rows
        # across pages (this was causing brand-filtered results on the PLP
        # to undercount).
        base_stmt = base_stmt.order_by(Product.created_at.desc(), Product.id.desc())

        # Apply filtering after fetch so pagination respects the filtered list.
        # Fetch in batches until we have enough matching products to satisfy offset+limit.
        batch_size = max(safe_limit, 50)
        matched: List[tuple[Product, Dict[str, Any]]] = []
        skipped = 0
        cursor = 0

        while len(matched) < safe_limit:
            batch_stmt = base_stmt.limit(batch_size).offset(cursor)
            batch_rows = db.execute(batch_stmt).scalars().all()
            if not batch_rows:
                break

            for r in batch_rows:
                attrs: Dict[str, Any] = r.attributes or {}

                brand = None
                cat_value = None
                aud_value = None
                status = None
                tags: List[str] = []

                raw_categories: List[str] = []
                is_stock_flag = False

                if isinstance(attrs, dict):
                    brand = attrs.get("brand_label") or attrs.get("brand")
                    for key in ("category_label", "category", "category_value"):
                        val = attrs.get(key)
                        if isinstance(val, str):
                            raw_categories.append(val)
                    cat_value = (
                        raw_categories[0]
                        if raw_categories
                        else None
                    )
                    aud_value = attrs.get("audience")
                    status = attrs.get("catalog_status")
                    raw_tags = attrs.get("tags") or []
                    if isinstance(raw_tags, list):
                        tags = [t for t in raw_tags if isinstance(t, str)]
                    for stock_key in ("is_stock", "isStock", "stock_category"):
                        val = attrs.get(stock_key)
                        if val is True or (isinstance(val, str) and _matches_category_alias(val, ["stock", "stok"])):
                            is_stock_flag = True
                    if attrs.get("stock") is True:
                        is_stock_flag = True

                if not cat_value and isinstance(attrs, dict):
                    if attrs.get("product_type") == "contact_lens":
                        cat_value = "contact_lenses"

                category_candidates = _gather_category_candidates(
                    cat_value=cat_value,
                    raw_categories=raw_categories,
                    tags=tags or [],
                    slug=r.slug,
                    title_el=r.title_el,
                    title_en=r.title_en,
                    product_type=attrs.get("product_type") if isinstance(attrs, dict) else None,
                )
                if is_stock_flag:
                    category_candidates.append("stock")

                if category_aliases:
                    if not any(
                        _matches_category_alias(val, category_aliases)
                        for val in category_candidates
                        if val is not None
                    ):
                        continue

                if audience_filters:
                    audience_candidates = []
                    if aud_value:
                        audience_candidates.append(str(aud_value))
                    raw_audiences = attrs.get("audiences") if isinstance(attrs, dict) else None
                    if isinstance(raw_audiences, list):
                        audience_candidates.extend(
                            str(v) for v in raw_audiences if v is not None
                        )
                    if not any(val in audience_filters for val in audience_candidates):
                        continue

                if skipped < safe_offset:
                    skipped += 1
                    continue

                matched.append(
                    (
                        r,
                        {
                            "brand": brand,
                            "category": cat_value,
                            "audience": aud_value,
                            "status": status,
                        },
                    )
                )

                if len(matched) >= safe_limit:
                    break

            cursor += len(batch_rows)
            if len(batch_rows) < batch_size:
                break

        items: List[ProductListItem] = []
        for r, meta in matched:
            attrs = r.attributes or {}
            # Heuristic: treat as stock if any category/tag/slug/title matches stock keywords
            stock_aliases = ["stock", "stok", "στοκ", "στοκσ"]
            is_stock = any(
                _matches_category_alias(val, stock_aliases)
                for val in _gather_category_candidates(
                    cat_value=meta.get("category"),
                    raw_categories=[],
                    tags=attrs.get("tags", []) if isinstance(attrs.get("tags"), list) else [],
                    slug=r.slug,
                    title_el=r.title_el,
                    title_en=r.title_en,
                    product_type=attrs.get("product_type") if isinstance(attrs, dict) else None,
                )
            )
            items.append(
                ProductListItem(
                    sku=r.sku,
                    slug=r.slug,
                    title={"el": r.title_el, "en": r.title_en},
                    price=float(r.price or 0),
                    discountPrice=float(r.compare_at_price)
                    if r.compare_at_price is not None
                    else None,
                    stock=int(r.stock or 0),
                    brand=meta.get("brand"),
                    category=meta.get("category"),
                    audience=meta.get("audience"),
                    images=r.images or [],
                    status=meta.get("status") or r.status,
                    attributes=attrs if isinstance(attrs, dict) else {},
                    isStock=is_stock or None,
                )
            )

        return items

    except Exception as e:
        print("ERROR /api/products:", repr(e))
        raise HTTPException(status_code=500, detail="Internal error")


@router.get("/featured", response_model=List[CompactProductListItem])
def featured_products(
    limit: int = Query(default=8, ge=1, le=12),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Product)
        .options(
            load_only(
                Product.slug,
                Product.title_el,
                Product.title_en,
                Product.price,
                Product.compare_at_price,
                Product.images,
                Product.attributes,
            )
        )
        .where(
            Product.visible.is_(True),
            Product.status.in_(ALLOWED_STATUSES),
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(limit)
    ).scalars().all()
    return [_compact_product_item(product) for product in rows]


@router.get("/offers", response_model=List[CompactProductListItem])
def homepage_offers(
    limit: int = Query(default=8, ge=1, le=12),
    max_price: float = Query(default=80, gt=0, le=10000),
    db: Session = Depends(get_db),
):
    """Return a small, balanced set of discounted sunglasses and frames."""
    base_stmt = (
        select(Product)
        .options(
            load_only(
                Product.slug,
                Product.title_el,
                Product.title_en,
                Product.price,
                Product.compare_at_price,
                Product.images,
                Product.attributes,
            )
        )
        .where(
            Product.visible.is_(True),
            Product.status.in_(ALLOWED_STATUSES),
            Product.price > 0,
            Product.price <= max_price,
            Product.compare_at_price.is_not(None),
            Product.compare_at_price > Product.price,
        )
        .order_by(Product.created_at.desc(), Product.id.desc())
    )

    target_per_category = (limit + 1) // 2
    sunglasses: List[Product] = []
    frames: List[Product] = []
    batch_size = 50
    cursor = 0

    while len(sunglasses) < target_per_category or len(frames) < target_per_category:
        rows = db.execute(base_stmt.limit(batch_size).offset(cursor)).scalars().all()
        if not rows:
            break

        for product in rows:
            candidates = _category_candidates_for_product(product)
            if (
                len(sunglasses) < limit
                and any(
                    _matches_category_alias(candidate, SUNGLASSES_CATEGORY_ALIASES)
                    for candidate in candidates
                )
            ):
                sunglasses.append(product)
            elif (
                len(frames) < limit
                and any(
                    _matches_category_alias(candidate, FRAMES_CATEGORY_ALIASES)
                    for candidate in candidates
                )
            ):
                frames.append(product)

        cursor += len(rows)
        if len(rows) < batch_size:
            break

    balanced: List[Product] = []
    for index in range(max(len(sunglasses), len(frames))):
        if index < len(sunglasses):
            balanced.append(sunglasses[index])
        if len(balanced) >= limit:
            break
        if index < len(frames):
            balanced.append(frames[index])
        if len(balanced) >= limit:
            break

    return [_compact_product_item(product) for product in balanced]


@router.get("/{slug}", response_model=ProductDetail)
def get_product(slug: str, db: Session = Depends(get_db)):
    r = db.execute(
        select(Product).where(Product.slug == slug, Product.visible == True)
    ).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    attrs: Dict[str, Any] = r.attributes or {}
    brand = None
    category = None
    audience = None
    variants_raw: List[Dict[str, Any]] = []
    reorder_level = None
    status = None

    if isinstance(attrs, dict):
        brand = attrs.get("brand_label") or attrs.get("brand")
        category = (
            attrs.get("category_label")
            or attrs.get("category")
            or attrs.get("category_value")
        )
        audience = attrs.get("audience")
        if not category and attrs.get("product_type") == "contact_lens":
            category = "contact_lenses"
        variants_raw = attrs.get("variants", []) or []
        reorder_level = attrs.get("reorderLevel")
        status = attrs.get("catalog_status")

    variants: List[Variant] = []
    for v in variants_raw:
        if not isinstance(v, dict):
            continue
        attrs_dict = v.get("attributes") if isinstance(v.get("attributes"), dict) else {}
        color = v.get("color") or v.get("colour")
        if not color and attrs_dict:
            color = (
                attrs_dict.get("pa_color")
                or attrs_dict.get("color")
                or attrs_dict.get("colour")
            )

        payload = dict(v)
        if color:
            payload["color"] = color
        if attrs_dict:
            payload["attributes"] = attrs_dict

        variants.append(Variant(**payload))
    status = status or r.status

    return ProductDetail(
        sku=r.sku,
        slug=r.slug,
        title={"el": r.title_el, "en": r.title_en},
        price=float(r.price or 0),
        discountPrice=float(r.compare_at_price)
        if r.compare_at_price is not None
        else None,
        ean=r.ean,
        images=r.images or [],
        attributes=attrs,
        stock=r.stock or 0,
        brand=brand,
        category=category,
        audience=audience,
        description=r.description,
        variants=variants,
        reorderLevel=reorder_level,
        status=status,
    )
