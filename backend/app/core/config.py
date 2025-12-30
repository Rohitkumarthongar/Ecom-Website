"""
Application Configuration
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    # Basic App Settings
    PROJECT_NAME: str = "BharatBazaar API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    
    # Security
    JWT_SECRET: str = "bharatbazaar-secret-key-2024"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[str] = None
    DB_NAME: Optional[str] = None
    USE_SQLITE: bool = True
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Email Settings
    EMAIL_ENABLED: bool = False
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    # Courier Settings
    DELHIVERY_TOKEN: Optional[str] = None
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    @property
    def database_url(self) -> str:
        """Get database URL based on configuration"""
        if self.USE_SQLITE or not self.DB_USER:
            return "sqlite:///./local_db.sqlite"
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def database_connect_args(self) -> dict:
        """Get database connection arguments"""
        if self.USE_SQLITE or not self.DB_USER:
            return {"check_same_thread": False}
        return {}
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Load settings from environment
ROOT_DIR = Path(__file__).parent.parent.parent
env_file = ROOT_DIR / '.env'

settings = Settings(_env_file=env_file if env_file.exists() else None)