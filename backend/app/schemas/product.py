from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LocaleString(BaseModel):
    el: str
    en: str

class ProductUpsert(BaseModel):
    sku: str
    ean: Optional[str] = None
    title: LocaleString
    slug: Optional[str] = None
    brand: str
    category: str
    price: float
    compare_at_price: Optional[float] = None
    stock: int
    status: str = Field(pattern=r"^(draft|published|archived)$")
    attributes: Dict[str, Any] = {}
    seo: Optional[Dict[str, Any]] = None
    version: int = 1
