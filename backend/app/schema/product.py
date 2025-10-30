from pydantic import BaseModel, Field
from typing import Optional, Dict, Any


class LocaleString(BaseModel):
    el: str
    en: str


class ProductUpsert(BaseModel):
    sku: str
    ean: Optional[str] = Non