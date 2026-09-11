# app/routers/reviews.py
"""
Product reviews: public submission (Turnstile-protected), admin moderation
(reviews only appear on the product page once approved), public read of
approved reviews + aggregate rating for a product.
"""
import smtplib
from email.message import EmailMessage
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, engine
from app.deps.admin_auth import get_current_admin_user
from app.models.product_review import ProductReview
from app.services.turnstile import verify_turnstile_token

router = APIRouter(tags=["reviews"])

_TABLE_READY = False


def ensure_table():
    global _TABLE_READY
    if not _TABLE_READY:
        ProductReview.__table__.create(bind=engine, checkfirst=True)
        _TABLE_READY = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ReviewSubmitRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)
    turnstile_token: str


class ReviewSubmitResponse(BaseModel):
    id: int
    status: str


class PublicReview(BaseModel):
    id: int
    customer_name: str
    rating: int
    comment: Optional[str] = None
    created_at: str


class ProductReviewsResponse(BaseModel):
    reviews: List[PublicReview]
    average_rating: Optional[float] = None
    count: int


def _send_admin_notification(review: ProductReview, slug: str) -> None:
    smtp_host = settings.smtp_host or ""
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user or ""
    smtp_pass = settings.smtp_pass or ""
    to_email = settings.contact_to_email or smtp_user

    if not (smtp_host and smtp_port and smtp_user and smtp_pass and to_email):
        print("SMTP config missing, cannot send review notification email")
        return

    msg = EmailMessage()
    msg["Subject"] = f"[Look Optica] Νέα αξιολόγηση προϊόντος - {slug}"
    msg["From"] = smtp_user
    msg["To"] = to_email
    body = (
        f"Νέα αξιολόγηση προϊόντος αναμένει έγκριση (review #{review.id})\n\n"
        f"Προϊόν: {slug}\n"
        f"Όνομα: {review.customer_name}\n"
        f"Βαθμολογία: {review.rating}/5\n"
        f"Σχόλιο: {review.comment or '-'}\n"
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
        print(f"Error sending review notification email: {exc}")


@router.post(
    "/products/{slug}/reviews",
    response_model=ReviewSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_review(
    slug: str,
    payload: ReviewSubmitRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ensure_table()

    client_ip = request.client.host if request.client else None
    ok = await verify_turnstile_token(payload.turnstile_token, client_ip)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Η επαλήθευση ασφαλείας απέτυχε. Δοκιμάστε ξανά.",
        )

    review = ProductReview(
        product_slug=slug,
        customer_name=payload.name.strip(),
        rating=payload.rating,
        comment=(payload.comment or "").strip() or None,
        status="pending",
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    _send_admin_notification(review, slug)

    return ReviewSubmitResponse(id=review.id, status=review.status)


@router.get("/products/{slug}/reviews", response_model=ProductReviewsResponse)
def get_product_reviews(slug: str, db: Session = Depends(get_db)):
    ensure_table()
    rows = (
        db.query(ProductReview)
        .filter(ProductReview.product_slug == slug, ProductReview.status == "approved")
        .order_by(ProductReview.created_at.desc())
        .all()
    )
    count = len(rows)
    average = round(sum(r.rating for r in rows) / count, 2) if count else None
    return ProductReviewsResponse(
        reviews=[
            PublicReview(
                id=r.id,
                customer_name=r.customer_name,
                rating=r.rating,
                comment=r.comment,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in rows
        ],
        average_rating=average,
        count=count,
    )


class AdminReviewItem(BaseModel):
    id: int
    product_slug: str
    customer_name: str
    rating: int
    comment: Optional[str] = None
    status: str
    created_at: str


@router.get("/admin/reviews", response_model=List[AdminReviewItem])
def list_reviews_admin(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    ensure_table()
    _ = admin
    rows = db.query(ProductReview).order_by(ProductReview.created_at.desc()).all()
    return [
        AdminReviewItem(
            id=r.id,
            product_slug=r.product_slug,
            customer_name=r.customer_name,
            rating=r.rating,
            comment=r.comment,
            status=r.status,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]


@router.post("/admin/reviews/{review_id}/approve", response_model=AdminReviewItem)
def approve_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    _ = admin
    review = db.query(ProductReview).filter(ProductReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = "approved"
    db.add(review)
    db.commit()
    db.refresh(review)
    return AdminReviewItem(
        id=review.id,
        product_slug=review.product_slug,
        customer_name=review.customer_name,
        rating=review.rating,
        comment=review.comment,
        status=review.status,
        created_at=review.created_at.isoformat() if review.created_at else "",
    )


@router.delete("/admin/reviews/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin_user),
):
    _ = admin
    review = db.query(ProductReview).filter(ProductReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    db.delete(review)
    db.commit()
    return {"ok": True}
