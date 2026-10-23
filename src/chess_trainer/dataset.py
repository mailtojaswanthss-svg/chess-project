from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import chess.pgn
import numpy as np

from .engine import StockfishEvaluator, move_loss_centipawns
from .features import extract_features


@dataclass
class Dataset:
    features: np.ndarray
    labels: np.ndarray
    game_ids: np.ndarray
    player_ids: np.ndarray


def _rating(game: chess.pgn.Game) -> int:
    for key in ("WhiteElo", "BlackElo"):
        value = game.headers.get(key)
        if value and value.isdigit():
            return int(value)
    return 1200


def build_dataset(
    pgn_path: Path,
    evaluator: StockfishEvaluator,
    blunder_loss_centipawns: int = 100,
) -> Dataset:
    rows: list[np.ndarray] = []
    labels: list[int] = []
    game_ids: list[int] = []
    player_ids: list[str] = []
    with pgn_path.open("r", encoding="utf-8") as handle:
        game_index = 0
        while game := chess.pgn.read_game(handle):
            board = game.board()
            rating = _rating(game)
            for move in game.mainline_moves():
                rows.append(extract_features(board, rating))
                loss = move_loss_centipawns(board, move, evaluator)
                labels.append(int(loss >= blunder_loss_centipawns))
                game_ids.append(game_index)
                player_ids.append(
                    game.headers.get("White", "unknown")
                    if board.turn == chess.WHITE
                    else game.headers.get("Black", "unknown")
                )
                board.push(move)
            game_index += 1
    if not rows:
        raise ValueError(f"No playable moves found in PGN: {pgn_path}")
    return Dataset(
        np.vstack(rows),
        np.asarray(labels),
        np.asarray(game_ids),
        np.asarray(player_ids),
    )
