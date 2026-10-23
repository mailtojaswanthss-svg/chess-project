from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    stockfish_path: Path | None = None
    model_path: Path = Path("models/blunder_model.joblib")
    blunder_loss_centipawns: int = 100
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
