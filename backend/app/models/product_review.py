from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db import Base


class ProductReview(Base):
    __tablename__ = "product_reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_slug = Column(String(255), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending | approved | rejected
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
