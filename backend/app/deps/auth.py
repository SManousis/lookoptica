# app/deps/auth.py
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user import User, Role, UserRole
from app.security import verify_password  # or other if you use tokens later

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_admin_user(
    x_admin_email: str | None = Header(default=None, alias="X-Admin-Email"),
    db: Session = Depends(get_db),
):
    """
    TEMPORARY DEV helper:
    In Phase 2 we'll replace this with cookie-based session lookup.
    For now we just load user by email header (sent from your admin React app).
    """
    if not x_admin_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin auth header",
        )

    user = db.query(User).filter(User.email == x_admin_email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin user",
        )

    return user


def require_roles(*required_roles: str):
    """
    Usage: Depends(require_roles("admin", "superadmin"))
    """
    def _dependency(user: User = Depends(get_current_admin_user)):
        user_role_names = {ur.role.name for ur in user.roles if ur.role}
        if not user_role_names.intersection(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dependency
