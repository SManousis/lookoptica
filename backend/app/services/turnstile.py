# app/services/turnstile.py
import httpx
from app.config import settings

async def verify_turnstile_token(token: str, ip: str | None = None) -> bool:
    data = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    if ip:
        data["remoteip"] = ip

    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=data)
    payload = r.json()
    return bool(payload.get("success"))
