from __future__ import annotations

import chess
import numpy as np

FEATURE_NAMES = (
    "rating",
    "side_to_move",
    "material_balance",
    "legal_move_count",
    "is_check",
    "has_castling_rights",
    "halfmove_clock",
    "white_pawns",
    "black_pawns",
    "white_king_safety",
    "black_king_safety",
    "hanging_pieces",
    "opponent_legal_move_count",
    "major_piece_balance",
)


def _material(board: chess.Board, color: chess.Color) -> int:
    values = {
        chess.PAWN: 100,
        chess.KNIGHT: 320,
        chess.BISHOP: 330,
        chess.ROOK: 500,
        chess.QUEEN: 900,
        chess.KING: 0,
    }
    return sum(
        len(board.pieces(piece_type, color)) * value
        for piece_type, value in values.items()
    )


def extract_features(board: chess.Board, rating: int) -> np.ndarray:
    """Return the documented numeric feature vector for a position."""
    white_material = _material(board, chess.WHITE)
    black_material = _material(board, chess.BLACK)
    hanging_pieces = 0
    for square, piece in board.piece_map().items():
        if piece.piece_type == chess.KING:
            continue
        enemy_attackers = board.attackers(not piece.color, square)
        own_defenders = board.attackers(piece.color, square)
        if enemy_attackers and not own_defenders:
            hanging_pieces += 1
    opponent_board = board.copy(stack=False)
    opponent_board.turn = not board.turn
    return np.array(
        [
            rating,
            int(board.turn == chess.WHITE),
            (white_material - black_material) * (1 if board.turn == chess.WHITE else -1),
            board.legal_moves.count(),
            int(board.is_check()),
            int(board.has_castling_rights(board.turn)),
            board.halfmove_clock,
            len(board.pieces(chess.PAWN, chess.WHITE)),
            len(board.pieces(chess.PAWN, chess.BLACK)),
            len(board.attackers(chess.WHITE, board.king(chess.WHITE) or chess.E4)),
            len(board.attackers(chess.BLACK, board.king(chess.BLACK) or chess.E5)),
            hanging_pieces,
            opponent_board.legal_moves.count(),
            (
                len(board.pieces(chess.QUEEN, chess.WHITE))
                + len(board.pieces(chess.ROOK, chess.WHITE))
                - len(board.pieces(chess.QUEEN, chess.BLACK))
                - len(board.pieces(chess.ROOK, chess.BLACK))
            ) * (1 if board.turn == chess.WHITE else -1),
        ],
        dtype=float,
    )
