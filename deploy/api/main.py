"""Vercel entrypoint for the ChessWise engine server.

build.py puts the backend package and a Stockfish binary next to this file. The
settings below are defaults; project environment variables override them.
"""

from __future__ import annotations

import logging
import os
import shutil
import stat
from pathlib import Path

HERE = Path(__file__).resolve().parent
logger = logging.getLogger("chesswise.vercel")


def _stockfish_path() -> Path:
    bundled = HERE / "bin" / "stockfish"
    if os.access(bundled, os.X_OK):
        return bundled
    # The bundle can lose the executable bit; /tmp is the one writable place
    runnable = Path("/tmp/stockfish")
    if not runnable.exists() and bundled.exists():
        shutil.copyfile(bundled, runnable)
        runnable.chmod(runnable.stat().st_mode | stat.S_IXUSR)
        logger.info("Copied Stockfish to %s to make it executable", runnable)
    return runnable


os.environ.setdefault("STOCKFISH_PATH", str(_stockfish_path()))
os.environ.setdefault("MODEL_PATH", str(HERE / "blunder_model.joblib"))
os.environ.setdefault(
    "FRONTEND_ORIGINS",
    ",".join(
        [
            "https://chesswise-ai.vercel.app",
            "https://chess-project-rho.vercel.app",
            "https://chess-project-jazz-and-co.vercel.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    ),
)

from chess_trainer.api import app  # noqa: E402  (settings read the env above)

__all__ = ["app"]
