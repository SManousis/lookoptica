from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from app.db import SessionLocal
from app.models.product import Product

router = APIRouter(prefix="/api/products", tags=["products"])

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


@router.get("", response_model=List[ProductListItem])
def list_products(
    q: Optional[str] = Query(None),
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    try:
        stmt = select(Product).where(
            Product.visible.is_(True),
            Product.status.in_(ALLOWED_STATUSES),
        )
        if q:
            like = f"%{q.lower()}%"
            stmt = stmt.where(
                (Product.title_el.ilike(like)) | (Product.title_en.ilike(like))
            )
        stmt = stmt.order_by(Product.created_at.desc()).limit(limit).offset(offset)
        rows = db.execute(stmt).scalars().all()

        items: List[ProductListItem] = []
        for r in rows:
            attrs: Dict[str, Any] = r.attributes or {}

            brand = None
            category = None
            audience = None
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
                status = attrs.get("catalog_status")

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
                    brand=brand,
                    category=category,
                    audience=audience,
                    images=r.images or [],
                    status=status or r.status,
                )
            )

        return items

    except Exception as e:
        print("ERROR /api/products:", repr(e))
        raise HTTPException(status_code=500, detail="Internal error")

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
