from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.db import SessionLocal
from app.models.product import Product

router = APIRouter(prefix="/api/products", tags=["products"])

# Pydantic shapes
class ProductListItem(BaseModel):
    sku: str
    slug: str | None
    title: dict
    price: float

class ProductDetail(ProductListItem):
    ean: str | None
    images: list
    attributes: dict
    stock: int

# DB session dependency (correct pattern)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[ProductListItem])
def list_products(
    q: Optional[str] = Query(None),
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    try:
        stmt = select(Product).where(Product.status == "published", Product.visible == True)
        if q:
            like = f"%{q.lower()}%"
            stmt = stmt.where((Product.title_el.ilike(like)) | (Product.title_en.ilike(like)))
        stmt = stmt.order_by(Product.created_at.desc()).limit(limit).offset(offset)
        rows = db.execute(stmt).scalars().all()
        return [
            ProductListItem(
                sku=r.sku,
                slug=r.slug,
                title={"el": r.title_el, "en": r.title_en},
                price=float(r.price or 0),
            )
            for r in rows
        ]
    except Exception as e:
        # This surfaces the actual error in the server logs
        print("ERROR /api/products:", repr(e))
        raise HTTPException(status_code=500, detail="Internal error")

@router.get("/{slug}", response_model=ProductDetail)
def get_product(slug: str, db: Session = Depends(get_db)):
    r = db.execute(select(Product).where(Product.slug == slug, Product.visible == True)).scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return ProductDetail(
        sku=r.sku,
        slug=r.slug,
        title={"el": r.title_el, "en": r.title_en},
        price=float(r.price or 0),
        ean=r.ean,
        images=r.images or [],
        attributes=r.attributes or {},
        stock=r.stock or 0,
    )
