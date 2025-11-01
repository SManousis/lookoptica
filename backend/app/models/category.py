from sqlalchemy import Column, BigInteger, Text, ForeignKey
from app.db import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(BigInteger, primary_key=True)
    title = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)
    parent_id = Column(BigInteger, ForeignKey("categories.id"))