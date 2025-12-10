from datetime import datetime
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.schemas.product import ProductUpsert
from app.deps.admin_auth import get_current_admin_user, get_db
from app.models.product import Product as ProductModel
from app.models.user import User
from app.services.audit import log_admin_action 

router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
)



def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0")


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
        attrs["catalog_status"] = payload.status

    return attrs

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
    product = (
        db.query(ProductModel).filter(ProductModel.sku == payload.sku).first()
    )

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
    product.compare_at_price = (
        _to_decimal(payload.compare_at_price)
        if payload.compare_at_price is not None
        else None
    )
    product.stock = payload.stock

    attrs = _upsert_attributes(product.attributes, payload)
    product.attributes = attrs

    catalog_status = (payload.status or "").lower()
    if catalog_status in {"draft", "published", "archived"}:
        product.status = catalog_status
    else:
        product.status = "published"

    if product.status == "archived":
        product.visible = False
        product.deleted_at = datetime.utcnow()
    else:
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
        "status": attrs.get("catalog_status", product.status),
        "version": product.version,
        "idempotency_key": idempotency_key,
        "created": created,
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
            "title": {"el": "Δείγμα", "en": "Sample"},
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
    product = (
        db.query(ProductModel).filter(ProductModel.sku == sku).first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.status = "archived"
    product.visible = False
    product.deleted_at = datetime.utcnow()

    attrs = dict(product.attributes or {})
    attrs["catalog_status"] = "archived"
    product.attributes = attrs

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
