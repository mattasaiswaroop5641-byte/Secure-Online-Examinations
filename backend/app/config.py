from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "ExamShield"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "examshield-super-secure-production-ready-jwt-secret-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # Database Configuration
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/examshield.db"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "examshield_db"
    
    # Uploads & Evidence
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    EVIDENCE_DIR: Path = BASE_DIR / "uploads" / "evidence"
    
    # Proctoring thresholds (seconds)
    NO_FACE_GRACE_PERIOD_SEC: float = 3.0
    NO_FACE_WARNING_SEC: float = 8.0
    NO_FACE_CRITICAL_SEC: float = 15.0
    
    LOOKING_AWAY_GRACE_PERIOD_SEC: float = 3.0
    LOOKING_AWAY_CRITICAL_SEC: float = 8.0
    
    DEFAULT_TRUST_SCORE: int = 100
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()

# Ensure required directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
