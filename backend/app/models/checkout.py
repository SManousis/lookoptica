# app/schemas/checkout.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class ShippingAddress(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str = Field(..., min_length=5, max_length=30)
    email: Optional[EmailStr] = None

    address_line1: str = Field(..., min_length=3, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(..., min_length=2, max_length=100)
    postcode: str = Field(..., min_length=4, max_length=20)
    region: Optional[str] = Field(default=None, max_length=100)
    country: str = Field(default="Greece", max_length=100)
    notes: Optional[str] = None


class InvoiceDetails(BaseModel):
    wants_invoice: bool = False
    invoice_type: Optional[str] = Field(
        default=None,
        pattern="^(individual|company)$",
        description="individual or company",
    )

    company_name: Optional[str] = None
    vat_number: Optional[str] = None
    tax_office: Optional[str] = None
    profession: Optional[str] = None

    use_shipping_address: bool = True

    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    region: Optional[str] = None


class CheckoutShippingPayload(BaseModel):
    # For guest checkouts
    guest_email: Optional[EmailStr] = None

    # TEMP: until customer auth dependency is wired
    customer_id: Optional[int] = Field(
        default=None,
        description="Will be replaced by authenticated user; for now optional.",
    )

    shipping: ShippingAddress
    invoice: Optional[InvoiceDetails] = None

    save_as_default_shipping: bool = False


class CheckoutShippingResponse(BaseModel):
    order_id: int
    status: str
    next_step: str = "summary"
