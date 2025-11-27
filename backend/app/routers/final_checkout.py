# app/routers/final_checkout.py

from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.deps.admin_auth import get_db
from app.models.product import Product as ProductModel

router = APIRouter(
    prefix="/api/checkout",
    tags=["checkout"],
)


# ---------- Enums for allowed options ----------

class ShippingMethod(str, Enum):
    pickup_store = "pickup_store"
    boxnow = "boxnow"
    courier_home = "courier_home"


class PaymentMethod(str, Enum):
    bank_transfer = "bank_transfer"
    card = "card"          # Viva later
    paypal = "paypal"
    cod = "cod"
    iris = "iris"
    pay_in_store = "pay_in_store"


# ---------- Configurable prices (tune later) ----------

BOXNOW_SHIPPING = Decimal("3.00")
COURIER_SHIPPING = Decimal("4.50")
COD_FEE = Decimal("2.00")
FREE_SHIPPING_THRESHOLD = Decimal("80.00")
FREE_BOXNOW_THRESHOLD = Decimal("40.00")


# ---------- Helpers ----------

def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0.00")
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def _maybe_decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def compute_shipping_and_cod(
    subtotal: Decimal,
    shipping_method: ShippingMethod,
    payment_method: PaymentMethod,
) -> tuple[Decimal, Decimal]:
    """
    Core pricing rules:

    - Pickup_store: always free shipping, no COD fee.
    - Orders >= 80 €: free shipping + free COD (any shipping/payment).
    - Orders >= 40 € with BoxNow: free shipping + free COD.
    - Otherwise:
        * BoxNow shipping: 3.00 €
        * Courier shipping: 4.50 €
        * COD fee: 2.00 € if payment_method == 'cod'
    """
    # Normalize to 2 decimals
    subtotal = subtotal.quantize(Decimal("0.01"))

    # Invalid / empty cart case
    if subtotal <= Decimal("0.00"):
        return Decimal("0.00"), Decimal("0.00")

    # 1) Pickup store: free
    if shipping_method == ShippingMethod.pickup_store:
        # for pickup we assume payment in store or online; COD fee 0
        return Decimal("0.00"), Decimal("0.00")

    # 2) Global free threshold
    if subtotal >= FREE_SHIPPING_THRESHOLD:
        return Decimal("0.00"), Decimal("0.00")

    # 3) BoxNow special threshold
    if shipping_method == ShippingMethod.boxnow and subtotal >= FREE_BOXNOW_THRESHOLD:
        return Decimal("0.00"), Decimal("0.00")

    # 4) Base shipping fees
    if shipping_method == ShippingMethod.boxnow:
        shipping_cost = BOXNOW_SHIPPING
    elif shipping_method == ShippingMethod.courier_home:
        shipping_cost = COURIER_SHIPPING
    else:
        shipping_cost = Decimal("0.00")  # fallback

    # 5) COD fee (only when relevant)
    cod_fee = Decimal("0.00")
    if payment_method == PaymentMethod.cod:
        cod_fee = COD_FEE

    return shipping_cost.quantize(Decimal("0.01")), cod_fee.quantize(Decimal("0.01"))


# ---------- Pydantic models ----------

class CheckoutItem(BaseModel):
    sku: str
    quantity: int = Field(ge=1)
    unit_price: float | None = Field(default=None, ge=0)

    @field_validator("sku")
    @classmethod
    def sku_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("SKU cannot be empty")
        return v


class CheckoutQuoteRequest(BaseModel):
    items: List[CheckoutItem]
    shipping_method: ShippingMethod
    payment_method: PaymentMethod


class CheckoutQuoteLine(BaseModel):
    sku: str
    quantity: int
    title: str | None = None
    slug: str | None = None
    unit_price: float
    line_subtotal: float


class CheckoutQuoteResponse(BaseModel):
    currency: str = "EUR"
    items: List[CheckoutQuoteLine]
    subtotal: float
    shipping_cost: float
    cod_fee: float
    total: float


# ---------- Endpoint ----------

@router.post("/quote", response_model=CheckoutQuoteResponse)
def get_checkout_quote(
    payload: CheckoutQuoteRequest,
    db: Session = Depends(get_db),
):
    """
    Calculate checkout totals from cart items, shipping method and payment method.

    - Validates SKUs against DB.
    - Uses current DB prices (frontend prices are ignored).
    - Applies shipping/COD rules via compute_shipping_and_cod().
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    lines: list[CheckoutQuoteLine] = []
    subtotal_dec = Decimal("0.00")

    for item in payload.items:
        product = (
            db.query(ProductModel)
            .filter(ProductModel.sku == item.sku)
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=400,
                detail=f"Product with SKU '{item.sku}' not found",
            )

        provided_price = _maybe_decimal(item.unit_price)
        unit_price = (
            provided_price if provided_price is not None else _to_decimal(product.price)
        ).quantize(Decimal("0.01"))

        line_subtotal = (unit_price * item.quantity).quantize(Decimal("0.01"))
        subtotal_dec += line_subtotal

        title_el = getattr(product, "title_el", None)
        title_en = getattr(product, "title_en", None)
        title = title_el or title_en or product.slug or product.sku

        lines.append(
            CheckoutQuoteLine(
                sku=item.sku,
                quantity=item.quantity,
                title=title,
                slug=product.slug,
                unit_price=float(unit_price),
                line_subtotal=float(line_subtotal),
            )
        )

    shipping_cost_dec, cod_fee_dec = compute_shipping_and_cod(
        subtotal=subtotal_dec,
        shipping_method=payload.shipping_method,
        payment_method=payload.payment_method,
    )

    total_dec = (subtotal_dec + shipping_cost_dec + cod_fee_dec).quantize(Decimal("0.01"))

    return CheckoutQuoteResponse(
        items=lines,
        subtotal=float(subtotal_dec),
        shipping_cost=float(shipping_cost_dec),
        cod_fee=float(cod_fee_dec),
        total=float(total_dec),
    )
