# app/models/order.py
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Text
from datetime import datetime

from app.db import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    guest_email = Column(String(255), nullable=True)

    status = Column(String(50), nullable=False, default="draft")
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="EUR")

    # shipping
    shipping_full_name = Column(String(255), nullable=False)
    shipping_phone = Column(String(30), nullable=False)
    shipping_address_line1 = Column(String(255), nullable=False)
    shipping_address_line2 = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=False)
    shipping_postcode = Column(String(20), nullable=False)
    shipping_region = Column(String(100), nullable=True)
    shipping_country = Column(String(100), nullable=False, default="Greece")
    shipping_notes = Column(Text, nullable=True)

    # invoice
    wants_invoice = Column(Boolean, nullable=False, default=False)
    invoice_type = Column(String(30), nullable=True)  # "individual" / "company"
    invoice_company_name = Column(String(255), nullable=True)
    invoice_vat_number = Column(String(20), nullable=True)
    invoice_tax_office = Column(String(100), nullable=True)
    invoice_profession = Column(String(255), nullable=True)
    invoice_address_line1 = Column(String(255), nullable=True)
    invoice_address_line2 = Column(String(255), nullable=True)
    invoice_city = Column(String(100), nullable=True)
    invoice_postcode = Column(String(20), nullable=True)
    invoice_region = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
