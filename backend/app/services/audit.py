# app/services/audit.py
from typing import Any, Mapping

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User


def log_admin_action(
    db: Session,
    admin: User | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: Mapping[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    ip = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None

    log = AdminAuditLog(
        admin_id=admin.id if admin else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        log_metadata=dict(metadata) if metadata else None,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(log)
    db.commit()
