from __future__ import annotations

import chess
from pydantic import BaseModel


class SquareControlDetail(BaseModel):
    square: str
    white_attackers: int
    black_attackers: int
    dominant: str  # "w", "b", "contested", "neutral"
    intensity: float  # 0.0 to 1.0


class CenterControl(BaseModel):
    white_percent: int
    black_percent: int
    contested_percent: int


class TotalInfluence(BaseModel):
    white_squares: int
    black_squares: int
    contested_squares: int
    neutral_squares: int


class TerritoryControlResponse(BaseModel):
    fen: str
    squares: dict[str, SquareControlDetail]
    center_control: CenterControl
    total_influence: TotalInfluence


def compute_territory_control(board: chess.Board) -> TerritoryControlResponse:
    squares: dict[str, SquareControlDetail] = {}
    white_sq_count = 0
    black_sq_count = 0
    contested_sq_count = 0
    neutral_sq_count = 0

    center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
    white_center_power = 0
    black_center_power = 0

    for sq in chess.SQUARES:
        sq_name = chess.square_name(sq)
        w_att = len(board.attackers(chess.WHITE, sq))
        b_att = len(board.attackers(chess.BLACK, sq))

        # Factor in piece presence on square itself alongside attackers
        occupant = board.piece_at(sq)
        w_score = w_att + (1 if occupant and occupant.color == chess.WHITE else 0)
        b_score = b_att + (1 if occupant and occupant.color == chess.BLACK else 0)

        if w_score > b_score:
            dom = "w"
            white_sq_count += 1
            diff = min(3, w_score - b_score)
            intensity = 0.35 + (diff * 0.18)
        elif b_score > w_score:
            dom = "b"
            black_sq_count += 1
            diff = min(3, b_score - w_score)
            intensity = 0.35 + (diff * 0.18)
        elif w_score > 0:
            dom = "contested"
            contested_sq_count += 1
            intensity = 0.3
        else:
            dom = "neutral"
            neutral_sq_count += 1
            intensity = 0.0

        if sq in center_squares:
            white_center_power += w_score
            black_center_power += b_score

        squares[sq_name] = SquareControlDetail(
            square=sq_name,
            white_attackers=w_att,
            black_attackers=b_att,
            dominant=dom,
            intensity=round(intensity, 2),
        )

    tot_center = white_center_power + black_center_power
    if tot_center > 0:
        w_center_pct = round((white_center_power / tot_center) * 100)
        b_center_pct = 100 - w_center_pct
        c_center_pct = 0
    else:
        w_center_pct = 50
        b_center_pct = 50
        c_center_pct = 0

    return TerritoryControlResponse(
        fen=board.fen(),
        squares=squares,
        center_control=CenterControl(
            white_percent=w_center_pct,
            black_percent=b_center_pct,
            contested_percent=c_center_pct,
        ),
        total_influence=TotalInfluence(
            white_squares=white_sq_count,
            black_squares=black_sq_count,
            contested_squares=contested_sq_count,
            neutral_squares=neutral_sq_count,
        ),
    )
