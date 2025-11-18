# app/routers/admin_auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.user import User, Role, UserRole
from app.schemas.auth import (
    AdminLoginRequest,
    AdminCreateSuperUser,
    UserOut,
)
from app.security import hash_password, verify_password
from app.config import settings  # your Settings with hmac_secret

router = APIRouter(
    prefix="/api/admin/auth",
    tags=["admin-auth"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_or_create_role(db: Session, name: str, description: str = "") -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if not role:
        role = Role(name=name, description=description)
        db.add(role)
        db.commit()
        db.refresh(role)
    return role


@router.post("/init-superadmin", response_model=UserOut)
def init_superadmin(
    payload: AdminCreateSuperUser,
    db: Session = Depends(get_db),
):
    """
    One-time endpoint to create the first superadmin.
    Protected by settings.hmac_secret so random people can't call it.
    """

    # 1) Simple shared-secret check
    if payload.secret_code != settings.hmac_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid secret code",
        )

    # 2) Ensure superadmin role exists
    superadmin_role = _get_or_create_role(db, "superadmin", "Full access admin")

    # 3) Check if any superadmin already exists
    existing_superadmin = (
        db.query(User)
        .join(UserRole, User.id == UserRole.user_id)
        .filter(UserRole.role_id == superadmin_role.id)
        .first()
    )
    if existing_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Superadmin already exists",
        )

    # 4) Ensure email not already used
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already in use",
        )

    # 5) Create user
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 6) Attach superadmin role
    link = UserRole(user_id=user.id, role_id=superadmin_role.id)
    db.add(link)
    db.commit()

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=["superadmin"],
    )


@router.post("/login", response_model=UserOut)
def admin_login(
    payload: AdminLoginRequest,
    db: Session = Depends(get_db),
):
    """
    Phase 1: simple login returning user+roles.
    Later we'll attach sessions, cookies, 2FA.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    role_names = [ur.role.name for ur in user.roles if ur.role]

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=role_names,
    )
