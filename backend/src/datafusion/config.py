"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "sqlite+aiosqlite:///./datafusion.db"
    api_prefix: str = "/api"
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]

    app_name: str = "DataFusion World API"
    app_version: str = "0.1.0"


settings = Settings()
