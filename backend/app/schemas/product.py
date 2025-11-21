from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class LocaleString(BaseModel):
    el: Optional[str] = None
    en: Optional[str] = None


class ProductUpsert(BaseModel):
    sku: str
    ean: Optional[str] = None
    title: LocaleString
    slug: Optional[str] = None
    brand: str
    category: str
    audience: Optional[str] = Field(
        default=None,
        description="male | female | unisex | boy | girl | kids_unisex",
    )
    price: float
    compare_at_price: Optional[float] = None
    stock: int
    status: str = Field(
        default="draft",
        pattern=r"^[a-z_]+$",
        description="draft/published/archived plus storefront availability states like in_stock, preorder, unavailable",
    )
    attributes: Dict[str, Any] = Field(default_factory=dict)
    seo: Optional[Dict[str, Any]] = None
    version: int = 1
