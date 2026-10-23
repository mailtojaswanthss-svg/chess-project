from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import chess
import chess.engine


class EngineConfigurationError(RuntimeError):
    """Raised when Stockfish cannot be started or used."""


@dataclass
class StockfishEvaluator:
    path: Path
    depth: int = 12

    def __enter__(self) -> "StockfishEvaluator":
        if not self.path.exists():
            raise EngineConfigurationError(f"Stockfish executable does not exist: {self.path}")
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(str(self.path))
        except (OSError, chess.engine.EngineError) as exc:
            raise EngineConfigurationError(f"Could not start Stockfish at {self.path}: {exc}") from exc
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.engine.quit()

    def score(self, board: chess.Board) -> int:
        try:
            score = self.engine.analyse(board, chess.engine.Limit(depth=self.depth))["score"]
            return int(score.pov(board.turn).score(mate_score=100000))
        except (chess.engine.EngineError, KeyError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish evaluation failed: {exc}") from exc

    def best_move(self, board: chess.Board) -> tuple[chess.Move, int]:
        try:
            result = self.engine.analyse(board, chess.engine.Limit(depth=self.depth))
            move = result["pv"][0]
            score = int(result["score"].pov(board.turn).score(mate_score=100000))
            return move, score
        except (chess.engine.EngineError, KeyError, IndexError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish move search failed: {exc}") from exc

    def candidate_moves(self, board: chess.Board, count: int = 5) -> list[tuple[chess.Move, int]]:
        try:
            results = self.engine.analyse(
                board,
                chess.engine.Limit(depth=self.depth),
                multipv=max(1, min(count, 10)),
            )
            return [
                (result["pv"][0], int(result["score"].pov(board.turn).score(mate_score=100000)))
                for result in results
            ]
        except (chess.engine.EngineError, KeyError, IndexError, TypeError) as exc:
            raise EngineConfigurationError(f"Stockfish candidate search failed: {exc}") from exc


def move_loss_centipawns(board: chess.Board, move: chess.Move, evaluator: StockfishEvaluator) -> int:
    before = evaluator.score(board)
    played = board.copy(stack=False)
    played.push(move)
    after = -evaluator.score(played)
    return max(0, before - after)
