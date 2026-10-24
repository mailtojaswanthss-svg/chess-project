"""Unit and Benchmark Evaluation Tests for Grandmaster AI Coach."""

import pytest
import chess
from evals.evaluator import run_coach_benchmarks, verify_hallucinations
from chess_trainer.coach import (
    TacticalContext,
    build_tactical_context,
    generate_agentic_coach_advice,
)


def test_coach_context_builder():
    board = chess.Board()
    ctx = build_tactical_context(
        board=board,
        engine_eval_cp=15,
        blunder_probability=0.2,
        risk_band="low",
        opening_name="Ruy Lopez",
        archetype="Aggressive Gambiteer",
    )
    assert ctx.fen == board.fen()
    assert ctx.side_to_move == "White"
    assert ctx.archetype == "Aggressive Gambiteer"
    assert not ctx.is_check


def test_coach_advice_schema_and_resilience():
    board = chess.Board("r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 5")
    ctx = build_tactical_context(
        board=board,
        engine_eval_cp=-120,
        blunder_probability=0.6,
        risk_band="high",
        opening_name="Italian Game",
        threats=[{"motif": "hanging", "description": "Knight on e4 is attacked by d3-pawn"}],
    )
    advice = generate_agentic_coach_advice(ctx)
    assert advice.headline
    assert advice.concept
    assert advice.explanation
    assert advice.threat_summary
    assert advice.confidence >= 0.8
    assert "hanging" in advice.tactical_tags or "hanging-piece" in advice.tactical_tags


def test_verify_hallucinations_valid():
    board = chess.Board()
    text = "The knight moves to f3 and controls e5 and d4 squares safely."
    assert verify_hallucinations(board, text) is True


def test_verify_hallucinations_invalid_geometry():
    board = chess.Board()
    text = "The knight moves to j9."
    assert verify_hallucinations(board, text) is False


def test_coach_eval_suite_benchmarks():
    report = run_coach_benchmarks()
    assert report.total_benchmarks == 10
    assert report.schema_pass_rate == 100.0
    assert report.motif_recall >= 90.0
    assert report.hallucination_free_rate == 100.0
    assert report.overall_eval_score >= 95.0
    assert report.avg_latency_ms < 500.0  # Ultra-fast sub-500ms


def test_gemini_model_id_fallback_resilience(monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL_ID", "custom-experimental-gemini")
    board = chess.Board()
    ctx = build_tactical_context(
        board=board,
        engine_eval_cp=0,
        blunder_probability=0.1,
        risk_band="low",
    )
    advice = generate_agentic_coach_advice(ctx, api_key="dummy_invalid_key")
    assert advice is not None
    assert advice.headline
    assert advice.concept
    assert advice.explanation
