"""Configuración del servicio ML"""
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        protected_namespaces=(),
    )

    # Database
    db_host: str = "mysql"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "clinicitabd"

    # MLflow
    mlflow_tracking_uri: str = "http://mlflow:5000"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Model
    model_dir: str = "/models"

settings = Settings()