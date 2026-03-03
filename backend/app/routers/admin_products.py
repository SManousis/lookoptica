from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.deps.admin_auth import get_current_admin_user, get_db
from app.models.product import Product as ProductModel
from app.models.user import User
from app.schemas.product import ProductUpsert
from app.services.audit import log_admin_action

router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
)

UPLOAD_PUBLIC_PREFIX = "/uploads/images/"
ALLOWED_CATALOG_STATUSES = {
    "draft",
    "published",
    "archived",
    "in_stock",
    "preorder",
    "unavailable",
}


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


def _normalize_catalog_status(raw_status: str | None) -> str:
    status = (raw_status or "").strip().lower()
    return status if status in ALLOWED_CATALOG_STATUSES else "published"


def _upsert_attributes(existing: dict | None, payload: ProductUpsert) -> dict:
    attrs = dict(existing or {})
    attrs.update(payload.attributes or {})

    if payload.brand:
        attrs["brand_label"] = payload.brand
    if payload.category:
        attrs["category_label"] = payload.category
        attrs["category"] = payload.category
    if payload.audience:
        attrs["audience"] = payload.audience

    if payload.status:
        attrs["catalog_status"] = _normalize_catalog_status(payload.status)

    return attrs


def _serialize_admin_product(product: ProductModel) -> dict[str, Any]:
    attrs = product.attributes or {}
    variants = attrs.get("variants", []) if isinstance(attrs, dict) else []
    status = attrs.get("catalog_status", product.status) if isinstance(attrs, dict) else product.status
    return {
        "slug": product.slug,
        "brand": attrs.get("brand_label") if isinstance(attrs, dict) else None,
        "category": attrs.get("category_label") if isinstance(attrs, dict) else None,
        "audience": attrs.get("audience") if isinstance(attrs, dict) else None,
        "price": float(product.price) if product.price is not None else None,
        "discountPrice": float(product.compare_at_price) if product.compare_at_price is not None else None,
        "sku": product.sku,
        "ean": product.ean,
        "title": {"el": product.title_el, "en": product.title_en},
        "description": product.description,
        "images": product.images or [],
        "attributes": {
            k: v
            for k, v in (attrs.items() if isinstance(attrs, dict) else [])
            if k
            not in {
                "variants",
                "brand_label",
                "category_label",
                "category",
                "audience",
                "reorderLevel",
                "catalog_status",
                "previous_catalog_status",
            }
        },
        "stock": product.stock,
        "reorderLevel": attrs.get("reorderLevel") if isinstance(attrs, dict) else None,
        "variants": [v for v in variants if isinstance(v, dict)],
        "status": status,
        "deleted_at": product.deleted_at.isoformat() if product.deleted_at else None,
    }


def _extract_public_image_path(raw_path: str | None) -> str | None:
    if not raw_path or not isinstance(raw_path, str):
        return None
    parsed_path = urlparse(raw_path.strip()).path or raw_path.strip()
    idx = parsed_path.find(UPLOAD_PUBLIC_PREFIX)
    if idx < 0:
        return None

    candidate = parsed_path[idx:]
    normalized_parts = [p for p in candidate.split("/") if p and p not in {".", ".."}]
    normalized = "/" + "/".join(normalized_parts)
    if not normalized.startswith(UPLOAD_PUBLIC_PREFIX):
        return None
    if normalized == UPLOAD_PUBLIC_PREFIX.rstrip("/"):
        return None
    return normalized


def _collect_product_image_paths(product: ProductModel) -> set[str]:
    refs: set[str] = set()

    for img in product.images or []:
        normalized = _extract_public_image_path(img if isinstance(img, str) else None)
        if normalized:
            refs.add(normalized)

    attrs = product.attributes or {}
    if not isinstance(attrs, dict):
        return refs

    variants = attrs.get("variants", [])
    if not isinstance(variants, list):
        return refs

    for variant in variants:
        if not isinstance(variant, dict):
            continue
        var_images = variant.get("images")
        if isinstance(var_images, list):
            for img in var_images:
                normalized = _extract_public_image_path(img if isinstance(img, str) else None)
                if normalized:
                    refs.add(normalized)

        for key in ("image", "imageUrl"):
            normalized = _extract_public_image_path(variant.get(key))
            if normalized:
                refs.add(normalized)

    return refs


def _collect_image_paths_in_other_products(db: Session, excluded_product_id: int) -> set[str]:
    refs: set[str] = set()
    rows = db.query(ProductModel).filter(ProductModel.id != excluded_product_id).all()
    for row in rows:
        refs.update(_collect_product_image_paths(row))
    return refs


def _resolve_target_path(public_path: str) -> Path | None:
    base_dir = Path(settings.product_image_dir).expanduser().resolve()
    relative = public_path[len(UPLOAD_PUBLIC_PREFIX) :].lstrip("/")
    if not relative:
        return None
    target = (base_dir / relative).resolve()
    try:
        target.relative_to(base_dir)
    except ValueError:
        return None
    return target


def _archive_product(product: ProductModel) -> None:
    attrs = dict(product.attributes or {})
    current_catalog_status = _normalize_catalog_status(attrs.get("catalog_status") or product.status)
    if current_catalog_status == "archived":
        current_catalog_status = _normalize_catalog_status(attrs.get("previous_catalog_status") or product.status)
    if current_catalog_status != "archived":
        attrs["previous_catalog_status"] = current_catalog_status
    attrs["catalog_status"] = "archived"

    product.attributes = attrs
    product.status = "archived"
    product.visible = False
    product.deleted_at = datetime.utcnow()


@router.post("/sync")
async def upsert_product(
    payload: ProductUpsert,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Upsert a product row directly in Postgres so quick edits from the admin table persist.
    """
    product = db.query(ProductModel).filter(ProductModel.sku == payload.sku).first()

    created = False
    if not product:
        created = True
        slug = payload.slug or (payload.sku or "").lower().replace(" ", "-")
        title_el = payload.title.el or payload.title.en or slug or payload.sku
        title_en = payload.title.en or payload.title.el or slug or payload.sku

        product = ProductModel(
            sku=payload.sku,
            slug=slug,
            title_el=title_el,
            title_en=title_en,
            visible=True,
        )

    if payload.slug:
        product.slug = payload.slug

    product.ean = payload.ean
    product.title_el = payload.title.el or product.title_el
    product.title_en = payload.title.en or product.title_en
    product.price = _to_decimal(payload.price)
    product.compare_at_price = _to_decimal(payload.compare_at_price) if payload.compare_at_price is not None else None
    product.stock = payload.stock

    attrs = _upsert_attributes(product.attributes, payload)
    next_status = _normalize_catalog_status(payload.status)
    attrs["catalog_status"] = next_status

    if next_status == "archived":
        product.attributes = attrs
        _archive_product(product)
    else:
        attrs.pop("previous_catalog_status", None)
        product.attributes = attrs
        product.status = next_status
        product.visible = True
        product.deleted_at = None

    product.version = payload.version

    db.add(product)
    db.commit()
    db.refresh(product)

    action = "product_create" if created else "product_update"
    log_admin_action(
        db=db,
        admin=current_admin,
        action=action,
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "slug": product.slug,
            "status": product.status,
            "version": product.version,
            "idempotency_key": idempotency_key,
            "created": created,
        },
        request=request,
    )
    return {
        "shop_product_id": product.id,
        "status": (product.attributes or {}).get("catalog_status", product.status),
        "version": product.version,
        "idempotency_key": idempotency_key,
        "created": created,
    }


@router.get("/deleted")
async def list_deleted_products(
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Return archived (soft-deleted) products for recycle-bin management.
    """
    query = db.query(ProductModel).filter(
        or_(
            ProductModel.deleted_at.isnot(None),
            ProductModel.status == "archived",
        )
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                ProductModel.sku.ilike(like),
                ProductModel.slug.ilike(like),
                ProductModel.title_el.ilike(like),
                ProductModel.title_en.ilike(like),
            )
        )

    rows = query.order_by(ProductModel.deleted_at.desc(), ProductModel.updated_at.desc()).offset(offset).limit(limit).all()
    return [_serialize_admin_product(row) for row in rows]


@router.post("/{sku}/restore")
async def restore_product(
    sku: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Restore a soft-deleted product back to active catalog state.
    """
    product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.deleted_at is None and product.status != "archived":
        raise HTTPException(status_code=400, detail="Product is not archived")

    attrs = dict(product.attributes or {})
    restored_status = _normalize_catalog_status(
        attrs.get("previous_catalog_status") or attrs.get("catalog_status") or "published"
    )
    if restored_status == "archived":
        restored_status = "published"

    attrs["catalog_status"] = restored_status
    attrs.pop("previous_catalog_status", None)

    product.attributes = attrs
    product.status = restored_status
    product.visible = True
    product.deleted_at = None

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="product_restore",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "slug": product.slug,
            "restored_status": restored_status,
        },
        request=request,
    )
    return {"ok": True, "sku": sku, "status": restored_status}


@router.delete("/{sku}")
async def delete_product_permanently(
    sku: str,
    request: Request,
    delete_images: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Permanently delete a product row. Optionally remove product image files
    that are not referenced by other products.
    """
    product = db.query(ProductModel).filter(ProductModel.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product_id = product.id
    product_slug = product.slug
    product_image_paths = _collect_product_image_paths(product)
    referenced_by_others = (
        _collect_image_paths_in_other_products(db, excluded_product_id=product_id) if delete_images else set()
    )
    removable_public_paths = sorted(product_image_paths - referenced_by_others) if delete_images else []

    db.delete(product)
    db.commit()

    deleted_files: list[str] = []
    missing_files: list[str] = []
    failed_files: list[str] = []

    for public_path in removable_public_paths:
        target = _resolve_target_path(public_path)
        if not target:
            failed_files.append(public_path)
            continue
        if not target.exists():
            missing_files.append(public_path)
            continue
        try:
            target.unlink()
            deleted_files.append(public_path)
        except OSError:
            failed_files.append(public_path)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="product_delete_permanent",
        resource_type="product",
        resource_id=product_id,
        metadata={
            "sku": sku,
            "slug": product_slug,
            "delete_images": delete_images,
            "image_refs_found": len(product_image_paths),
            "image_files_deleted": len(deleted_files),
            "image_files_missing": len(missing_files),
            "image_files_failed": len(failed_files),
        },
        request=request,
    )

    return {
        "ok": True,
        "sku": sku,
        "deleted_images": deleted_files,
        "missing_images": missing_files,
        "failed_images": failed_files,
        "skipped_shared_images": sorted(product_image_paths & referenced_by_others),
    }


@router.get("/{sku}")
async def get_product_admin(
    sku: str,
    current_admin: User = Depends(get_current_admin_user),
):
    """
    TODO: fetch from DB by SKU.
    For now just return dummy so FastAPI docs work.
    """
    if sku == "test":
        return {
            "sku": "test",
            "ean": "1234567890123",
            "title": {"el": "Ξ”ΞµΞ―Ξ³ΞΌΞ±", "en": "Sample"},
            "slug": "sample-product",
            "brand": "DemoBrand",
            "category": "ophthalmic_frames",
            "audience": "male",
            "price": 99.0,
            "compare_at_price": 129.0,
            "stock": 4,
            "status": "published",
            "attributes": {"color": "Black"},
            "version": 1,
        }
    raise HTTPException(status_code=404, detail="Not found")


@router.post("/{sku}/unpublish")
async def unpublish_product(
    sku: str,
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Mark product as archived/hidden so it no longer shows up in PLP/PDP.
    """
    product = db.query(ProductModel).filter(ProductModel.sku == sku).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    _archive_product(product)

    db.add(product)
    db.commit()
    db.refresh(product)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="product_unpublish",
        resource_type="product",
        resource_id=product.id,
        metadata={
            "sku": product.sku,
            "slug": product.slug,
            "status": product.status,
        },
        request=request,
    )

    return {"ok": True, "sku": sku, "status": "archived"}
