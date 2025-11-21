# app/deps/admin_auth.py
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user import User
from app.models.admin_session import AdminSession


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_admin_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    sess_id = request.cookies.get("look_admin_sess")
    if not sess_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    now = datetime.now(timezone.utc)

    session = (
        db.query(AdminSession)
        .filter(
            AdminSession.id == sess_id,
            AdminSession.is_active.is_(True),
            AdminSession.expires_at > now,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid",
        )

    user = db.query(User).get(session.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Verify admin role
    role_names = [ur.role.name for ur in user.roles if ur.role]
    if "superadmin" not in role_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed",
        )

    return user
