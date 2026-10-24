from contextlib import asynccontextmanager
from dataclasses import dataclass, field
import logging
from pathlib import Path
import math

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .analysis import analyze_pgn, risk_band
from .engine import EngineConfigurationError, StockfishEvaluator, engine_ready, shutdown_engines
from .features import extract_features
from .model import BlunderModel
from .maia import MaiaConfigurationError, MaiaEngine, maia_installed
from .territory import compute_territory_control, TerritoryControlResponse
from .profiler import compute_blunder_dna, BlunderDnaResponse, DnaGame
from .traps import get_all_traps, get_trap_by_id, TrapDrill
from .coach import CoachExplanation, build_tactical_context, generate_agentic_coach_advice

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cache singleton Random Forest model on application startup
    if settings.model_path.exists():
        try:
            get_blunder_model()
            logger.info("BlunderModel singleton pre-cached successfully on startup.")
        except Exception as exc:
            logger.warning(f"Could not pre-cache BlunderModel on startup: {exc}")
    # Verify engine configurations (non-fatal warning if absent)
    if settings.stockfish_path and not settings.stockfish_path.exists():
        logger.warning(f"Stockfish executable not found at configured path: {settings.stockfish_path}")
    yield
    shutdown_engines()


app = FastAPI(title="Chess Blunder Trainer", version="0.1.0", lifespan=lifespan)
allowed_origins = [origin.strip() for origin in settings.frontend_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PredictionRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=400, le=3000)


class PredictionResponse(BaseModel):
    blunder_probability: float
    rating: int
    fen: str
    risk_band: str
    model_samples: int | None = None
    decision_threshold: float | None = None


class MoveRequest(BaseModel):
    fen: str
    strength: int = Field(default=8, ge=1, le=20)


class MoveResponse(BaseModel):
    fen: str
    uci: str
    san: str
    evaluation_centipawns: int


class TrapMoveRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=400, le=3000)
    tolerance_centipawns: int = Field(default=50, ge=0, le=500)


class TrapMoveResponse(MoveResponse):
    predicted_blunder_probability: float
    evaluation_loss_centipawns: int
    candidate_count: int


class MaiaMoveRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=600, le=2600)


@app.post("/maia-move", response_model=MoveResponse)
def maia_move(request: MaiaMoveRequest) -> MoveResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc
    if board.is_game_over():
        raise HTTPException(status_code=422, detail="The game is already over")
    try:
        selected_move = MaiaEngine().choose_move(board, request.rating)
        san = board.san(selected_move)
        board.push(selected_move)
    except MaiaConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return MoveResponse(fen=board.fen(), uci=selected_move.uci(), san=san, evaluation_centipawns=0)


def _risk_band(probability: float) -> str:
    return risk_band(probability)


_model_instance: BlunderModel | None = None


def get_blunder_model() -> BlunderModel:
    global _model_instance
    if _model_instance is None:
        if not settings.model_path.exists():
            raise HTTPException(status_code=503, detail=f"Model not found: {settings.model_path}")
        try:
            _model_instance = BlunderModel.load(Path(settings.model_path))
        except (OSError, ValueError, KeyError) as exc:
            raise HTTPException(status_code=500, detail=f"Could not load model: {exc}") from exc
    return _model_instance


@app.get("/health")
def health() -> dict[str, object]:
    model_samples = None
    model_metrics = None
    if settings.model_path.exists():
        try:
            metadata = get_blunder_model().metadata
            model_samples = metadata.get("train_samples")
            model_metrics = metadata.get("metrics")
        except (OSError, ValueError, KeyError):
            model_samples = None
            model_metrics = None
    return {
        "status": "ok",
        "model_loaded": settings.model_path.exists(),
        "model_train_samples": model_samples,
        "model_metrics": model_metrics,
        "engine_ready": engine_ready(settings.stockfish_path),
        "maia_available": maia_installed(),
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc
    if not settings.model_path.exists():
        raise HTTPException(status_code=503, detail=f"Model not found: {settings.model_path}")
    try:
        model = get_blunder_model()
        probability = model.predict_probability(extract_features(board, request.rating))
    except (OSError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not load model: {exc}") from exc
    return PredictionResponse(
        blunder_probability=probability,
        rating=request.rating,
        fen=request.fen,
        risk_band=_risk_band(probability),
        model_samples=model.metadata.get("train_samples") if model.metadata else None,
        decision_threshold=model.metadata.get("metrics", {}).get("decision_threshold") if model.metadata else None,
    )


@app.post("/move", response_model=MoveResponse)
def move(request: MoveRequest) -> MoveResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc
    if board.is_game_over():
        raise HTTPException(status_code=422, detail="The game is already over")
    if settings.stockfish_path is None:
        raise HTTPException(status_code=503, detail="Stockfish path is not configured")
    depth = max(4, min(14, 4 + request.strength // 2))
    try:
        with StockfishEvaluator(settings.stockfish_path, depth=depth) as evaluator:
            selected_move, score = evaluator.best_move(board)
            san = board.san(selected_move)
    except (OSError, EngineConfigurationError) as exc:
        raise HTTPException(status_code=503, detail=f"Could not calculate a move: {exc}") from exc
    eval_white = score if board.turn == chess.WHITE else -score
    board.push(selected_move)
    return MoveResponse(
        fen=board.fen(),
        uci=selected_move.uci(),
        san=san,
        evaluation_centipawns=eval_white,
    )


@app.post("/trap-move", response_model=TrapMoveResponse)
def trap_move(request: TrapMoveRequest) -> TrapMoveResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc
    if board.is_game_over():
        raise HTTPException(status_code=422, detail="The game is already over")
    if settings.stockfish_path is None:
        raise HTTPException(status_code=503, detail="Stockfish path is not configured")
    if not settings.model_path.exists():
        raise HTTPException(status_code=503, detail=f"Model not found: {settings.model_path}")
    try:
        model = get_blunder_model()
        with StockfishEvaluator(settings.stockfish_path, depth=8) as evaluator:
            candidates = evaluator.candidate_moves(board)
            if not candidates:
                raise EngineConfigurationError("Stockfish returned no candidate moves")
            best_score = candidates[0][1]
            eligible = [
                (candidate, score)
                for candidate, score in candidates
                if best_score - score <= request.tolerance_centipawns
            ]
            def next_position_probability(item: tuple[chess.Move, int]) -> float:
                candidate_board = board.copy(stack=False)
                candidate_board.push(item[0])
                return model.predict_probability(extract_features(candidate_board, request.rating))

            chosen_move, chosen_score = max(eligible, key=next_position_probability)
            next_board = board.copy(stack=False)
            next_board.push(chosen_move)
            probability = model.predict_probability(extract_features(next_board, request.rating))
            san = board.san(chosen_move)
            eval_white = chosen_score if board.turn == chess.WHITE else -chosen_score
    except (OSError, ValueError, KeyError, EngineConfigurationError) as exc:
        raise HTTPException(status_code=503, detail=f"Could not calculate trap move: {exc}") from exc
    return TrapMoveResponse(
        fen=next_board.fen(),
        uci=chosen_move.uci(),
        san=san,
        evaluation_centipawns=eval_white,
        predicted_blunder_probability=probability,
        evaluation_loss_centipawns=best_score - chosen_score,
        candidate_count=len(candidates),
    )


class GameAnalysisRequest(BaseModel):
    pgn_text: str = Field(min_length=1, max_length=500_000)
    rating: int = Field(default=1200, ge=400, le=3000)


class MoveAnalysisResponse(BaseModel):
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


class GameAnalysisResponse(BaseModel):
    headers: dict[str, str]
    moves: list[MoveAnalysisResponse]
    blunder_count: int
    high_risk_count: int
    caps_accuracy: dict[str, float] = Field(default_factory=dict)
    performance_rating: dict[str, int] = Field(default_factory=dict)
    badge_counts: dict[str, dict[str, int]] = Field(default_factory=dict)


@app.post("/analyze-game", response_model=GameAnalysisResponse)
def analyze_game(request: GameAnalysisRequest) -> GameAnalysisResponse:
    if not settings.model_path.exists():
        raise HTTPException(status_code=503, detail=f"Model not found: {settings.model_path}")
    if settings.stockfish_path is None:
        raise HTTPException(status_code=503, detail="Stockfish path is not configured")
    try:
        model = get_blunder_model()
        with StockfishEvaluator(settings.stockfish_path, depth=8) as evaluator:
            result = analyze_pgn(
                request.pgn_text,
                model,
                evaluator,
                rating=request.rating,
                blunder_loss_centipawns=settings.blunder_loss_centipawns,
            )
    except (OSError, ValueError, KeyError, EngineConfigurationError) as exc:
        raise HTTPException(status_code=422, detail=f"Could not analyze PGN: {exc}") from exc
    return GameAnalysisResponse(
        headers=result.headers,
        moves=[MoveAnalysisResponse(**move.__dict__) for move in result.moves],
        blunder_count=result.blunder_count,
        high_risk_count=result.high_risk_count,
        caps_accuracy=result.caps_accuracy,
        performance_rating=result.performance_rating,
        badge_counts=result.badge_counts,
    )


PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 100,
}


class ThreatItem(BaseModel):
    square: str
    piece: str
    motif: str
    description: str


class CandidateMove(BaseModel):
    san: str
    uci: str
    # Side to move's point of view
    centipawns: int
    loss_centipawns: int
    # Chance the opponent blunders in the position after this move; None without a model
    blunder_probability: float | None
    classification: str


class TacticalAnalysisRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=400, le=3000)


class TacticalAnalysisResponse(BaseModel):
    fen: str
    side_to_move: str
    # Chance the side to move plays a move losing >= blunder_loss_centipawns; None without a model
    overall_blunder_probability: float | None
    risk_band: str | None
    threats: list[ThreatItem]
    candidate_moves: list[CandidateMove]
    coach_explanation: str
    # Estimated from the engine eval (see _calculate_win_chances); None without an engine
    win_chances: dict[str, float] | None
    # White's point of view; None without an engine
    evaluation_centipawns: int | None
    risk_source: str = "model"
    eval_source: str = "engine"


def _classify_loss(loss: int) -> str:
    if loss == 0:
        return "best"
    if loss <= 35:
        return "good"
    if loss <= 90:
        return "inaccuracy"
    if loss <= 200:
        return "mistake"
    return "blunder"


@dataclass
class PositionAnalysis:
    threats: list[ThreatItem]
    candidate_moves: list[CandidateMove] = field(default_factory=list)
    # Side to move's point of view
    eval_centipawns: int | None = None
    blunder_probability: float | None = None

    @property
    def risk_source(self) -> str:
        return "model" if self.blunder_probability is not None else "unavailable"

    @property
    def eval_source(self) -> str:
        return "engine" if self.eval_centipawns is not None else "unavailable"


def _analyze_position(board: chess.Board, rating: int, candidate_count: int = 3) -> PositionAnalysis:
    """Threats, engine candidates and blunder risk for a live position.

    Shared by /tactical-analysis and /coach-advice. Missing backends leave
    their fields as None rather than inventing a number.
    """
    analysis = PositionAnalysis(threats=_detect_tactical_threats(board))

    model: BlunderModel | None = None
    if settings.model_path.exists():
        try:
            model = get_blunder_model()
            analysis.blunder_probability = float(model.predict_probability(extract_features(board, rating)))
        except HTTPException as exc:
            logger.warning("Position analysis continuing without blunder model: %s", exc.detail)
            model = None

    if settings.stockfish_path is None or not settings.stockfish_path.exists():
        return analysis
    try:
        with StockfishEvaluator(settings.stockfish_path, depth=8) as evaluator:
            raw_candidates = evaluator.candidate_moves(board, count=candidate_count)
    except (OSError, EngineConfigurationError) as exc:
        logger.warning("Position analysis continuing without engine candidates: %s", exc)
        return analysis
    if not raw_candidates:
        return analysis

    best_score = raw_candidates[0][1]
    analysis.eval_centipawns = best_score
    for move, score in raw_candidates:
        loss = max(0, best_score - score)
        reply_risk: float | None = None
        if model is not None:
            after = board.copy(stack=False)
            after.push(move)
            reply_risk = 0.0 if after.is_game_over() else float(model.predict_probability(extract_features(after, rating)))
        analysis.candidate_moves.append(
            CandidateMove(
                san=board.san(move),
                uci=move.uci(),
                centipawns=score,
                loss_centipawns=loss,
                blunder_probability=reply_risk,
                classification=_classify_loss(loss),
            )
        )
    return analysis


def _calculate_win_chances(eval_centipawns: int, turn: chess.Color) -> dict[str, float]:
    white_eval = eval_centipawns if turn == chess.WHITE else -eval_centipawns
    w = 1.0 / (1.0 + math.exp(-0.004 * white_eval))
    draw = 0.36 * math.exp(-((white_eval / 280) ** 2))
    rem = max(0.0, 1.0 - draw)
    p_w = rem * w
    p_b = rem * (1.0 - w)
    return {
        "white": round(p_w, 2),
        "draw": round(draw, 2),
        "black": round(p_b, 2),
    }


def _detect_tactical_threats(board: chess.Board) -> list[ThreatItem]:
    turn = board.turn
    threats: list[ThreatItem] = []

    if board.is_check():
        king_sq = board.king(turn)
        if king_sq is not None:
            checkers = list(board.checkers())
            ch_name = (
                chess.piece_name(board.piece_at(checkers[0]).piece_type).capitalize()
                if checkers and board.piece_at(checkers[0])
                else "enemy piece"
            )
            threats.append(
                ThreatItem(
                    square=chess.square_name(king_sq),
                    piece="King",
                    motif="check",
                    description=f"King on {chess.square_name(king_sq)} is in check by {ch_name}!",
                )
            )

    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if not piece or piece.color != turn or piece.piece_type == chess.KING:
            continue
        sq_name = chess.square_name(sq)
        p_name = chess.piece_name(piece.piece_type).capitalize()

        if board.is_pinned(turn, sq):
            pinner_str = "enemy piece"
            for s in board.pin(turn, sq):
                p = board.piece_at(s)
                if p and p.color != turn:
                    pinner_str = chess.piece_name(p.piece_type).capitalize()
                    break
            threats.append(
                ThreatItem(
                    square=sq_name,
                    piece=p_name,
                    motif="pinned",
                    description=f"{p_name} on {sq_name} is pinned to King by {pinner_str}",
                )
            )

        attackers = list(board.attackers(not turn, sq))
        defenders = list(board.attackers(turn, sq))
        if attackers and not defenders:
            threats.append(
                ThreatItem(
                    square=sq_name,
                    piece=p_name,
                    motif="hanging",
                    description=f"{p_name} on {sq_name} is undefended and attacked by {len(attackers)} piece(s)",
                )
            )
        elif len(attackers) > len(defenders):
            threats.append(
                ThreatItem(
                    square=sq_name,
                    piece=p_name,
                    motif="underdefended",
                    description=f"{p_name} on {sq_name} is under-defended ({len(attackers)} attackers vs {len(defenders)} defender(s))",
                )
            )
        elif attackers:
            lowest_att_val = min(
                PIECE_VALUES[board.piece_at(s).piece_type]
                for s in attackers
                if board.piece_at(s)
            )
            if lowest_att_val < PIECE_VALUES[piece.piece_type]:
                threats.append(
                    ThreatItem(
                        square=sq_name,
                        piece=p_name,
                        motif="vulnerable",
                        description=f"{p_name} on {sq_name} is targeted by a lower-value attacker",
                    )
                )

    return threats


@app.post("/tactical-analysis", response_model=TacticalAnalysisResponse)
def tactical_analysis(request: TacticalAnalysisRequest) -> TacticalAnalysisResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc

    side_label = "White" if board.turn == chess.WHITE else "Black"

    if board.is_game_over():
        outcome = board.outcome()
        winner = outcome.winner if outcome else None
        if winner is None:
            explanation = "Game drawn by stalemate or insufficient material."
            win_chances = {"white": 0.0, "draw": 1.0, "black": 0.0}
            final_eval = 0
        else:
            winner_str = "White" if winner == chess.WHITE else "Black"
            explanation = f"Checkmate! {winner_str} won the game."
            white_won = winner == chess.WHITE
            win_chances = {"white": 1.0 if white_won else 0.0, "draw": 0.0, "black": 0.0 if white_won else 1.0}
            final_eval = 9999 if white_won else -9999

        return TacticalAnalysisResponse(
            fen=board.fen(),
            side_to_move=side_label,
            overall_blunder_probability=0.0,
            risk_band="low",
            threats=[],
            candidate_moves=[],
            coach_explanation=explanation,
            win_chances=win_chances,
            evaluation_centipawns=final_eval,
            risk_source="final",
            eval_source="final",
        )

    analysis = _analyze_position(board, request.rating)
    threats = analysis.threats
    candidate_moves = analysis.candidate_moves
    overall_prob = analysis.blunder_probability

    if board.is_check():
        coach_explanation = "King is under direct check! Calculate responses precisely to avoid tactical collapse."
    elif threats:
        top_threat = threats[0]
        coach_explanation = f"Tactical radar alert: {top_threat.description}. Be vigilant before committing piece moves."
    elif overall_prob is not None and overall_prob >= 0.65:
        coach_explanation = f"High blunder risk ({round(overall_prob * 100)}%): Sharp tactical tensions detected. Calculate forced responses."
    elif candidate_moves and candidate_moves[0].classification == "best":
        coach_explanation = f"Recommended continuation is {candidate_moves[0].san} to maintain initiative and positional stability."
    else:
        coach_explanation = "Position is solid. Harmonize your pieces and safeguard king safety."

    eval_cp = analysis.eval_centipawns
    return TacticalAnalysisResponse(
        fen=board.fen(),
        side_to_move=side_label,
        overall_blunder_probability=overall_prob,
        risk_band=_risk_band(overall_prob) if overall_prob is not None else None,
        threats=threats,
        candidate_moves=candidate_moves,
        coach_explanation=coach_explanation,
        win_chances=_calculate_win_chances(eval_cp, board.turn) if eval_cp is not None else None,
        evaluation_centipawns=(eval_cp if board.turn == chess.WHITE else -eval_cp) if eval_cp is not None else None,
        risk_source=analysis.risk_source,
        eval_source=analysis.eval_source,
    )


class TerritoryRequest(BaseModel):
    fen: str


@app.post("/territory-control", response_model=TerritoryControlResponse)
def territory_control(request: TerritoryRequest) -> TerritoryControlResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc
    return compute_territory_control(board)


class BlunderDnaRequest(BaseModel):
    # Preferred: each game with the colour the user played, so only their positions count
    games: list[DnaGame] | None = Field(default=None, max_length=500)
    # Legacy: one PGN blob; both sides' positions are counted
    pgn_text: str | None = Field(default=None, max_length=500_000)
    fens: list[str] | None = Field(default=None, max_length=200)


@app.post("/blunder-dna", response_model=BlunderDnaResponse)
def blunder_dna(request: BlunderDnaRequest) -> BlunderDnaResponse:
    pgns = [request.pgn_text] if request.pgn_text else None
    return compute_blunder_dna(pgn_texts=pgns, fens=request.fens, games=request.games)


@app.get("/trap-puzzles", response_model=list[TrapDrill])
def trap_puzzles() -> list[TrapDrill]:
    return get_all_traps()


@app.get("/trap-puzzles/{trap_id}", response_model=TrapDrill)
def trap_puzzle(trap_id: str) -> TrapDrill:
    trap = get_trap_by_id(trap_id)
    if not trap:
        raise HTTPException(status_code=404, detail="Trap puzzle not found")
    return trap


class CoachAdviceRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=400, le=3000)
    archetype: str | None = None
    opening_name: str | None = None
    api_key: str | None = None


@app.post("/coach-advice", response_model=CoachExplanation)
def coach_advice(req: CoachAdviceRequest) -> CoachExplanation:
    try:
        board = chess.Board(req.fen)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid FEN: {exc}") from exc

    analysis = _analyze_position(board, req.rating)
    overall_prob = analysis.blunder_probability

    ctx = build_tactical_context(
        board=board,
        engine_eval_cp=analysis.eval_centipawns,
        blunder_probability=overall_prob,
        risk_band=_risk_band(overall_prob) if overall_prob is not None else "unknown",
        opening_name=req.opening_name or "Standard Opening",
        archetype=req.archetype,
        candidate_moves=analysis.candidate_moves,
        threats=analysis.threats,
    )

    return generate_agentic_coach_advice(ctx, api_key=req.api_key)


