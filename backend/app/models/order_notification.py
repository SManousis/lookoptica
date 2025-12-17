from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.db import Base


class OrderNotification(Base):
    __tablename__ = "order_notifications"

    id = Column(Integer, primary_key=True, index=True)
    product_codes = Column(Text, nullable=False)
    payment_method = Column(String(50), nullable=False)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    shipping_address_line1 = Column(String(255), nullable=True)
    shipping_address_line2 = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_postcode = Column(String(20), nullable=True)
    shipping_region = Column(String(100), nullable=True)
    shipping_country = Column(String(100), nullable=True)
    shipping_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
