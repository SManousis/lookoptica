# app/models/customer_address.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db import Base


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)

    label = Column(String(50), nullable=True)

    full_name = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=False)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False)
    postcode = Column(String(20), nullable=False)
    region = Column(String(100), nullable=True)
    country = Column(String(100), nullable=False, default="Greece")

    is_default = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # if you have a Customer model, you can link it:
    # customer = relationship("Customer", back_populates="addresses")
