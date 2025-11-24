# app/schemas/customer_auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    marketing_opt_in: bool = False

class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str

class CustomerOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email_verified: bool
    marketing_opt_in: bool

    class Config:
        from_attributes = True  # Pydantic v2
