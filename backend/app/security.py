
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using Argon2.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, password_hash: str) -> bool:
    """
    Verify a plain-text password against the stored hash.
    """
    return pwd_context.verify(plain_password, password_hash)
