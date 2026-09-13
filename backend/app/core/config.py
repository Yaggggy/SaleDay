from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SaleDay API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = (
        "mysql+pymysql://saleday:saleday@mysql:3306/saleday?charset=utf8mb4"
    )

    # Security / JWT
    SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Cookies
    COOKIE_DOMAIN: str | None = None
    COOKIE_SECURE: bool = False  # set True behind HTTPS in production
    ACCESS_COOKIE_NAME: str = "saleday_access"
    REFRESH_COOKIE_NAME: str = "saleday_refresh"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Public app URL used for QR code target links
    PUBLIC_APP_URL: str = "http://localhost:5173"

    # File storage (local disk for dev; swap for S3-compatible in prod)
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 8

    # Rate limiting
    RATE_LIMIT_AUTH: str = "10/minute"
    RATE_LIMIT_PUBLIC: str = "120/minute"
    RATE_LIMIT_DEFAULT: str = "200/minute"

    # Outbound email (team invitations). If SMTP_HOST is empty, emails are
    # logged instead of sent — safe no-op default for local/dev environments.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = "no-reply@saleday.app"
    SMTP_FROM_NAME: str = "SaleDay"
    SMTP_TIMEOUT_SECONDS: int = 10

    # Bulk item import
    BULK_IMPORT_MAX_ROWS: int = 500
    BULK_IMPORT_MAX_FILE_MB: int = 5

    @property
    def EMAIL_ENABLED(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_FROM_EMAIL)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
