from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON

from app.db import Base


class CheckoutDraft(Base):
    __tablename__ = "checkout_drafts"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    guest_email = Column(String(255), nullable=True)
    shipping_data = Column(JSON, nullable=True)
    invoice_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
