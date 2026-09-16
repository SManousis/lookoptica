from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String

from app.db import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    discount_type = Column(String(10), nullable=False)  # "percent" | "fixed"
    discount_value = Column(Numeric(10, 2), nullable=False)
    min_order_amount = Column(Numeric(10, 2), nullable=True)
    max_uses = Column(Integer, nullable=True)
    times_used = Column(Integer, nullable=False, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
