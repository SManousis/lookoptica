# app/routers/admin_users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.admin_auth import get_current_admin_user
from app.db import SessionLocal
from app.models.user import User
# from app.models.orders import Order, OrderItem  # when you have them

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/{user_id}/export")
def export_user_data(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # When you add orders / prescriptions, include them here
    # orders = db.query(Order).filter(Order.user_id == user_id).all()

    data = {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "roles": [ur.role.name for ur in user.roles if ur.role],
        # "orders": [ ... ],
        # "prescriptions": [ ... ],
    }

    return data
    
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Example: full delete (if allowed)
    db.delete(user)
    db.commit()

    return {"ok": True}
