from datetime import datetime, timezone
import secrets
from threading import Lock
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import EmailStr

from app.db import SessionLocal, engine
from app.models.checkout_draft import CheckoutDraft
from app.models.customer_session import CustomerSession
from app.schemas.checkout import CheckoutDetailsPayload, CheckoutDetailsResponse

router = APIRouter(
    prefix="/api/customer",
    tags=["customer-checkout"],
)

DRAFT_COOKIE = "look_checkout_draft"
DRAFT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60  # 30 days
_DRAFT_TABLE_READY = False
_TABLE_LOCK = Lock()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_checkout_table():
    global _DRAFT_TABLE_READY
    if _DRAFT_TABLE_READY:
        return
    with _TABLE_LOCK:
        if _DRAFT_TABLE_READY:
            return
        CheckoutDraft.__table__.create(bind=engine, checkfirst=True)
        _DRAFT_TABLE_READY = True


def _resolve_customer(request: Request, db: Session) -> Optional[int]:
    """Return the authenticated customer_id if a valid customer session cookie is present."""
    sess_id = request.cookies.get("look_customer_sess")
    if not sess_id:
        return None

    session = (
        db.query(CustomerSession)
        .filter(
            CustomerSession.id == sess_id,
            CustomerSession.is_active.is_(True),
        )
        .first()
    )
    if not session:
        return None

    if session.expires_at < datetime.now(timezone.utc):
        session.is_active = False
        db.commit()
        return None

    return session.customer_id


def _normalize_email(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.strip().lower()


def _normalize_block(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not data:
        return None
    normalized = dict(data)
    normalized.setdefault("country", "Greece")
    return normalized


def _get_checkout_draft(
    request: Request,
    db: Session,
    customer_id: Optional[int],
) -> Optional[CheckoutDraft]:
    token = request.cookies.get(DRAFT_COOKIE)
    draft = None
    if token:
        draft = (
            db.query(CheckoutDraft)
            .filter(CheckoutDraft.token == token)
            .first()
        )

    if not draft and customer_id:
        draft = (
            db.query(CheckoutDraft)
            .filter(CheckoutDraft.customer_id == customer_id)
            .order_by(CheckoutDraft.updated_at.desc())
            .first()
        )

    return draft


@router.get("/checkout-details", response_model=CheckoutDetailsResponse)
def get_checkout_details(
    request: Request,
    guest_email: Optional[EmailStr] = Query(default=None),
    db: Session = Depends(get_db),
):
    _ensure_checkout_table()
    customer_id = _resolve_customer(request, db)
    draft = _get_checkout_draft(request, db, customer_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Checkout details not found",
        )

    normalized_guest_email = _normalize_email(str(guest_email)) if guest_email else None
    if customer_id is None:
        if not normalized_guest_email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checkout details not found",
            )
        stored_guest = _normalize_email(draft.guest_email)
        if not stored_guest or stored_guest != normalized_guest_email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Checkout details not found",
            )

    return CheckoutDetailsResponse(
        shipping=_normalize_block(draft.shipping_data),
        invoice=_normalize_block(draft.invoice_data),
    )


@router.put("/checkout-details", response_model=CheckoutDetailsResponse)
def upsert_checkout_details(
    payload: CheckoutDetailsPayload,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    _ensure_checkout_table()
    customer_id = _resolve_customer(request, db)
    draft = _get_checkout_draft(request, db, customer_id)
    cookie_token = request.cookies.get(DRAFT_COOKIE)

    guest_email = _normalize_email(payload.shipping.email)
    if customer_id is None:
        if not guest_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Guest checkout requires a contact email.",
            )
        if draft:
            stored_guest = _normalize_email(draft.guest_email)
            if not stored_guest or stored_guest != guest_email:
                draft = None
                cookie_token = None

    if not draft:
        draft = CheckoutDraft(
            token=cookie_token or secrets.token_urlsafe(32),
        )

    if customer_id:
        draft.customer_id = customer_id
        draft.guest_email = None
    elif payload.shipping.email:
        draft.guest_email = payload.shipping.email

    shipping_payload = payload.shipping.dict()
    invoice_payload = payload.invoice.dict() if payload.invoice else None

    if invoice_payload is not None:
        invoice_payload.setdefault("wants_invoice", True)

    draft.shipping_data = _normalize_block(shipping_payload)
    draft.invoice_data = _normalize_block(invoice_payload)
    draft.updated_at = datetime.now(timezone.utc)

    db.add(draft)
    db.commit()

    response.set_cookie(
        key=DRAFT_COOKIE,
        value=draft.token,
        max_age=DRAFT_COOKIE_MAX_AGE,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
    )

    return CheckoutDetailsResponse(
        shipping=draft.shipping_data,
        invoice=draft.invoice_data,
    )
