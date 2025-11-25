from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ShippingAddress(BaseModel):
    full_name: str = Field(..., max_length=255)
    phone: str = Field(..., max_length=30)
    email: Optional[EmailStr] = None
    address_line1: str = Field(..., max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(..., max_length=100)
    postcode: str = Field(..., max_length=20)
    region: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default="Greece", max_length=100)
    notes: Optional[str] = None


class InvoiceDetails(BaseModel):
    wants_invoice: bool = False
    invoice_type: Optional[str] = Field(default=None, max_length=30)
    company_name: Optional[str] = Field(default=None, max_length=255)
    vat_number: Optional[str] = Field(default=None, max_length=20)
    tax_office: Optional[str] = Field(default=None, max_length=100)
    profession: Optional[str] = Field(default=None, max_length=255)
    use_shipping_address: bool = True

    address_line1: Optional[str] = Field(default=None, max_length=255)
    address_line2: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    postcode: Optional[str] = Field(default=None, max_length=20)
    region: Optional[str] = Field(default=None, max_length=100)


class CheckoutShippingPayload(BaseModel):
    customer_id: Optional[int] = None
    guest_email: Optional[EmailStr] = None
    save_as_default_shipping: bool = False
    shipping: ShippingAddress
    invoice: Optional[InvoiceDetails] = None


class CheckoutShippingResponse(BaseModel):
    order_id: int
    status: str
