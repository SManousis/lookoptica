from fastapi import APIRouter, Header, HTTPException, Request

# If you haven't created schemas/product.py yet, comment out this import + the type hints
from app.schemas.product import ProductUpsert

router = APIRouter(
    prefix="/api/admin/products",
    tags=["admin-products"],
)

@router.post("/sync")
async def upsert_product(
    payload: ProductUpsert,
    request: Request,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    authorization: str | None = Header(default=None, alias="Authorization"),
):
    """
    This will eventually:
    - verify HMAC in `authorization`
    - upsert the product into Postgres
    - return product id / version
    For now we just return a stub so the server boots.
    """
    if authorization is None:
        # simple guard for now, so you can see it's working
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    return {
        "shop_product_id": f"prod_{payload.sku}",
        "status": payload.status,
        "version": payload.version,
        "idempotency_key": idempotency_key,
    }

@router.get("/{sku}")
async def get_product_admin(sku: str):
    """
    TODO: fetch from DB by SKU.
    For now just return dummy so FastAPI docs work.
    """
    if sku == "test":
        return {
            "sku": "test",
            "ean": "1234567890123",
            "title": {"el": "Δείγμα", "en": "Sample"},
            "slug": "sample-product",
            "brand": "DemoBrand",
            "category": "ophthalmic_frames",
            "price": 99.0,
            "compare_at_price": 129.0,
            "stock": 4,
            "status": "published",
            "attributes": {"color": "Black"},
            "version": 1,
        }
    raise HTTPException(status_code=404, detail="Not found")

@router.post("/{sku}/unpublish")
async def unpublish_product(sku: str):
    """
    TODO: mark product as archived in DB.
    """
    return {"ok": True, "sku": sku, "status": "archived"}
