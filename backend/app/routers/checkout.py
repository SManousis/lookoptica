# app/routers/checkout.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db import SessionLocal
from app.schemas.checkout import (
    CheckoutShippingPayload,
    CheckoutShippingResponse,
)
from app.models.order import Order
from app.models.customer_address import CustomerAddress

router = APIRouter(
    prefix="/checkout",
    tags=["checkout"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/shipping", response_model=CheckoutShippingResponse)
def save_checkout_shipping(
    payload: CheckoutShippingPayload,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Save shipping & optional invoice data for a draft order.
    For now, customer_id is optional – later this will come from auth.
    """
    shipping = payload.shipping
    invoice = payload.invoice

    # --- basic sanity for guest ---
    if not payload.customer_id and not payload.guest_email and not shipping.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either guest_email or shipping.email is required for guest checkout.",
        )

    # derive contact email
    contact_email = payload.guest_email or shipping.email

    # Create a new draft order for now (later we can reuse existing draft)
    order = Order(
        customer_id=payload.customer_id,
        guest_email=contact_email,
        status="draft",
        currency="EUR",
        total_amount=0,  # will be calculated from cart later
        shipping_full_name=shipping.full_name,
        shipping_phone=shipping.phone,
        shipping_address_line1=shipping.address_line1,
        shipping_address_line2=shipping.address_line2,
        shipping_city=shipping.city,
        shipping_postcode=shipping.postcode,
        shipping_region=shipping.region,
        shipping_country=shipping.country or "Greece",
        shipping_notes=shipping.notes,
    )

    # --- invoice snapshot ---
    if invoice and invoice.wants_invoice:
        order.wants_invoice = True
        order.invoice_type = invoice.invoice_type or "company"

        if order.invoice_type == "company":
            # not super strict yet; later we can enforce VAT patterns
            if not invoice.company_name or not invoice.vat_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Company name and VAT number are required for company invoices.",
                )

        order.invoice_company_name = invoice.company_name
        order.invoice_vat_number = invoice.vat_number
        order.invoice_tax_office = invoice.tax_office
        order.invoice_profession = invoice.profession

        # Address for invoice
        if invoice.use_shipping_address:
            order.invoice_address_line1 = shipping.address_line1
            order.invoice_address_line2 = shipping.address_line2
            order.invoice_city = shipping.city
            order.invoice_postcode = shipping.postcode
            order.invoice_region = shipping.region
        else:
            # Use separate fields (validate minimal)
            if not invoice.address_line1 or not invoice.city or not invoice.postcode:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invoice address (line1, city, postcode) is required when not using shipping address.",
                )
            order.invoice_address_line1 = invoice.address_line1
            order.invoice_address_line2 = invoice.address_line2
            order.invoice_city = invoice.city
            order.invoice_postcode = invoice.postcode
            order.invoice_region = invoice.region
    else:
        order.wants_invoice = False

    db.add(order)
    db.commit()
    db.refresh(order)

    # --- optional: save default shipping address for logged customers ---
    if payload.customer_id and payload.save_as_default_shipping:
        existing_default: Optional[CustomerAddress] = (
            db.query(CustomerAddress)
            .filter(
                CustomerAddress.customer_id == payload.customer_id,
                CustomerAddress.is_default.is_(True),
            )
            .first()
        )

        if existing_default:
            # update
            existing_default.full_name = shipping.full_name
            existing_default.phone = shipping.phone
            existing_default.address_line1 = shipping.address_line1
            existing_default.address_line2 = shipping.address_line2
            existing_default.city = shipping.city
            existing_default.postcode = shipping.postcode
            existing_default.region = shipping.region
            existing_default.country = shipping.country or "Greece"
        else:
            # create
            addr = CustomerAddress(
                customer_id=payload.customer_id,
                label="default",
                full_name=shipping.full_name,
                phone=shipping.phone,
                address_line1=shipping.address_line1,
                address_line2=shipping.address_line2,
                city=shipping.city,
                postcode=shipping.postcode,
                region=shipping.region,
                country=shipping.country or "Greece",
                is_default=True,
            )
            db.add(addr)

        db.commit()

    return CheckoutShippingResponse(
        order_id=order.id,
        status=order.status,
    )
