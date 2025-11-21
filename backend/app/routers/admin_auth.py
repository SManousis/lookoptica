# app/routers/admin_auth.py
import pyotp
import secrets
from pydantic import BaseModel
from typing import Optional

from app.deps.admin_auth import get_current_admin_user
from app.services.audit import log_admin_action
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from app.models.admin_session import AdminSession
from app.db import SessionLocal
from app.models.user import User, Role, UserRole
from app.schemas.auth import (
    AdminLoginRequest,
    AdminCreateSuperUser,
    UserOut,
)
from app.security import hash_password, verify_password
from app.config import settings  # your Settings with hmac_secret

import logging
logger = logging.getLogger("admin_auth")


router = APIRouter(
    prefix="/api/admin/auth",
    tags=["admin-auth"],
)


class Start2FAResponse(BaseModel):
    otpauth_url: str
    secret_preview: str


class Confirm2FARequest(BaseModel):
    code: str


class AdminLoginResponse(BaseModel):
    user: UserOut
    csrf_token: str

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
    request: Request,
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

    log_admin_action(
        db=db,
        admin=None,
        action="admin_init_superadmin",
        resource_type="user",
        resource_id=user.id,
        metadata={"email": user.email, "roles": ["superadmin"]},
        request=request,
    )

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=["superadmin"],
    )


# ------------------- Rate limiting helper -------------------

_LOGIN_ATTEMPTS: Dict[str, List[float]] = {}
MAX_ATTEMPTS = 5          # allowed attempts
WINDOW_SECONDS = 5 * 60   # 5 minutes


def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()

    # keep only attempts within the window
    attempts = [t for t in _LOGIN_ATTEMPTS.get(ip, []) if now - t < WINDOW_SECONDS]

    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts, please try again later.",
        )

    attempts.append(now)
    _LOGIN_ATTEMPTS[ip] = attempts


# ------------------- Phase 2 login (session + cookie) -------------------
@router.post("/login", response_model=AdminLoginResponse)
def admin_login(
    payload: AdminLoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Phase 2: login with sessions + HttpOnly cookie + optional 2FA.
    """
    # 1. rate limit
    rate_limit_login(request)

    # 2. find user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active:
        logger.warning(
            "admin_login_failed",
            extra={
                "email": payload.email,
                "reason": "user_not_found_or_inactive",
                "ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 3. password check
    if not verify_password(payload.password, user.password_hash):
        logger.warning(
            "admin_login_failed",
            extra={
                "email": payload.email,
                "reason": "wrong_password",
                "ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # 4. collect roles & ensure user is allowed in admin
    role_names = [ur.role.name for ur in user.roles if ur.role]
    if "superadmin" not in role_names:
        logger.warning(
            "admin_login_forbidden",
            extra={
                "email": user.email,
                "reason": "missing_superadmin_role",
                "ip": request.client.host if request.client else None,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access admin",
        )

    # 5. 🔐 2FA check (only if enabled)
    if user.is_totp_enabled:
        # missing OTP
        if not payload.otp:
            logger.warning(
                "admin_login_failed",
                extra={
                    "email": user.email,
                    "reason": "missing_otp",
                    "ip": request.client.host if request.client else None,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA code required",
            )

        if not user.totp_secret:
            logger.error(
                "admin_login_totp_misconfigured",
                extra={
                    "email": user.email,
                    "reason": "totp_secret_missing",
                    "ip": request.client.host if request.client else None,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA misconfigured for this account",
            )

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(payload.otp, valid_window=1):
            logger.warning(
                "admin_login_failed",
                extra={
                    "email": user.email,
                    "reason": "wrong_otp",
                    "ip": request.client.host if request.client else None,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code",
            )

    # 6. create session
    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)

    session = AdminSession(
        user_id=user.id,
        expires_at=expires_at,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 7. set cookies (session + CSRF)
    response.set_cookie(
        key="look_admin_sess",
        value=session.id,
        httponly=True,
        secure=False,  # True in production with HTTPS
        samesite="lax",
        max_age=8 * 60 * 60,
        path="/",
    )

    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="look_admin_csrf",
        value=csrf_token,
        httponly=False,  # must be readable by frontend to send header
        secure=False,
        samesite="lax",
        max_age=24 * 60 * 60,  # 1 day CSRF lifetime
        path="/",
    )

    user_payload = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        roles=role_names,
    )

    logger.info(
        "admin_login_success",
        extra={
            "email": user.email,
            "ip": request.client.host if request.client else None,
        },
    )

    log_admin_action(
        db=db,
        admin=user,
        action="admin_login",
        resource_type="session",
        resource_id=session.id,
        metadata={"user_id": user.id, "roles": role_names},
        request=request,
    )

    return AdminLoginResponse(user=user_payload, csrf_token=csrf_token)

# ------------------- Session helpers -------------------


@router.get("/me", response_model=UserOut)
def admin_me(current_admin: User = Depends(get_current_admin_user)):
    role_names = [ur.role.name for ur in current_admin.roles if ur.role]
    return UserOut(
        id=current_admin.id,
        email=current_admin.email,
        full_name=current_admin.full_name,
        is_active=current_admin.is_active,
        roles=role_names,
    )


@router.post("/logout")
def admin_logout(
    response: Response,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    sess_id = request.cookies.get("look_admin_sess")
    session_found = False
    if sess_id:
        session = db.query(AdminSession).filter(AdminSession.id == sess_id).first()
        if session:
            session.is_active = False
            db.commit()
            session_found = True

    # clear cookie on client
    response.delete_cookie("look_admin_sess", path="/")
    response.delete_cookie("look_admin_csrf", path="/")

    log_admin_action(
        db=db,
        admin=current_admin,
        action="admin_logout",
        resource_type="session",
        resource_id=sess_id,
        metadata={"session_found": session_found},
        request=request,
    )

    return {"ok": True}


@router.post("/2fa/start", response_model=Start2FAResponse)
def start_2fa(
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Start 2FA setup: generate a TOTP secret and return otpauth URL.
    Admin must be logged in already.
    """
    # generate secret
    secret = pyotp.random_base32()

    current_admin.totp_secret = secret
    current_admin.is_totp_enabled = False  # will be set to True after confirm
    db.add(current_admin)
    db.commit()
    db.refresh(current_admin)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="admin_2fa_start",
        resource_type="user",
        resource_id=current_admin.id,
        metadata={"is_totp_enabled": False},
        request=request,
    )

    totp = pyotp.TOTP(secret)
    otpauth_url = totp.provisioning_uri(
        name=current_admin.email,
        issuer_name="Look Optica Admin",
    )

    return Start2FAResponse(
        otpauth_url=otpauth_url,
        secret_preview=secret[:4] + "****",
    )

@router.post("/2fa/confirm")
def confirm_2fa(
    payload: Confirm2FARequest,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Confirm 2FA by verifying the TOTP code from the authenticator app.
    """
    if not current_admin.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not initialized",
        )

    totp = pyotp.TOTP(current_admin.totp_secret)
    # valid_window=1 allows slight clock drift
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code",
        )

    current_admin.is_totp_enabled = True
    db.add(current_admin)
    db.commit()

    log_admin_action(
        db=db,
        admin=current_admin,
        action="admin_2fa_confirm",
        resource_type="user",
        resource_id=current_admin.id,
        metadata={"is_totp_enabled": True},
        request=request,
    )

    return {"ok": True}
