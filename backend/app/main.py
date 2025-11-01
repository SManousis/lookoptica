from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin_products
from app.routers import public_products

app = FastAPI(title="Look Optica API")

# CORS for local dev frontend -> backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later we'll lock this down
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include routers
app.include_router(admin_products.router)
app.include_router(public_products.router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}