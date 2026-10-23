from __future__ import annotations

from dataclasses import dataclass
from io import StringIO

import chess.pgn

from .engine import StockfishEvaluator, move_loss_centipawns
from .model import BlunderModel
from .features import extract_features


@dataclass
class MoveAnalysis:
    ply: int
    move_number: int
    player: str
    san: str
    uci: str
    fen: str
    probability: float
    risk_band: str
    evaluation_loss_centipawns: int
    is_blunder: bool


@dataclass
class GameAnalysis:
    headers: dict[str, str]
    moves: list[MoveAnalysis]

    @property
    def blunder_count(self) -> int:
        return sum(move.is_blunder for move in self.moves)

    @property
    def high_risk_count(self) -> int:
        return sum(move.risk_band == "high" for move in self.moves)


def risk_band(probability: float) -> str:
    if probability >= 0.65:
        return "high"
    if probability >= 0.35:
        return "medium"
    return "low"


def analyze_pgn(
    pgn_text: str,
    model: BlunderModel,
    evaluator: StockfishEvaluator,
    rating: int = 1200,
    blunder_loss_centipawns: int = 100,
) -> GameAnalysis:
    game = chess.pgn.read_game(StringIO(pgn_text))
    if game is None:
        raise ValueError("PGN does not contain a playable game")
    board = game.board()
    moves: list[MoveAnalysis] = []
    for ply, move in enumerate(game.mainline_moves(), start=1):
        fen = board.fen()
        san = board.san(move)
        probability = model.predict_probability(extract_features(board, rating))
        loss = move_loss_centipawns(board, move, evaluator)
        moves.append(
            MoveAnalysis(
                ply=ply,
                move_number=(ply + 1) // 2,
                player="White" if ply % 2 else "Black",
                san=san,
                uci=move.uci(),
                fen=fen,
                probability=probability,
                risk_band=risk_band(probability),
                evaluation_loss_centipawns=loss,
                is_blunder=loss >= blunder_loss_centipawns,
            )
        )
        board.push(move)
    if not moves:
        raise ValueError("PGN contains no playable moves")
    return GameAnalysis(dict(game.headers), moves)
