from pathlib import Path

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

app = FastAPI(title="Chess Blunder Trainer", version="0.1.0")
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


@app.get("/health")
def health() -> dict[str, object]:
    model_samples = None
    model_metrics = None
    if settings.model_path.exists():
        try:
            metadata = BlunderModel.load(settings.model_path).metadata
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
        model = BlunderModel.load(Path(settings.model_path))
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
    board.push(selected_move)
    return MoveResponse(
        fen=board.fen(),
        uci=selected_move.uci(),
        san=san,
        evaluation_centipawns=score,
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
        model = BlunderModel.load(settings.model_path)
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
    except (OSError, ValueError, KeyError, EngineConfigurationError) as exc:
        raise HTTPException(status_code=503, detail=f"Could not calculate trap move: {exc}") from exc
    return TrapMoveResponse(
        fen=next_board.fen(),
        uci=chosen_move.uci(),
        san=san,
        evaluation_centipawns=chosen_score,
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


class GameAnalysisResponse(BaseModel):
    headers: dict[str, str]
    moves: list[MoveAnalysisResponse]
    blunder_count: int
    high_risk_count: int


@app.post("/analyze-game", response_model=GameAnalysisResponse)
def analyze_game(request: GameAnalysisRequest) -> GameAnalysisResponse:
    if not settings.model_path.exists():
        raise HTTPException(status_code=503, detail=f"Model not found: {settings.model_path}")
    if settings.stockfish_path is None:
        raise HTTPException(status_code=503, detail="Stockfish path is not configured")
    try:
        model = BlunderModel.load(settings.model_path)
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
    )
