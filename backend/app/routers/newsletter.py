# app/routers/newsletter.py
"""
Newsletter signup: public subscribe endpoint (stores the email, notifies the
admin), plus an admin listing endpoint. No confirmation email is sent to the
subscriber - this avoids the classic abuse pattern where a public signup form
is used to spam an arbitrary third-party inbox with "confirm your
subscription" emails.
"""
import smtplib
from email.message import EmailMessage
from typing import List

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, engine
from app.deps.admin_auth import get_current_admin_user
from app.models.newsletter_subscriber import NewsletterSubscriber

router = APIRouter(tags=["newsletter"])

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        NewsletterSubscriber.__table__.create(bind=engine, checkfirst=True)
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr


class NewsletterSubscribeResponse(BaseModel):
    ok: bool = True


def _send_admin_notification(email: str) -> None:
    smtp_host = settings.smtp_host or ""
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user or ""
    smtp_pass = settings.smtp_pass or ""
    to_email = settings.contact_to_email or smtp_user

    if not (smtp_host and smtp_port and smtp_user and smtp_pass and to_email):
        print("SMTP config missing, cannot send newsletter notification email")
        return

    msg = EmailMessage()
    msg["Subject"] = "[Look Optica] Νέα εγγραφή στο newsletter"
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg.set_content(f"Νέα εγγραφή στο newsletter: {email}")

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as exc:
        print(f"Error sending newsletter notification email: {exc}")


@router.post(
    "/newsletter/subscribe",
    response_model=NewsletterSubscribeResponse,
    status_code=status.HTTP_201_CREATED,
)
def subscribe_newsletter(payload: NewsletterSubscribeRequest, db: Session = Depends(get_db)):
    ensure_table()
    email = payload.email.strip().lower()

    existing = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.email == email).first()
    if existing:
        return NewsletterSubscribeResponse(ok=True)

    record = NewsletterSubscriber(email=email)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return NewsletterSubscribeResponse(ok=True)

    _send_admin_notification(email)

    return NewsletterSubscribeResponse(ok=True)


class AdminNewsletterSubscriber(BaseModel):
    id: int
    email: str
    created_at: str


@router.get("/admin/newsletter", response_model=List[AdminNewsletterSubscriber])
def list_newsletter_subscribers(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    _ = admin
    rows = (
        db.query(NewsletterSubscriber)
        .order_by(NewsletterSubscriber.created_at.desc())
        .all()
    )
    return [
        AdminNewsletterSubscriber(
            id=r.id,
            email=r.email,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]
