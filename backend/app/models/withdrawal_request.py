from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db import Base


class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order_notifications.id"), nullable=False)
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="submitted")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
