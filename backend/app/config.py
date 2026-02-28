from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://lookuser:lookpass@localhost:5433/lookdb"
    redis_url: str = "redis://localhost:6379/0"
    hmac_secret: str = "change-me"
    app_env: str = "dev"
    product_image_dir: str = "/var/www/eshop_frontend/media/uploads/images"
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_tls: bool = Field(default=False)
    smtp_ssl: bool = Field(default=False)
    smtp_from: str | None = None
    smtp_from_name: str | None = None
    contact_to_email: str | None = None
    turnstile_secret_key: str | None = None
    turnstile_site_key: str | None = None
    viva_env: str = "production"
    viva_client_id: str = ""
    viva_client_secret: str = ""
    viva_source_code: str = ""
    viva_success_url: str = ""
    viva_fail_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
