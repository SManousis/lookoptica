from sqlalchemy import BigInteger, Column, Text, Integer, Boolean, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.types import TIMESTAMP
from app.db import Base


class Product(Base):
    __tablename__ = "products"
    id = Column(BigInteger, primary_key=True)
    sku = Column(Text, nullable=False, unique=True)
    ean = Column(Text)
    slug = Column(Text, index=True)
    title_el = Column(Text, nullable=False)
    title_en = Column(Text, nullable=False)
    brand_id = Column(BigInteger, ForeignKey("brands.id"))
    category_id = Column(BigInteger, ForeignKey("categories.id"))
    description = Column(Text)
    images = Column(JSONB, default=list)
    price = Column(Numeric(10,2), nullable=False)
    compare_at_price = Column(Numeric(10,2))
    attributes = Column(JSONB, default=dict)
    stock = Column(Integer, nullable=False, default=0)
    status = Column(Text, nullable=False, default="draft")
    visible = Column(Boolean, nullable=False, default=True)
    version = Column(Integer, nullable=False, default=1)
    deleted_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())