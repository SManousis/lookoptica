from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from app.db import Base


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
