from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Designer marketplace"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./shop.db"
    SECRET_KEY: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # Upload folders live inside the project (on its drive), not wherever the server is started.
    UPLOAD_DIR: str = str(PROJECT_ROOT / "uploads")
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024
    # Shirt mockups / print files. "local" writes under MEDIA_DIR and serves it at MEDIA_URL;
    # a Cloudflare R2 backend can be added in app/services/storage.py later.
    STORAGE_BACKEND: str = "local"
    MEDIA_DIR: str = str(PROJECT_ROOT / "uploads" / "media")
    MEDIA_URL: str = "/media"
    MAX_CUSTOMIZATION_BYTES: int = 40 * 1024 * 1024  # per file; a 300 DPI print PNG can be large


settings = Settings()
