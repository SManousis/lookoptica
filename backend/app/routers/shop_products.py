from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db import SessionLocal
from app.models.product import Product as ProductModel

router = APIRouter(
    prefix="/api/products",
    tags=["shop-products"],
)


class Title(BaseModel):
    el: Optional[str] = None
    en: Optional[str] = None


class Variant(BaseModel):
    color: str
    sku: Optional[str] = None
    ean: Optional[str] = None
    price: Optional[float] = None
    discountPrice: Optional[float] = None
    stock: Optional[int] = None
    reorderLevel: Optional[int] = None
    allowBackorder: Optional[bool] = False
    images: List[str] = Field(default_factory=list)   # main image(s) for this color
    isDefault: bool = False
    status: Optional[str] = None

class Product(BaseModel):
    slug: str
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    discountPrice: Optional[float] = None
    sku: Optional[str] = None
    ean: Optional[str] = None
    title: Title
    description: Optional[str] = None
    images: List[str] = Field(default_factory=list)      # generic images / fallback
    attributes: Dict[str, Any] = Field(default_factory=dict)
    stock: Optional[int] = None          # optional overall stock
    reorderLevel: Optional[int] = None   # optional overall reorder point
    variants: List[Variant] = Field(default_factory=list)
    status: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _variant_dump(variants: List[Variant]) -> List[Dict[str, Any]]:
    return [v.model_dump() for v in variants]


def _to_product_schema(row: ProductModel) -> Product:
    attrs = row.attributes or {}
    variants = attrs.get("variants", []) if isinstance(attrs, dict) else []
    return Product(
        slug=row.slug,
        brand=attrs.get("brand_label"),
        category=attrs.get("category_label"),
        price=float(row.price) if row.price is not None else None,
        discountPrice=float(row.compare_at_price) if row.compare_at_price is not None else None,
        sku=row.sku,
        ean=row.ean,
        title=Title(el=row.title_el, en=row.title_en),
        description=row.description,
        images=row.images or [],
        attributes={k: v for k, v in attrs.items() if k not in {"variants", "brand_label", "category_label", "reorderLevel", "catalog_status"}},
        stock=row.stock,
        reorderLevel=attrs.get("reorderLevel"),
        variants=[Variant(**v) for v in variants if isinstance(v, dict)],
        status=attrs.get("catalog_status", row.status),
    )


def _ensure_price(value: Optional[float]) -> Decimal:
    try:
        return Decimal(str(value)) if value is not None else Decimal("0")
    except Exception:
        return Decimal("0")


def _ensure_sku(prod: Product) -> str:
    if prod.sku:
        return prod.sku
    base = prod.slug or "sku"
    return base.upper().replace("-", "_")


@router.get("")
async def list_products(db: Session = Depends(get_db)):
    """
    Return all products as a simple list backed by Postgres.
    """
    rows = db.execute(select(ProductModel).order_by(ProductModel.created_at.desc())).scalars().all()
    return [_to_product_schema(r) for r in rows]


@router.post("", status_code=201)
async def create_product(prod: Product, db: Session = Depends(get_db)):
    """
    Create a product for testing against the real DB so that PLP/PDP can see it.
    """
    existing = db.execute(select(ProductModel).where(ProductModel.slug == prod.slug)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    attrs = dict(prod.attributes or {})
    attrs["variants"] = _variant_dump(prod.variants)
    if prod.brand:
        attrs["brand_label"] = prod.brand
    if prod.category:
        attrs["category_label"] = prod.category
        attrs["category"] = prod.category  
    if prod.reorderLevel is not None:
        attrs["reorderLevel"] = prod.reorderLevel
    if prod.status:
        attrs["catalog_status"] = prod.status

    price = _ensure_price(prod.price if prod.price is not None else prod.discountPrice)
    compare_at = _ensure_price(prod.discountPrice) if prod.discountPrice is not None else None
    stock = prod.stock
    if stock is None and prod.variants:
        stock = sum(filter(None, (v.stock for v in prod.variants)))
    if stock is None:
        stock = 0

    title_el = prod.title.el or prod.title.en or prod.slug
    title_en = prod.title.en or prod.title.el or prod.slug

    catalog_status = (prod.status or "").lower()
    db_status = "published" if catalog_status not in {"draft", "published"} else catalog_status

    db_product = ProductModel(
        sku=_ensure_sku(prod),
        ean=prod.ean,
        slug=prod.slug,
        title_el=title_el,
        title_en=title_en,
        description=prod.description,
        images=prod.images,
        price=price,
        compare_at_price=compare_at,
        attributes=attrs,
        stock=stock,
        status=db_status,
        visible=True,
    )

    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return _to_product_schema(db_product)


@router.get("/{slug}")
async def get_product(slug: str, db: Session = Depends(get_db)):
    """
    Fetch a single product by slug from Postgres.
    """
    product = db.execute(select(ProductModel).where(ProductModel.slug == slug)).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
    return _to_product_schema(product)
