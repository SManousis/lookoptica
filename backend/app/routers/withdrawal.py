# app/routers/withdrawal.py
"""
Consumer withdrawal-request ("right of withdrawal") flow.

Required by Greek Law 5317/2026 (transposing EU Directive 2023/2673): e-shops
must offer an electronic "withdrawal button" flow letting a customer declare
withdrawal without relying on email/phone, and must issue an immediate,
timestamped confirmation of receipt.
"""
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, engine
from app.deps.admin_auth import get_current_admin_user
from app.models.order_notification import OrderNotification
from app.models.withdrawal_request import WithdrawalRequest

router = APIRouter(tags=["withdrawal"])

WITHDRAWAL_WINDOW_DAYS = 14

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        WithdrawalRequest.__table__.create(bind=engine, checkfirst=True)
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _find_order(db: Session, order_id: int, email: str) -> Optional[OrderNotification]:
    normalized_email = (email or "").strip().lower()
    order = (
        db.query(OrderNotification)
        .filter(OrderNotification.id == order_id)
        .first()
    )
    if not order or not order.contact_email:
        return None
    if order.contact_email.strip().lower() != normalized_email:
        return None
    return order


def _within_withdrawal_window(order: OrderNotification) -> bool:
    created = order.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) <= created + timedelta(days=WITHDRAWAL_WINDOW_DAYS)


class OrderLookupRequest(BaseModel):
    order_id: int
    email: EmailStr


class OrderLookupResponse(BaseModel):
    order_id: int
    product_codes: List[str]
    payment_method: str
    created_at: str
    withdrawal_deadline: str
    eligible: bool


class WithdrawalSubmitRequest(BaseModel):
    order_id: int
    email: EmailStr
    name: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    reason: Optional[str] = Field(default=None, max_length=2000)


class WithdrawalSubmitResponse(BaseModel):
    id: int
    order_id: int
    submitted_at: str
    reference: str


def _send_admin_notification(withdrawal_id: int, order: OrderNotification, email: str) -> None:
    smtp_host = settings.smtp_host or ""
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user or ""
    smtp_pass = settings.smtp_pass or ""
    to_email = settings.contact_to_email or smtp_user

    if not (smtp_host and smtp_port and smtp_user and smtp_pass and to_email):
        print("SMTP config missing, cannot send withdrawal notification email")
        return

    msg = EmailMessage()
    msg["Subject"] = f"[Look Optica] Δήλωση υπαναχώρησης - Παραγγελία #{order.id}"
    msg["From"] = smtp_user
    msg["To"] = to_email
    body = (
        f"Νέα δήλωση υπαναχώρησης (withdrawal request #{withdrawal_id})\n\n"
        f"Παραγγελία: #{order.id}\n"
        f"Email πελάτη: {email}\n"
        f"Κωδικοί προϊόντων: {order.product_codes}\n"
        f"Τρόπος πληρωμής: {order.payment_method}\n"
    )
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as exc:
        print(f"Error sending withdrawal notification email: {exc}")


@router.post("/orders/lookup", response_model=OrderLookupResponse)
def lookup_order(payload: OrderLookupRequest, db: Session = Depends(get_db)):
    order = _find_order(db, payload.order_id, payload.email)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Δεν βρέθηκε παραγγελία με αυτά τα στοιχεία.",
        )

    codes = [c.strip() for c in (order.product_codes or "").split(",") if c.strip()]
    created = order.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    deadline = created + timedelta(days=WITHDRAWAL_WINDOW_DAYS)

    return OrderLookupResponse(
        order_id=order.id,
        product_codes=codes,
        payment_method=order.payment_method,
        created_at=created.isoformat(),
        withdrawal_deadline=deadline.isoformat(),
        eligible=_within_withdrawal_window(order),
    )


@router.post("/orders/withdrawal", response_model=WithdrawalSubmitResponse, status_code=status.HTTP_201_CREATED)
def submit_withdrawal(payload: WithdrawalSubmitRequest, db: Session = Depends(get_db)):
    ensure_table()

    order = _find_order(db, payload.order_id, payload.email)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Δεν βρέθηκε παραγγελία με αυτά τα στοιχεία.",
        )

    if not _within_withdrawal_window(order):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Η προθεσμία των 14 ημερολογιακών ημερών για υπαναχώρηση από "
                "αυτή την παραγγελία έχει παρέλθει."
            ),
        )

    record = WithdrawalRequest(
        order_id=order.id,
        customer_name=(payload.name or "").strip() or None,
        customer_email=payload.email,
        customer_phone=(payload.phone or "").strip() or None,
        reason=(payload.reason or "").strip() or None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    _send_admin_notification(record.id, order, payload.email)

    submitted_at = record.created_at
    if submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)

    return WithdrawalSubmitResponse(
        id=record.id,
        order_id=order.id,
        submitted_at=submitted_at.isoformat(),
        reference=f"WD-{record.id:06d}",
    )


class WithdrawalAdminItem(BaseModel):
    id: int
    order_id: int
    customer_name: Optional[str] = None
    customer_email: str
    customer_phone: Optional[str] = None
    reason: Optional[str] = None
    status: str
    created_at: str


@router.get("/admin/withdrawals", response_model=List[WithdrawalAdminItem])
def list_withdrawals(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    _ = admin
    rows = (
        db.query(WithdrawalRequest)
        .order_by(WithdrawalRequest.created_at.desc())
        .all()
    )
    return [
        WithdrawalAdminItem(
            id=r.id,
            order_id=r.order_id,
            customer_name=r.customer_name,
            customer_email=r.customer_email,
            customer_phone=r.customer_phone,
            reason=r.reason,
            status=r.status,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]
