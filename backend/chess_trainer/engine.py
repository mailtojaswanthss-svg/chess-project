from __future__ import annotations

import atexit
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, TypeVar

import chess
import chess.engine

logger = logging.getLogger(__name__)

T = TypeVar("T")


class EngineConfigurationError(RuntimeError):
    """Raised when Stockfish cannot be started or used."""


# One Stockfish process per executable path, shared by every request.
# SimpleEngine cancels a running search when a new command arrives, so each
# search holds the engine's lock until it finishes.
_engines: dict[Path, chess.engine.SimpleEngine] = {}
_engine_locks: dict[Path, threading.Lock] = {}
_registry_lock = threading.Lock()


def _lock_for(path: Path) -> threading.Lock:
    with _registry_lock:
        return _engine_locks.setdefault(path, threading.Lock())


def _start_engine(path: Path) -> chess.engine.SimpleEngine:
    if not path.exists():
        raise EngineConfigurationError(f"Stockfish executable does not exist: {path}")
    try:
        return chess.engine.SimpleEngine.popen_uci(str(path))
    except (OSError, chess.engine.EngineError) as exc:
        raise EngineConfigurationError(f"Could not start Stockfish at {path}: {exc}") from exc


def get_engine(path: Path) -> chess.engine.SimpleEngine:
    """Return the shared engine for ``path``, starting it on first use."""
    with _registry_lock:
        engine = _engines.get(path)
        if engine is None:
            engine = _start_engine(path)
            _engines[path] = engine
        return engine


def _discard_engine(path: Path) -> None:
    with _registry_lock:
        engine = _engines.pop(path, None)
    if engine is not None:
        try:
            engine.close()
        except (chess.engine.EngineError, OSError) as exc:
            logger.warning("Could not close dead Stockfish process: %s", exc)


def shutdown_engines() -> None:
    """Quit every shared engine. Called on API shutdown and at exit."""
    with _registry_lock:
        engines = list(_engines.values())
        _engines.clear()
    for engine in engines:
        try:
            engine.quit()
        except (chess.engine.EngineError, OSError) as exc:
            logger.warning("Stockfish did not quit cleanly: %s", exc)


atexit.register(shutdown_engines)


@dataclass
class StockfishEvaluator:
    path: Path
    depth: int = 12
    _lock: threading.Lock = field(init=False, repr=False)

    def __enter__(self) -> "StockfishEvaluator":
        self.path = Path(self.path)
        get_engine(self.path)
        self._lock = _lock_for(self.path)
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        # The engine is shared and stays running for the next request.
        return None

    def _run(self, search: Callable[[chess.engine.SimpleEngine], T]) -> T:
        """Run one search on the shared engine, restarting it once if it died."""
        with self._lock:
            try:
                return search(get_engine(self.path))
            except chess.engine.EngineTerminatedError:
                logger.warning("Stockfish process died; restarting it")
                _discard_engine(self.path)
                return search(get_engine(self.path))

    def _limit(self) -> chess.engine.Limit:
        return chess.engine.Limit(depth=self.depth, time=0.35)

    def score(self, board: chess.Board) -> int:
        try:
            score = self._run(lambda engine: engine.analyse(board, self._limit())["score"])
            return int(score.pov(board.turn).score(mate_score=100000))
        except (chess.engine.EngineError, KeyError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish evaluation failed: {exc}") from exc

    def best_move(self, board: chess.Board) -> tuple[chess.Move, int]:
        try:
            result = self._run(lambda engine: engine.analyse(board, self._limit()))
            move = result["pv"][0]
            score = int(result["score"].pov(board.turn).score(mate_score=100000))
            return move, score
        except (chess.engine.EngineError, KeyError, IndexError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish move search failed: {exc}") from exc

    def candidate_moves(self, board: chess.Board, count: int = 5) -> list[tuple[chess.Move, int]]:
        try:
            results = self._run(
                lambda engine: engine.analyse(board, self._limit(), multipv=max(1, min(count, 10)))
            )
            return [
                (result["pv"][0], int(result["score"].pov(board.turn).score(mate_score=100000)))
                for result in results
            ]
        except (chess.engine.EngineError, KeyError, IndexError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish candidate search failed: {exc}") from exc


def engine_ready(path: Path | None) -> bool:
    """True when Stockfish is configured and its process is (or can be) running."""
    if path is None:
        return False
    try:
        get_engine(Path(path))
    except EngineConfigurationError:
        return False
    return True


def move_loss_centipawns(board: chess.Board, move: chess.Move, evaluator: StockfishEvaluator) -> int:
    before = evaluator.score(board)
    played = board.copy(stack=False)
    played.push(move)
    after = -evaluator.score(played)
    return max(0, before - after)
