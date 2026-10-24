from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_default_model_path() -> Path:
    ml_path = Path("ml/models/blunder_model.joblib")
    legacy_path = Path("models/blunder_model.joblib")
    if ml_path.exists():
        return ml_path
    if legacy_path.exists():
        return legacy_path
    return ml_path


class Settings(BaseSettings):
    stockfish_path: Path | None = None
    model_path: Path = _get_default_model_path()
    blunder_loss_centipawns: int = 100
    # The live demo is listed so a player can point it at the engine on their own computer
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://chesswise-ai.vercel.app"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
