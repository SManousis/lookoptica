from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.config import settings
from app.payments.viva import VivaConfig, VivaError, create_viva_order

router = APIRouter(prefix="/api/payments/viva", tags=["payments-viva"])


class VivaCreatePaymentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Total amount in EUR")
    order_id: str = Field(..., min_length=1, description="Your internal order id")
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None


class VivaCreatePaymentResponse(BaseModel):
    orderCode: str
    checkoutUrl: str


@router.post("/create", response_model=VivaCreatePaymentResponse)
async def viva_create_payment(req: VivaCreatePaymentRequest):
    cfg = VivaConfig(
        env=getattr(settings, "viva_env", "production"),
        client_id=settings.viva_client_id,
        client_secret=settings.viva_client_secret,
        source_code=settings.viva_source_code,
        success_url=settings.viva_success_url,
        fail_url=settings.viva_fail_url,
    )

    merchant_trns = f"Order {req.order_id} - LookOptica"

    try:
        result = await create_viva_order(
            cfg,
            amount_eur=req.amount,
            merchant_trns=merchant_trns,
            customer_email=req.customer_email,
            customer_phone=req.customer_phone,
            customer_name=req.customer_name,
        )
        # ensure strings for Pydantic response
        return {
            "orderCode": str(result["orderCode"]),
            "checkoutUrl": str(result["checkoutUrl"]),
        }
    except VivaError as e:
        raise HTTPException(status_code=502, detail=str(e))
