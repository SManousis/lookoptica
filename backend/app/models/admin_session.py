# app/models/admin_session.py
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.db import Base
from app.models.user import User


class AdminSession(Base):
    __tablename__ = "admin_sessions"

    # Store UUID as a simple string – works on Postgres + SQLite
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip = Column(String(45))
    user_agent = Column(String(255))
    is_active = Column(Boolean, nullable=False, default=True)

    user = relationship("User", back_populates="admin_sessions")
