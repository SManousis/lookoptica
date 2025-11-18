# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import List


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True


class UserOut(UserBase):
    id: int
    roles: List[str] = []

    class Config:
        from_attributes = True  # for SQLAlchemy -> Pydantic v2


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminCreateSuperUser(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    full_name: str | None = None
    secret_code: str  # to prevent random people from creating superadmin
