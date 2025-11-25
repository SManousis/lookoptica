# app/schemas/customer_auth.py
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
import re

PASSWORD_REGEX = re.compile(
    r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$"
)

class CustomerRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(
        min_length=8,
        description="Min 8 chars, must include letter, number & symbol",
    )
    password_confirm: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    marketing_opt_in: bool = False

    @model_validator(mode="after")
    def validate_passwords(self) -> "CustomerRegisterRequest":
        if self.password != self.password_confirm:
            raise ValueError("Passwords do not match")

        if not PASSWORD_REGEX.match(self.password):
            raise ValueError(
                "Password must be at least 8 characters and include "
                "at least one letter, one number and one symbol."
            )
        return self


class CustomerLoginRequest(BaseModel):
    email: EmailStr
    password: str
    turnstile_token: str

class CustomerOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email_verified: bool
    marketing_opt_in: bool

    class Config:
        from_attributes = True  # Pydantic v2
