from sqlalchemy import Column, BigInteger, Text
from app.db import Base

class Brand(Base):
    __tablename__ = "brands"
    id = Column(BigInteger, primary_key=True)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)

