# app/routers/contact.py

from fastapi import APIRouter, HTTPException, BackgroundTasks, status, Request
from pydantic import BaseModel, EmailStr
import os
import smtplib
from email.message import EmailMessage
import httpx

from app.config import settings


# 👇 THIS is what FastAPI expects in main.py (contact.router)
router = APIRouter(
    prefix="/api/contact",
    tags=["contact"],
)

class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    turnstileToken: str  

async def verify_turnstile(token: str, remote_ip: str | None = None) -> None:
    """
    Verify Turnstile token with Cloudflare.
    Raises HTTPException if verification fails.
    """
    if not settings.turnstile_secret_key:
        # If you haven't configured it yet, you can:
        # - either allow all (during dev)
        # - or block all to be strict
        # For now, let's allow all if not set:
        return

    verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    data = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    if remote_ip:
        data["remoteip"] = remote_ip

    async with httpx.AsyncClient() as client:
        resp = await client.post(verify_url, data=data)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error verifying Turnstile token",
        )

    result = resp.json()
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turnstile verification failed",
        )


def send_email_background(data: ContactMessage):
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    to_email = os.getenv("CONTACT_TO_EMAIL", smtp_user or "")

    if not (smtp_host and smtp_port and smtp_user and smtp_pass and to_email):
        # In production you'd log this; for now just print so you see it
        print("SMTP config missing, cannot send email")
        return

    msg = EmailMessage()
    msg["Subject"] = f"[Look Optica] {data.subject}"
    msg["From"] = smtp_user
    msg["To"] = to_email
    msg["Reply-To"] = data.email

    body = (
        f"Νέο μήνυμα από τη φόρμα επικοινωνίας Look Optica:\n\n"
        f"Όνομα: {data.name}\n"
        f"Email: {data.email}\n"
        f"Θέμα: {data.subject}\n\n"
        f"Μήνυμα:\n{data.message}\n"
    )
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print("Contact email sent successfully")
    except Exception as e:
        print("Error sending contact email:", e)


@router.post("", status_code=204)
async def submit_contact(
    payload: ContactMessage,
    request: Request,
    background_tasks: BackgroundTasks,
):
    # 🔐 Verify Turnstile
    client_ip = request.client.host if request.client else None
    await verify_turnstile(payload.turnstileToken, client_ip)

    # 📧 Send email asynchronously
    background_tasks.add_task(send_email_background, payload)
    return
