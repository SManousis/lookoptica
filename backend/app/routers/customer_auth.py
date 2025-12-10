# app/routers/customer_auth.py
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.customer import Customer
from app.models.customer_session import CustomerSession
from app.schemas.customer_auth import CustomerRegisterRequest, CustomerLoginRequest, CustomerOut
from app.security import hash_password, verify_password
from app.services.audit import log_admin_action  # or create a generic audit, but reuse is fine
from app.services.turnstile import verify_turnstile_token
import logging
import anyio

logger = logging.getLogger("customer_auth")

router = APIRouter(
    prefix="/auth",
    tags=["customer-auth"],
)

# --------- DB dep ---------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --------- Rate limiting (IP-based) ---------
_LOGIN_ATTEMPTS: Dict[str, List[float]] = {}
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 5 * 60  # 5 minutes

def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = [t for t in _LOGIN_ATTEMPTS.get(ip, []) if now - t < WINDOW_SECONDS]
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε λίγο.",
        )
    attempts.append(now)
    _LOGIN_ATTEMPTS[ip] = attempts

# --------- Helper to get current customer from session ---------
def get_current_customer(
    request: Request,
    db: Session = Depends(get_db),
) -> Customer:
    sess_id = request.cookies.get("look_customer_sess")
    if not sess_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session = (
        db.query(CustomerSession)
        .filter(CustomerSession.id == sess_id, CustomerSession.is_active == True)
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    if session.expires_at < datetime.now(timezone.utc):
        session.is_active = False
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    customer = session.customer
    if not customer or not customer.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")

    return customer

# --------- Registration ---------
@router.post("/register", response_model=CustomerOut, status_code=201)
def customer_register(
    payload: CustomerRegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    existing = db.query(Customer).filter(Customer.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Υπάρχει ήδη λογαριασμός με αυτό το email.",
        )

    customer = Customer(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        marketing_opt_in=payload.marketing_opt_in,
        is_active=True,
        email_verified=False,  # later: send verification email
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Auto-login after register: create session + CSRF
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    session = CustomerSession(
        customer_id=customer.id,
        expires_at=expires_at,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    response.set_cookie(
        key="look_customer_sess",
        value=session.id,
        httponly=True,
        secure=False,  # True in production
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="look_customer_csrf",
        value=csrf_token,
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=24 * 60 * 60,
        path="/",
    )

    # optional: audit
    log_admin_action(
        db=db,
        admin=None,
        action="customer_register",
        resource_type="customer",
        resource_id=customer.id,
        metadata={"email": customer.email},
        request=request,
    )

    return CustomerOut(
        id=customer.id,
        email=customer.email,
        full_name=customer.full_name,
        phone=customer.phone,
        email_verified=customer.email_verified,
        marketing_opt_in=customer.marketing_opt_in,
    )

# --------- Login ---------
@router.post("/login", response_model=CustomerOut)
def customer_login(
    payload: CustomerLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    rate_limit_login(request)

     # 0) Turnstile check
    ip = request.client.host if request.client else None
    ok = anyio.run(lambda: verify_turnstile_token(payload.turnstile_token, ip)) \
         if hasattr(anyio, "run") else False
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Η επαλήθευση ασφαλείας απέτυχε. Δοκίμασε ξανά.",
        )

    # 1) find customer
    customer = db.query(Customer).filter(Customer.email == payload.email).first()
    if not customer or not customer.password_hash:
        logger.warning(
            "customer_login_failed",
            extra={
                "email": payload.email,
                "reason": "not_found_or_no_password",
                "ip": ip,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Λάθος email ή κωδικός.",
        )

    # 2) password check
    if not verify_password(payload.password, customer.password_hash):
        logger.warning(
            "customer_login_failed",
            extra={"email": payload.email, "reason": "wrong_password", "ip": ip},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Λάθος email ή κωδικός.",
        )

    # 3) active check
    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ο λογαριασμός είναι ανενεργός.",
        )

    # Update last_login
    customer.last_login_at = datetime.now(timezone.utc)
    db.add(customer)

    # create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = CustomerSession(
        customer_id=customer.id,
        expires_at=expires_at,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    response.set_cookie(
        key="look_customer_sess",
        value=session.id,
        httponly=True,
        secure=False,  # True on HTTPS
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="look_customer_csrf",
        value=csrf_token,
        httponly=False,
        secure=False,
        samesite="lax",
        max_age=24 * 60 * 60,
        path="/",
    )

    log_admin_action(
        db=db,
        admin=None,
        action="customer_login",
        resource_type="customer",
        resource_id=customer.id,
        metadata={"email": customer.email},
        request=request,
    )

    return CustomerOut(
        id=customer.id,
        email=customer.email,
        full_name=customer.full_name,
        phone=customer.phone,
        email_verified=customer.email_verified,
        marketing_opt_in=customer.marketing_opt_in,
    )

# --------- Me / Logout ---------
@router.get("/me", response_model=CustomerOut)
def customer_me(current: Customer = Depends(get_current_customer)):
    return CustomerOut(
        id=current.id,
        email=current.email,
        full_name=current.full_name,
        phone=current.phone,
        email_verified=current.email_verified,
        marketing_opt_in=current.marketing_opt_in,
    )

@router.post("/logout")
def customer_logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
    current: Customer = Depends(get_current_customer),
):
    sess_id = request.cookies.get("look_customer_sess")
    if sess_id:
        session = db.query(CustomerSession).filter(CustomerSession.id == sess_id).first()
        if session:
            session.is_active = False
            db.commit()

    response.delete_cookie("look_customer_sess", path="/")
    response.delete_cookie("look_customer_csrf", path="/")

    log_admin_action(
        db=db,
        admin=None,
        action="customer_logout",
        resource_type="customer",
        resource_id=current.id,
        metadata={"session_id": sess_id},
        request=request,
    )

    return {"ok": True}
