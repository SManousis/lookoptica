from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin_products, shop_products, admin_auth
from app.routers import public_products
from app.routers import contact
from app.routers import admin_contact_lenses
from app.routers import checkout
from app.routers import final_checkout
from app.middleware.rate_limit import RateLimiterMiddleware
from app.middleware.csrf import CSRFMiddleware   # <-- NEW

import logging
import logging.config
import json
import sys

LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "logging.Formatter",
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
        }
    },
    "handlers": {
        "default": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
            "formatter": "json",
        }
    },
    "root": {
        "handlers": ["default"],
        "level": "INFO",
    },
}

logging.config.dictConfig(LOG_CONFIG)
logger = logging.getLogger(__name__)


app = FastAPI(title="Look Optica API")

# ------------------ CORS (must be first custom middleware) ------------------
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Rate limiting middleware ------------------
# Apply to all sensitive admin auth endpoints
app.add_middleware(
    RateLimiterMiddleware,
    max_requests=10,               # e.g. 10 requests per window
    window_seconds=60,             # 1 minute
    protected_prefixes=[
        "/api/admin/auth",         # ALL auth endpoints
    ],
)

# ------------------ CSRF middleware ------------------
# Protect admin panel API calls
app.add_middleware(
    CSRFMiddleware,
    protected_prefixes=[
        "/api/admin",              # Everything under /api/admin should require CSRF
    ],
    exempt_paths=[
        "/api/admin/auth/login",   # login issues the CSRF token
    ],
)

# ------------------ Routers ------------------
app.include_router(admin_products.router)
app.include_router(admin_contact_lenses.router)
app.include_router(admin_auth.router)
app.include_router(public_products.router)
app.include_router(shop_products.router)
app.include_router(contact.router)
app.include_router(checkout.router)
app.include_router(final_checkout.router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
