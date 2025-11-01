from pydantic import BaseModel
import os


class Settings(BaseModel):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+psycopg://lookuser:lookpass@localhost:5433/lookdb")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    hmac_secret: str = os.getenv("HMAC_SECRET", "change-me")
    app_env: str = os.getenv("APP_ENV", "dev")


settings = Settings()