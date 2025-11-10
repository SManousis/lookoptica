from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
# from app.config import settings
import os


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://lookuser:lookpass@localhost:5432/lookdb")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass