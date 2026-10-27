"""OptiAEye ERP catalogue import: dry-run preview and confirmed write.

See website-erp-import-instructions.md (repo root) for the full spec this
implements. `compute_sync_plan` is the single source of truth for what a
batch would do - both the dry-run preview and the confirmed write call it
and act on the exact same decisions, so a confirm can never apply something
different from what the admin previewed.
"""

import math
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product as ProductModel
from app.schemas.erp_sync import (
    AUDIENCE_MAP,
    BRAND_ALIASES,
    CATEGORY_MAP,
    CATEGORY_PHRASES,
    ErpExportFile,
    ErpItem,
    MATERIAL_PHRASES,
)
from app.utils.gtin import validate_gtin
from app.utils.slugify import slugify


@dataclass
class VariantDecision:
    kind: str  # "create_variant" | "update_variant"
    sku: str
    ean: str | None
    price: float
    discount_price: float  # the ERP's raw retail_price, shown as the struck-through "was" price
    stock: int
    color: str
    changed: bool = False  # only meaningful for "update_variant"


@dataclass
class ProductDecision:
    kind: str  # "create_product" | "merge_product"
    slug: str
    existing_id: int | None
    code: str = ""
    brand: str = ""
    title_el: str = ""
    title_en: str = ""
    category_value: str | None = None
    audience_value: str | None = None
    attributes: dict[str, Any] = field(default_factory=dict)
    description: str | None = None
    variant_decisions: list[VariantDecision] = field(default_factory=list)


@dataclass
class SyncPlan:
    product_decisions: list[ProductDecision]
    warnings: list[str]
    new_products: int
    new_variants_on_existing: int
    updated_variants: int
    skipped_zero_stock_rows: int


# retail_price from the ERP is the starting/list price, not what's actually
# charged - the shop's standing rule is 30% off that number.
RETAIL_PRICE_DISCOUNT = 0.30


def _final_price(retail_price: float) -> float:
    # Rounded up to a whole number - no cents.
    return float(math.ceil(float(retail_price) * (1 - RETAIL_PRICE_DISCOUNT)))


def _resolve_ean(row: ErpItem, warnings: list[str]) -> str | None:
    if not row.ean:
        return None
    validated = validate_gtin(row.ean)
    if validated is None:
        warnings.append(
            f"Invalid EAN '{row.ean}' for code '{row.code}' colour '{row.colour}' (barcode {row.barcode}) - left unset."
        )
    return validated


def _build_description(category: str, material: str, shape: str) -> str:
    category_phrase = CATEGORY_PHRASES.get(category, "")
    material_phrase = MATERIAL_PHRASES.get(material) if material else None
    line1 = f"{material_phrase} {category_phrase}".strip() if material_phrase else category_phrase

    lines = [line1, ""]
    if shape:
        lines.append(f"Σχήμα {shape}")
    return "\n".join(lines)


def compute_sync_plan(db: Session, file: ErpExportFile) -> SyncPlan:
    warnings: list[str] = []
    groups: dict[tuple[str, str], list[ErpItem]] = {}
    group_order: list[tuple[str, str]] = []

    for item in file.items:
        brand = BRAND_ALIASES.get(item.brand, item.brand)
        if not brand.strip():
            warnings.append(
                f"Empty brand for code '{item.code}' (colour '{item.colour}') - proceeding with empty brand value."
            )
        if item.category not in CATEGORY_MAP:
            warnings.append(
                f"Unmapped category '{item.category}' for code '{item.code}' - category left unset."
            )
        if item.stype and item.stype not in AUDIENCE_MAP:
            warnings.append(
                f"Unmapped stype '{item.stype}' for code '{item.code}' - audience left unset."
            )

        key = (brand, item.code)
        if key not in groups:
            groups[key] = []
            group_order.append(key)
        groups[key].append(item)

    product_decisions: list[ProductDecision] = []
    new_products = 0
    new_variants_on_existing = 0
    updated_variants = 0
    skipped_zero_stock_rows = 0

    for key in group_order:
        brand, code = key
        rows = groups[key]
        slug = slugify(f"{brand}-{code}")
        existing = db.execute(
            select(ProductModel).where(ProductModel.slug == slug)
        ).scalar_one_or_none()

        if existing is None:
            nonzero_rows = [r for r in rows if r.stock != 0]
            skipped_zero_stock_rows += len(rows) - len(nonzero_rows)
            if not nonzero_rows:
                warnings.append(
                    f"Skipped new product '{slug}': every row has stock=0."
                )
                continue

            first = nonzero_rows[0]
            name = first.name.strip()
            title = f"{brand} {name}" if name else f"{brand} {code}"

            variant_decisions = [
                VariantDecision(
                    kind="create_variant",
                    sku=str(row.barcode),
                    ean=_resolve_ean(row, warnings),
                    price=_final_price(row.retail_price),
                    discount_price=float(row.retail_price),
                    stock=row.stock,
                    color=row.colour,
                )
                for row in nonzero_rows
            ]

            product_decisions.append(
                ProductDecision(
                    kind="create_product",
                    slug=slug,
                    existing_id=None,
                    code=code,
                    brand=brand,
                    title_el=title,
                    title_en=title,
                    category_value=CATEGORY_MAP.get(first.category),
                    audience_value=AUDIENCE_MAP.get(first.stype) if first.stype else None,
                    attributes={
                        "eyeSize": first.boxsize,
                        "bridgeSize": first.bridge,
                        "templeLength": first.side,
                        "material": first.material,
                        "shape": first.shape,
                        "style": first.style,
                    },
                    description=_build_description(first.category, first.material, first.shape),
                    variant_decisions=variant_decisions,
                )
            )
            new_products += 1
            continue

        existing_attrs = existing.attributes or {}
        existing_variants = existing_attrs.get("variants", []) if isinstance(existing_attrs, dict) else []
        existing_by_sku = {v.get("sku"): v for v in existing_variants if isinstance(v, dict)}

        variant_decisions = []
        for row in rows:
            sku = str(row.barcode)
            match = existing_by_sku.get(sku)
            ean = _resolve_ean(row, warnings)

            if match is None:
                if row.stock == 0:
                    skipped_zero_stock_rows += 1
                    continue
                variant_decisions.append(
                    VariantDecision(
                        kind="create_variant",
                        sku=sku,
                        ean=ean,
                        price=_final_price(row.retail_price),
                        discount_price=float(row.retail_price),
                        stock=row.stock,
                        color=row.colour,
                    )
                )
                new_variants_on_existing += 1
            else:
                price = _final_price(row.retail_price)
                discount_price = float(row.retail_price)
                stock = row.stock
                changed = (
                    match.get("price") != price
                    or match.get("discountPrice") != discount_price
                    or match.get("stock") != stock
                    or match.get("ean") != ean
                )
                if changed:
                    updated_variants += 1
                variant_decisions.append(
                    VariantDecision(
                        kind="update_variant",
                        sku=sku,
                        ean=ean,
                        price=price,
                        discount_price=discount_price,
                        stock=stock,
                        color=match.get("color") or row.colour,
                        changed=changed,
                    )
                )

        if not variant_decisions:
            continue

        product_decisions.append(
            ProductDecision(
                kind="merge_product",
                slug=slug,
                existing_id=existing.id,
                variant_decisions=variant_decisions,
            )
        )

    return SyncPlan(
        product_decisions=product_decisions,
        warnings=warnings,
        new_products=new_products,
        new_variants_on_existing=new_variants_on_existing,
        updated_variants=updated_variants,
        skipped_zero_stock_rows=skipped_zero_stock_rows,
    )


def summarize_plan(plan: SyncPlan) -> dict[str, Any]:
    return {
        "counts": {
            "new_products": plan.new_products,
            "new_variants_on_existing_products": plan.new_variants_on_existing,
            "updated_variants": plan.updated_variants,
            "skipped_zero_stock_rows": plan.skipped_zero_stock_rows,
        },
        "warnings": plan.warnings,
    }


def _variant_dict(vd: VariantDecision, is_default: bool) -> dict[str, Any]:
    return {
        "color": vd.color,
        "sku": vd.sku,
        "ean": vd.ean,
        "price": vd.price,
        "discountPrice": vd.discount_price,
        "stock": vd.stock,
        "isDefault": is_default,
        "status": "in_stock",
    }


def apply_sync_plan(db: Session, plan: SyncPlan) -> None:
    """Write every decision in `plan` to Postgres. Never call this from a
    dry-run path - it is the only function in this module allowed to call
    db.add()."""
    for pd in plan.product_decisions:
        if pd.kind == "create_product":
            variants_json = [
                _variant_dict(vd, is_default=(i == 0))
                for i, vd in enumerate(pd.variant_decisions)
            ]
            attrs: dict[str, Any] = {
                "brand_label": pd.brand,
                "eyeSize": pd.attributes.get("eyeSize"),
                "bridgeSize": pd.attributes.get("bridgeSize"),
                "templeLength": pd.attributes.get("templeLength"),
                "material": pd.attributes.get("material"),
                "shape": pd.attributes.get("shape"),
                "style": pd.attributes.get("style"),
            }
            if pd.category_value:
                attrs["category_label"] = pd.category_value
                attrs["category"] = pd.category_value
            if pd.audience_value:
                attrs["audience"] = pd.audience_value
            attrs = {k: v for k, v in attrs.items() if v is not None}
            attrs["variants"] = variants_json
            attrs["catalog_status"] = "published"

            default_price = variants_json[0]["price"]
            default_discount_price = variants_json[0]["discountPrice"]
            total_stock = sum(v["stock"] for v in variants_json)

            product = ProductModel(
                # Base-product sku = the default (first) variant's barcode,
                # not the ERP `code` - barcodes are globally unique per
                # physical item, `code` is only unique within a brand.
                sku=variants_json[0]["sku"],
                ean=None,
                slug=pd.slug,
                title_el=pd.title_el,
                title_en=pd.title_en,
                description=pd.description,
                images=[],
                price=Decimal(str(default_price)),
                compare_at_price=Decimal(str(default_discount_price)),
                attributes=attrs,
                stock=total_stock,
                status="published",
                visible=True,
            )
            db.add(product)
        else:  # merge_product
            product = db.get(ProductModel, pd.existing_id)
            if product is None:
                continue
            attrs = dict(product.attributes or {})
            # Fresh dict per existing variant - never mutate the dicts
            # currently referenced by product.attributes in place. SQLAlchemy
            # detects a JSON column as "changed" by comparing the old and new
            # values; mutating the old value's own nested dicts makes the two
            # compare equal by the time that check runs, so the UPDATE for
            # this column gets silently skipped and the edit never persists.
            variants = [dict(v) if isinstance(v, dict) else v for v in attrs.get("variants", [])]
            by_sku = {v.get("sku"): v for v in variants if isinstance(v, dict)}

            for vd in pd.variant_decisions:
                if vd.kind == "create_variant":
                    variants.append(_variant_dict(vd, is_default=False))
                elif vd.changed:
                    match = by_sku.get(vd.sku)
                    if match is not None:
                        match["price"] = vd.price
                        match["discountPrice"] = vd.discount_price
                        match["stock"] = vd.stock
                        match["ean"] = vd.ean

            attrs["variants"] = variants
            product.attributes = attrs
            product.stock = sum(
                (v.get("stock") or 0) for v in variants if isinstance(v, dict)
            )

            default_variant = next(
                (v for v in variants if isinstance(v, dict) and v.get("isDefault")),
                variants[0] if variants else None,
            )
            if default_variant and default_variant.get("price") is not None:
                product.price = Decimal(str(default_variant["price"]))
            if default_variant and default_variant.get("discountPrice") is not None:
                product.compare_at_price = Decimal(str(default_variant["discountPrice"]))

            db.add(product)

