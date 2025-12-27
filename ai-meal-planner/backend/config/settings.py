from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # API Keys
    gemini_api_key: str
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8008
    debug: bool = False
    reload: bool = False
    
    # Model Configuration
    gemini_model: str = "gemini-2.0-flash-exp"
    temperature: float = 0.7
    
    # Application Settings
    meal_plan_days: int = 3
    price_threshold_eur: float = 8.0
    
    # Store Configuration
    barbora_url: str = "https://www.barbora.lt/"
    supported_stores: list[str] = ["barbora", "rimi", "maxima"]
    
    # CORS
    cors_origins: list[str] = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "chrome-extension://*"
    ]


settings = Settings()
