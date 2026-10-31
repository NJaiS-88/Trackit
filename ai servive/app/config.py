"""Settings read from environment variables or a local .env file."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Google AI Studio key: https://aistudio.google.com/app/apikey
    google_api_key: str = Field(default="", alias="GOOGLE_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    # Lower is more focused and repeatable; higher is more varied
    gemini_temperature: float = Field(default=0.2, ge=0.0, le=2.0, alias="GEMINI_TEMPERATURE")
    gemini_timeout_seconds: float = Field(default=60.0, gt=0, alias="GEMINI_TIMEOUT_SECONDS")

    # When set, every /api request must send it in the X-Service-Token header (the Spring backend does)
    service_token: str = Field(default="", alias="SERVICE_TOKEN")
    # Comma-separated origins allowed to call the service from a browser; empty means none
    cors_allowed_origins: str = Field(default="", alias="CORS_ALLOWED_ORIGINS")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
