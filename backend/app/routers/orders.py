import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import SessionLocal, engine
from app.deps.admin_auth import get_current_admin_user
from app.models.customer_session import CustomerSession
from app.models.order_notification import OrderNotification
from app.routers.customer_auth import get_current_customer

router = APIRouter(tags=["orders"])

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        OrderNotification.__table__.create(bind=engine, checkfirst=True)
        # order_notifications already exists in production with real rows -
        # `create(checkfirst=True)` won't add a new column to an existing
        # table, so add it explicitly. Idempotent/safe to run every time.
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE order_notifications "
                    "ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id)"
                )
            )
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _resolve_customer_id(request: Request, db: Session) -> Optional[int]:
    """Best-effort: link the order to a logged-in customer if a valid
    session cookie is present, without requiring login (guests can still
    place orders)."""
    sess_id = request.cookies.get("look_customer_sess")
    if not sess_id:
        return None
    session = (
        db.query(CustomerSession)
        .filter(CustomerSession.id == sess_id, CustomerSession.is_active.is_(True))
        .first()
    )
    if not session:
        return None
    if session.expires_at < datetime.now(timezone.utc):
        return None
    return session.customer_id


class PlaceOrderPayload(BaseModel):
    product_codes: List[str] = Field(..., min_length=1)
    payment_method: str = Field(..., min_length=2, max_length=50)
    contact_name: Optional[str] = Field(default=None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    shipping_address_line1: Optional[str] = Field(default=None, max_length=255)
    shipping_address_line2: Optional[str] = Field(default=None, max_length=255)
    shipping_city: Optional[str] = Field(default=None, max_length=100)
    shipping_postcode: Optional[str] = Field(default=None, max_length=20)
    shipping_region: Optional[str] = Field(default=None, max_length=100)
    shipping_country: Optional[str] = Field(default=None, max_length=100)
    shipping_notes: Optional[str] = None


class PlaceOrderResponse(BaseModel):
    id: int


class OrderNotificationResponse(BaseModel):
    id: int
    product_codes: List[str]
    payment_method: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    shipping_address_line1: Optional[str] = None
    shipping_address_line2: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_postcode: Optional[str] = None
    shipping_region: Optional[str] = None
    shipping_country: Optional[str] = None
    shipping_notes: Optional[str] = None
    created_at: str


def _send_notification_email(order_id: int, codes: List[str], payment_method: str) -> None:
    from app.config import settings

    smtp_host = settings.smtp_host or ""
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user or ""
    smtp_pass = settings.smtp_pass or ""
    to_email = settings.contact_to_email or smtp_user or "info@lookoptica.gr"

    if not (smtp_host and smtp_port and smtp_user and smtp_pass and to_email):
        print("SMTP config missing, cannot send order notification email")
        return

    msg = EmailMessage()
    msg["Subject"] = f"[Look Optica] New order #{order_id}"
    msg["From"] = smtp_user
    msg["To"] = to_email

    codes_line = ", ".join(codes) if codes else "N/A"
    body = (
        "A new order was placed on lookoptica.gr\n\n"
        f"Order ID: {order_id}\n"
        f"Product codes: {codes_line}\n"
        f"Payment method: {payment_method}\n"
    )
    msg.set_content(body)

    try:
        print(f"[Order Email] Connecting to {smtp_host}:{smtp_port} as {smtp_user}")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"Order notification email sent for order #{order_id}")
    except Exception as exc:
        import traceback
        print(f"Error sending order notification email: {exc}")
        traceback.print_exc()


@router.post("/orders", response_model=PlaceOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order_notification(
    payload: PlaceOrderPayload, request: Request, db: Session = Depends(get_db)
):
    ensure_table()
    codes = [code.strip() for code in payload.product_codes if code and code.strip()]
    if not codes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one product code is required.",
        )

    payment_method = payload.payment_method.strip()
    if not payment_method:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment method is required.",
        )

    record = OrderNotification(
        customer_id=_resolve_customer_id(request, db),
        product_codes=",".join(codes),
        payment_method=payment_method,
        contact_name=(payload.contact_name or "").strip() or None,
        contact_email=(payload.contact_email or "").strip() or None,
        contact_phone=(payload.contact_phone or "").strip() or None,
        shipping_address_line1=(payload.shipping_address_line1 or "").strip() or None,
        shipping_address_line2=(payload.shipping_address_line2 or "").strip() or None,
        shipping_city=(payload.shipping_city or "").strip() or None,
        shipping_postcode=(payload.shipping_postcode or "").strip() or None,
        shipping_region=(payload.shipping_region or "").strip() or None,
        shipping_country=(payload.shipping_country or "").strip() or None,
        shipping_notes=(payload.shipping_notes or "").strip() or None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    _send_notification_email(record.id, codes, payment_method)

    return PlaceOrderResponse(id=record.id)


@router.get(
    "/customer/orders",
    response_model=List[OrderNotificationResponse],
)
def list_customer_orders(
    db: Session = Depends(get_db),
    customer=Depends(get_current_customer),
):
    ensure_table()
    records = (
        db.query(OrderNotification)
        .filter(OrderNotification.customer_id == customer.id)
        .order_by(OrderNotification.created_at.desc())
        .all()
    )
    response: List[OrderNotificationResponse] = []
    for record in records:
        product_codes = [
            code.strip()
            for code in (record.product_codes or "").split(",")
            if code and code.strip()
        ]
        response.append(
            OrderNotificationResponse(
                id=record.id,
                product_codes=product_codes,
                payment_method=record.payment_method,
                contact_name=record.contact_name,
                contact_email=record.contact_email,
                contact_phone=record.contact_phone,
                shipping_address_line1=record.shipping_address_line1,
                shipping_address_line2=record.shipping_address_line2,
                shipping_city=record.shipping_city,
                shipping_postcode=record.shipping_postcode,
                shipping_region=record.shipping_region,
                shipping_country=record.shipping_country,
                shipping_notes=record.shipping_notes,
                created_at=record.created_at.isoformat() if record.created_at else "",
            )
        )
    return response


@router.get(
    "/admin/orders",
    response_model=List[OrderNotificationResponse],
)
def list_order_notifications(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    records = (
        db.query(OrderNotification)
        .order_by(OrderNotification.created_at.desc())
        .all()
    )
    response: List[OrderNotificationResponse] = []
    for record in records:
        product_codes = [
            code.strip()
            for code in (record.product_codes or "").split(",")
            if code and code.strip()
        ]
        response.append(
            OrderNotificationResponse(
                id=record.id,
                product_codes=product_codes,
                payment_method=record.payment_method,
                contact_name=record.contact_name,
                contact_email=record.contact_email,
                contact_phone=record.contact_phone,
                shipping_address_line1=record.shipping_address_line1,
                shipping_address_line2=record.shipping_address_line2,
                shipping_city=record.shipping_city,
                shipping_postcode=record.shipping_postcode,
                shipping_region=record.shipping_region,
                shipping_country=record.shipping_country,
                shipping_notes=record.shipping_notes,
                created_at=record.created_at.isoformat() if record.created_at else "",
            )
        )
    return response
