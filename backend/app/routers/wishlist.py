# app/routers/wishlist.py
"""
Customer wishlist: simple slug list per logged-in customer. No product data
is duplicated here - the frontend fetches product details for each slug from
the existing public products endpoint.
"""
from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import SessionLocal, engine
from app.models.wishlist_item import WishlistItem
from app.routers.customer_auth import get_current_customer

router = APIRouter(prefix="/customer/wishlist", tags=["wishlist"])

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        WishlistItem.__table__.create(bind=engine, checkfirst=True)
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class WishlistAddRequest(BaseModel):
    product_slug: str = Field(..., min_length=1, max_length=255)


class WishlistItemResponse(BaseModel):
    product_slug: str
    created_at: str


@router.get("", response_model=List[WishlistItemResponse])
def list_wishlist(
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    ensure_table()
    rows = (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer.id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
    return [
        WishlistItemResponse(
            product_slug=r.product_slug,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.post("", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    payload: WishlistAddRequest,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    ensure_table()
    slug = payload.product_slug.strip()

    existing = (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer.id, WishlistItem.product_slug == slug)
        .first()
    )
    if existing:
        return WishlistItemResponse(
            product_slug=existing.product_slug,
            created_at=existing.created_at.isoformat() if existing.created_at else "",
        )

    row = WishlistItem(customer_id=customer.id, product_slug=slug)
    db.add(row)
    db.commit()
    db.refresh(row)
    return WishlistItemResponse(
        product_slug=row.product_slug,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


@router.delete("/{product_slug}")
def remove_from_wishlist(
    product_slug: str,
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    ensure_table()
    (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer.id, WishlistItem.product_slug == product_slug)
        .delete()
    )
    db.commit()
    return {"ok": True}
