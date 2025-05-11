from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv() # Loads variables from .env into environment

class Settings(BaseSettings):
    PROJECT_NAME: str = "SafeFlow Smart City Crowd Management"
    PROJECT_VERSION: str = "1.0.0"

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./safeflow.db")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_secret_key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD")
    ALERT_EMAIL_RECEIVER: str = os.getenv("ALERT_EMAIL_RECEIVER")

    # Telegram
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID")
    
    # YOLO
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")

    DEFAULT_AREA_SQ_METERS: float = float(os.getenv("DEFAULT_AREA_SQ_METERS", 20.0))
    DEFAULT_CAMERA_ID: int = int(os.getenv("DEFAULT_CAMERA_ID", 0))


    class Config:
        case_sensitive = True
        # env_file = ".env" # Pydantic can also load from .env directly if dotenv isn't used explicitly

settings = Settings()
