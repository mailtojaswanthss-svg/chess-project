from contextlib import asynccontextmanager
import logging
from pathlib import Path
import math

import chess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .analysis import analyze_pgn, risk_band
from .engine import EngineConfigurationError, StockfishEvaluator
from .features import extract_features
from .model import BlunderModel
from .maia import MaiaConfigurationError, MaiaEngine
from .territory import compute_territory_control, TerritoryControlResponse
from .profiler import compute_blunder_dna, BlunderDnaResponse
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
    centipawns: int
    loss_centipawns: int
    blunder_probability: float
    classification: str


class TacticalAnalysisRequest(BaseModel):
    fen: str
    rating: int = Field(default=1200, ge=400, le=3000)


class TacticalAnalysisResponse(BaseModel):
    fen: str
    side_to_move: str
    overall_blunder_probability: float
    risk_band: str
    threats: list[ThreatItem]
    candidate_moves: list[CandidateMove]
    coach_explanation: str
    win_chances: dict[str, float]
    evaluation_centipawns: int


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
        explanation = "The game is over."
        if outcome:
            if outcome.winner is None:
                explanation = "Game drawn by stalemate or insufficient material."
            else:
                winner_str = "White" if outcome.winner == chess.WHITE else "Black"
                explanation = f"Checkmate! {winner_str} won the game."

        return TacticalAnalysisResponse(
            fen=board.fen(),
            side_to_move=side_label,
            overall_blunder_probability=0.0,
            risk_band="low",
            threats=[],
            candidate_moves=[],
            coach_explanation=explanation,
            win_chances={"white": 0.5, "draw": 0.0, "black": 0.5} if not outcome or outcome.winner is None else {"white": 1.0, "draw": 0.0, "black": 0.0} if outcome.winner == chess.WHITE else {"white": 0.0, "draw": 0.0, "black": 1.0},
            evaluation_centipawns=0 if not outcome or outcome.winner is None else 9999 if outcome.winner == chess.WHITE else -9999,
        )

    overall_prob = 0.2
    model = None
    if settings.model_path.exists():
        try:
            model = get_blunder_model()
            overall_prob = float(model.predict_probability(extract_features(board, request.rating)))
        except Exception:
            model = None

    threats = _detect_tactical_threats(board)
    candidate_moves: list[CandidateMove] = []
    eval_centipawns = 0

    if settings.stockfish_path is not None and settings.stockfish_path.exists():
        try:
            with StockfishEvaluator(settings.stockfish_path, depth=8) as evaluator:
                raw_candidates = evaluator.candidate_moves(board, count=3)
                if raw_candidates:
                    best_score = raw_candidates[0][1]
                    eval_centipawns = best_score

                    for move, score in raw_candidates:
                        loss = max(0, best_score - score)
                        if loss == 0:
                            classification = "best"
                        elif loss <= 35:
                            classification = "good"
                        elif loss <= 90:
                            classification = "inaccuracy"
                        elif loss <= 200:
                            classification = "mistake"
                        else:
                            classification = "blunder"

                        c_prob = overall_prob
                        if model is not None:
                            cand_board = board.copy(stack=False)
                            cand_board.push(move)
                            if cand_board.is_game_over():
                                c_prob = 0.0
                            else:
                                c_prob = float(model.predict_probability(extract_features(cand_board, request.rating)))

                        candidate_moves.append(
                            CandidateMove(
                                san=board.san(move),
                                uci=move.uci(),
                                centipawns=score,
                                loss_centipawns=loss,
                                blunder_probability=c_prob,
                                classification=classification,
                            )
                        )
        except Exception:
            pass

    if not candidate_moves:
        for legal_move in list(board.legal_moves)[:3]:
            candidate_moves.append(
                CandidateMove(
                    san=board.san(legal_move),
                    uci=legal_move.uci(),
                    centipawns=0,
                    loss_centipawns=0,
                    blunder_probability=overall_prob,
                    classification="good",
                )
            )

    win_chances = _calculate_win_chances(eval_centipawns, board.turn)

    if board.is_check():
        coach_explanation = "King is under direct check! Calculate responses precisely to avoid tactical collapse."
    elif threats:
        top_threat = threats[0]
        coach_explanation = f"Tactical radar alert: {top_threat.description}. Be vigilant before committing piece moves."
    elif overall_prob >= 0.65:
        coach_explanation = f"High blunder risk ({round(overall_prob * 100)}%): Sharp tactical tensions detected. Calculate forced responses."
    elif candidate_moves and candidate_moves[0].classification == "best":
        coach_explanation = f"Recommended continuation is {candidate_moves[0].san} to maintain initiative and positional stability."
    else:
        coach_explanation = "Position is solid. Harmonize your pieces and safeguard king safety."

    return TacticalAnalysisResponse(
        fen=board.fen(),
        side_to_move=side_label,
        overall_blunder_probability=overall_prob,
        risk_band=_risk_band(overall_prob),
        threats=threats,
        candidate_moves=candidate_moves,
        coach_explanation=coach_explanation,
        win_chances=win_chances,
        evaluation_centipawns=eval_centipawns if board.turn == chess.WHITE else -eval_centipawns,
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
    pgn_text: str | None = None
    fens: list[str] | None = None


@app.post("/blunder-dna", response_model=BlunderDnaResponse)
def blunder_dna(request: BlunderDnaRequest) -> BlunderDnaResponse:
    pgns = [request.pgn_text] if request.pgn_text else None
    return compute_blunder_dna(pgn_texts=pgns, fens=request.fens)


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

    threats = _detect_tactical_threats(board)
    candidate_moves: list[CandidateMove] = []
    eval_centipawns = 0

    if settings.stockfish_path is not None and settings.stockfish_path.exists():
        try:
            with StockfishEvaluator(settings.stockfish_path, depth=8) as evaluator:
                raw_candidates = evaluator.candidate_moves(board, count=3)
                if raw_candidates:
                    eval_centipawns = raw_candidates[0][1]
                    for move, score in raw_candidates:
                        loss = max(0, eval_centipawns - score)
                        candidate_moves.append(
                            CandidateMove(
                                uci=move.uci(),
                                san=board.san(move),
                                centipawns=score,
                                loss_centipawns=loss,
                                classification="best" if loss == 0 else "good" if loss <= 35 else "mistake",
                                blunder_probability=0.15,
                            )
                        )
        except (OSError, EngineConfigurationError) as exc:
            logger.warning("Coach advice continuing without engine candidates: %s", exc)

    overall_prob = 0.15
    if settings.model_path.exists():
        try:
            model = get_blunder_model()
            overall_prob = model.predict_probability(extract_features(board, req.rating))
        except HTTPException as exc:
            logger.warning("Coach advice continuing without blunder model: %s", exc.detail)

    ctx = build_tactical_context(
        board=board,
        engine_eval_cp=eval_centipawns,
        blunder_probability=overall_prob,
        risk_band=_risk_band(overall_prob),
        opening_name=req.opening_name or "Standard Opening",
        archetype=req.archetype,
        candidate_moves=candidate_moves,
        threats=threats,
    )

    return generate_agentic_coach_advice(ctx, api_key=req.api_key)


