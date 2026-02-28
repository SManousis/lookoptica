from __future__ import annotations

import base64
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx


@dataclass(frozen=True)
class VivaConfig:
    env: str  # "sandbox" or "production"
    client_id: str
    client_secret: str
    source_code: str
    success_url: str
    fail_url: str

    @property
    def base_url(self) -> str:
        # Viva API base:
        # sandbox: https://demo-api.vivapayments.com
        # production: https://api.vivapayments.com
        return "https://demo-api.vivapayments.com" if self.env.lower() == "sandbox" else "https://api.vivapayments.com"

    @property
    def auth_header(self) -> str:
        # Basic Auth: base64(client_id:client_secret)
        raw = f"{self.client_id}:{self.client_secret}".encode("utf-8")
        b64 = base64.b64encode(raw).decode("ascii")
        return f"Basic {b64}"


class VivaError(RuntimeError):
    pass


async def create_viva_order(
    cfg: VivaConfig,
    *,
    amount_eur: float,
    merchant_trns: str,
    customer_email: Optional[str] = None,
    customer_phone: Optional[str] = None,
    customer_name: Optional[str] = None,
    request_lang: str = "el-GR",
    disable_cash: bool = True,
) -> Dict[str, Any]:
    """
    Creates a Viva Smart Checkout order and returns:
      { "orderCode": "...", "checkoutUrl": "..." }
    """
    if amount_eur <= 0:
        raise VivaError("Amount must be > 0")

    # Viva expects amount in cents (integer)
    amount_cents = int(round(amount_eur * 100))

    payload: Dict[str, Any] = {
        "amount": amount_cents,
        "sourceCode": cfg.source_code,
        "customerTrns": merchant_trns,   # what customer sees
        "merchantTrns": merchant_trns,   # your internal note
        "requestLang": request_lang,
        "disableCash": disable_cash,
        "redirectUrl": cfg.success_url,  # user returns here after payment
        "failUrl": cfg.fail_url,
    }

    # Optional customer info (helps conversion + fraud checks)
    if customer_email:
        payload["customer"] = payload.get("customer", {})
        payload["customer"]["email"] = customer_email
    if customer_phone:
        payload["customer"] = payload.get("customer", {})
        payload["customer"]["phone"] = customer_phone
    if customer_name:
        payload["customer"] = payload.get("customer", {})
        payload["customer"]["fullName"] = customer_name

    url = f"{cfg.base_url}/checkout/v2/orders"

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": cfg.auth_header,
                "Content-Type": "application/json",
            },
        )

    if res.status_code >= 400:
        # Viva returns useful json/text; bubble it up
        raise VivaError(f"Viva error {res.status_code}: {res.text}")

    data = res.json()

    # Viva typically returns {"orderCode": 1234567890}
    order_code = data.get("orderCode")
    if not order_code:
        raise VivaError(f"Missing orderCode in response: {data}")

    checkout_url = (
        "https://demo.vivapayments.com/web/checkout?ref="
        if cfg.env.lower() == "sandbox"
        else "https://www.vivapayments.com/web/checkout?ref="
    ) + str(order_code)

    return {"orderCode": order_code, "checkoutUrl": checkout_url}
