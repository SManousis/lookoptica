# app/models/admin_audit_log.py
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db import Base
from app.models.user import User


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    action = Column(String(100), nullable=False)          # e.g. "product_create"
    resource_type = Column(String(100), nullable=False)   # e.g. "product"
    resource_id = Column(String(100), nullable=True)      # "123", "slug-123", etc.

    log_metadata = Column("metadata", JSON, nullable=True)  # extra context (dict)

    ip = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    admin = relationship("User")
