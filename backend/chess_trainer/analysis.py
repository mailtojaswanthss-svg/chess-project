from __future__ import annotations

import math
from dataclasses import dataclass
from io import StringIO

import chess
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
    classification: str = "good"
    badge_symbol: str = "○"


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

    @property
    def caps_accuracy(self) -> dict[str, float]:
        white_moves = [m for m in self.moves if m.player == "White"]
        black_moves = [m for m in self.moves if m.player == "Black"]

        def calc_caps(ms: list[MoveAnalysis]) -> float:
            if not ms:
                return 100.0
            accs = [100.0 * math.exp(-0.0035 * max(0, m.evaluation_loss_centipawns)) for m in ms]
            return round(sum(accs) / len(accs), 1)

        return {
            "white": calc_caps(white_moves),
            "black": calc_caps(black_moves),
        }

    @property
    def performance_rating(self) -> dict[str, int]:
        caps = self.caps_accuracy
        white_moves = [m for m in self.moves if m.player == "White"]
        black_moves = [m for m in self.moves if m.player == "Black"]

        def calc_perf(cap_val: float, ms: list[MoveAnalysis]) -> int:
            if not ms:
                return 1500
            avg_loss = sum(m.evaluation_loss_centipawns for m in ms) / len(ms)
            raw = 600 + (cap_val * 22) - (avg_loss * 2)
            return max(400, min(3100, int(round(raw))))

        return {
            "white": calc_perf(caps["white"], white_moves),
            "black": calc_perf(caps["black"], black_moves),
        }

    @property
    def badge_counts(self) -> dict[str, dict[str, int]]:
        counts: dict[str, dict[str, int]] = {
            "white": {"brilliant": 0, "great": 0, "best": 0, "good": 0, "book": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0},
            "black": {"brilliant": 0, "great": 0, "best": 0, "good": 0, "book": 0, "inaccuracy": 0, "mistake": 0, "blunder": 0},
        }
        for m in self.moves:
            color = "white" if m.player == "White" else "black"
            cls = m.classification
            if cls in counts[color]:
                counts[color][cls] += 1
            else:
                counts[color]["good"] += 1
        return counts


def risk_band(probability: float) -> str:
    if probability >= 0.65:
        return "high"
    if probability >= 0.35:
        return "medium"
    return "low"


def _classify_move(
    board: chess.Board,
    move: chess.Move,
    loss: int,
    ply: int,
    danger_prob: float,
) -> tuple[str, str]:
    """Return (classification, badge_symbol)."""
    # Book move in opening
    if ply <= 6 and loss <= 25:
        return "book", "📖"

    if loss <= 15:
        # Check for brilliant sacrifice: moved piece into an attacked square where material is genuinely sacrificed
        moving_piece = board.piece_at(move.from_square)
        if moving_piece and moving_piece.piece_type in (chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT):
            captured_piece = board.piece_at(move.to_square)
            piece_vals = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 100}
            captured_val = piece_vals[captured_piece.piece_type] if captured_piece else 0
            moving_val = piece_vals[moving_piece.piece_type]
            net_sac = moving_val - captured_val

            if net_sac > 0:
                enemy_attackers = list(board.attackers(not board.turn, move.to_square))
                friendly_defenders = list(board.attackers(board.turn, move.to_square))
                is_sac = False
                if enemy_attackers:
                    if not friendly_defenders:
                        is_sac = True
                    else:
                        enemy_pieces = [board.piece_at(sq) for sq in enemy_attackers]
                        attacker_types = [p.piece_type for p in enemy_pieces if p]
                        if chess.PAWN in attacker_types and moving_piece.piece_type != chess.PAWN:
                            is_sac = True
                        elif moving_piece.piece_type == chess.QUEEN and any(pt in (chess.KNIGHT, chess.BISHOP, chess.ROOK) for pt in attacker_types):
                            is_sac = True
                        elif moving_piece.piece_type == chess.ROOK and any(pt in (chess.KNIGHT, chess.BISHOP) for pt in attacker_types):
                            is_sac = True
                if is_sac:
                    return "brilliant", "!!"
        if danger_prob >= 0.55 and loss == 0:
            return "great", "!"
        return "best", "★"

    if loss <= 40:
        return "good", "○"
    if loss <= 90:
        return "inaccuracy", "?!"
    if loss <= 200:
        return "mistake", "?"
    return "blunder", "??"


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
        classification, badge = _classify_move(board, move, loss, ply, probability)
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
                classification=classification,
                badge_symbol=badge,
            )
        )
        board.push(move)
    if not moves:
        raise ValueError("PGN contains no playable moves")
    return GameAnalysis(dict(game.headers), moves)
