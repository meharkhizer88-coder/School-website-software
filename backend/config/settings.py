from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    app_name: str = "School Enterprise Platform"
    app_env: str = "development"
    app_version: str = "1.0.0"
    api_prefix: str = "/api"
    postgres_dsn: str = "postgresql://postgres:postgres@localhost:5432/school"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    allowed_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="SCHOOL_", extra="ignore")


@lru_cache
def get_settings() -> AppSettings:
    return AppSettings()
