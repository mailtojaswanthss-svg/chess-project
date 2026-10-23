import chess
import numpy as np

from chess_trainer.analysis import analyze_pgn
from chess_trainer.model import BlunderModel


class FakeEvaluator:
    def score(self, board: chess.Board) -> int:
        return 0


class FakeClassifier:
    def predict_proba(self, features):
        return np.array([[0.8, 0.2]])


def test_analyze_pgn_returns_move_level_results():
    pgn = '[Event "fixture"]\n\n1. e4 e5 2. Nf3 *'
    result = analyze_pgn(pgn, BlunderModel(FakeClassifier()), FakeEvaluator())
    assert len(result.moves) == 3
    assert result.moves[0].san == "e4"
    assert result.moves[0].risk_band == "low"
