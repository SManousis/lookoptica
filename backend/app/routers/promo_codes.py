# app/routers/promo_codes.py
"""
Promo codes: admin CRUD, plus a shared server-side validate/compute helper
used by both the checkout quote (preview) and order placement (actual use,
where times_used is incremented). Discount is always computed from the
server-trusted subtotal - never from a client-supplied amount.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db import SessionLocal, engine
from app.deps.admin_auth import get_current_admin_user
from app.models.promo_code import PromoCode

router = APIRouter(tags=["promo-codes"])

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        PromoCode.__table__.create(bind=engine, checkfirst=True)
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validate_promo_code(
    db: Session, code: str, subtotal: Decimal
) -> Tuple[Optional[PromoCode], Decimal, Optional[str]]:
    """
    Look up + validate a promo code against a server-trusted subtotal.
    Returns (promo_row_or_None, discount_amount, error_message_or_None).
    Does NOT increment times_used - callers do that only when an order is
    actually placed, not on a checkout-quote preview.
    """
    ensure_table()
    normalized = (code or "").strip().upper()
    if not normalized:
        return None, Decimal("0.00"), None

    promo = db.query(PromoCode).filter(PromoCode.code == normalized).first()
    if not promo:
        return None, Decimal("0.00"), "Ο κωδικός δεν είναι έγκυρος."

    if not promo.is_active:
        return None, Decimal("0.00"), "Ο κωδικός δεν είναι πλέον ενεργός."

    if promo.expires_at is not None:
        expires_at = promo.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            return None, Decimal("0.00"), "Ο κωδικός έχει λήξει."

    if promo.max_uses is not None and promo.times_used >= promo.max_uses:
        return None, Decimal("0.00"), "Ο κωδικός έχει εξαντληθεί."

    if promo.min_order_amount is not None and subtotal < Decimal(str(promo.min_order_amount)):
        return (
            None,
            Decimal("0.00"),
            f"Ελάχιστη αξία παραγγελίας €{Decimal(str(promo.min_order_amount)):.2f} για αυτόν τον κωδικό.",
        )

    if promo.discount_type == "percent":
        discount = subtotal * (Decimal(str(promo.discount_value)) / Decimal("100"))
    else:
        discount = Decimal(str(promo.discount_value))

    discount = min(discount, subtotal).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if discount < Decimal("0.00"):
        discount = Decimal("0.00")

    return promo, discount, None


# ---------- Admin CRUD ----------

class PromoCodeCreateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    discount_type: str
    discount_value: float = Field(..., gt=0)
    min_order_amount: Optional[float] = Field(default=None, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[str] = None  # ISO date/datetime string

    @field_validator("discount_type")
    @classmethod
    def valid_discount_type(cls, v: str) -> str:
        if v not in ("percent", "fixed"):
            raise ValueError("discount_type must be 'percent' or 'fixed'")
        return v

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Code cannot be empty")
        return v


class PromoCodeUpdateRequest(BaseModel):
    is_active: Optional[bool] = None


class AdminPromoCode(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: Optional[float] = None
    max_uses: Optional[int] = None
    times_used: int
    expires_at: Optional[str] = None
    is_active: bool
    created_at: str


def _to_admin_model(row: PromoCode) -> AdminPromoCode:
    return AdminPromoCode(
        id=row.id,
        code=row.code,
        discount_type=row.discount_type,
        discount_value=float(row.discount_value),
        min_order_amount=float(row.min_order_amount) if row.min_order_amount is not None else None,
        max_uses=row.max_uses,
        times_used=row.times_used,
        expires_at=row.expires_at.isoformat() if row.expires_at else None,
        is_active=row.is_active,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


@router.post(
    "/admin/promo-codes",
    response_model=AdminPromoCode,
    status_code=status.HTTP_201_CREATED,
)
def create_promo_code(
    payload: PromoCodeCreateRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    _ = admin

    existing = db.query(PromoCode).filter(PromoCode.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ο κωδικός υπάρχει ήδη.")

    parsed_expiry = None
    if payload.expires_at:
        try:
            parsed_expiry = datetime.fromisoformat(payload.expires_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="Μη έγκυρη ημερομηνία λήξης.")

    row = PromoCode(
        code=payload.code,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        min_order_amount=payload.min_order_amount,
        max_uses=payload.max_uses,
        expires_at=parsed_expiry,
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_admin_model(row)


@router.get("/admin/promo-codes", response_model=List[AdminPromoCode])
def list_promo_codes(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    _ = admin
    rows = db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()
    return [_to_admin_model(r) for r in rows]


@router.patch("/admin/promo-codes/{promo_id}", response_model=AdminPromoCode)
def update_promo_code(
    promo_id: int,
    payload: PromoCodeUpdateRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    _ = admin
    row = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Promo code not found")
    if payload.is_active is not None:
        row.is_active = payload.is_active
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_admin_model(row)


@router.delete("/admin/promo-codes/{promo_id}")
def delete_promo_code(
    promo_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    _ = admin
    row = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Promo code not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
