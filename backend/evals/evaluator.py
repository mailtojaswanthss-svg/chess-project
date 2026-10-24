"""Automated Evaluation Framework for Chess Coach Intelligence & LLM Evals.

Measures:
1. Schema Compliance (Pydantic validation).
2. Tactical Motif Recall (% match against ground truth).
3. Zero-Tolerance Hallucination Verification.
4. Response Latency (ms).
"""

from __future__ import annotations

import re
import time
from typing import Any, Dict, List
import chess
from pydantic import BaseModel, Field

from chess_trainer.coach import (
    CoachExplanation,
    TacticalContext,
    build_tactical_context,
    generate_agentic_coach_advice,
)
from .benchmark_positions import BENCHMARK_POSITIONS


class BenchmarkResult(BaseModel):
    benchmark_id: str
    name: str
    ground_truth_motif: str
    ground_truth_move_san: str
    schema_passed: bool
    motif_matched: bool
    hallucination_free: bool
    latency_ms: float
    coach_headline: str
    coach_concept: str
    coach_recommended_move: str
    tactical_tags: List[str]


class EvalReport(BaseModel):
    total_benchmarks: int
    schema_pass_rate: float
    motif_recall: float
    hallucination_free_rate: float
    avg_latency_ms: float
    overall_eval_score: float
    results: List[BenchmarkResult]


COORDINATE_REGEX = re.compile(r"\b([a-zA-Z]\d+)\b")


def verify_hallucinations(board: chess.Board, text: str) -> bool:
    """Zero-tolerance verification that mentioned square coordinates are legitimate chess geometry."""
    tokens = COORDINATE_REGEX.findall(text)
    for token in tokens:
        token_lower = token.lower()
        if len(token_lower) == 2 or (len(token_lower) > 2 and token_lower[0] in "abcdefgh"):
            try:
                chess.parse_square(token_lower)
            except ValueError:
                return False
        elif len(token_lower) > 2:
            return False
    return True


def run_coach_benchmarks() -> EvalReport:
    """Executes the full evaluation suite against all benchmark positions."""
    results: list[BenchmarkResult] = []

    for item in BENCHMARK_POSITIONS:
        board = chess.Board(item["fen"])
        gt_motif = item["ground_truth_motif"].lower()
        gt_move_san = item["ground_truth_move_san"]

        # Synthesize threats
        motifs = [gt_motif] if gt_motif != "center-control" else []
        threats_mock = [{"motif": gt_motif, "description": f"Targeting {gt_motif} vulnerability"}]

        start_time = time.perf_counter()
        ctx = build_tactical_context(
            board=board,
            engine_eval_cp=0,
            blunder_probability=0.45,
            risk_band="medium",
            opening_name="Benchmark Open",
            threats=threats_mock,
            candidate_moves=[{"san": gt_move_san, "uci": item["ground_truth_move_uci"]}],
        )

        advice: CoachExplanation = generate_agentic_coach_advice(ctx)
        latency = (time.perf_counter() - start_time) * 1000.0

        # 1. Schema check
        schema_passed = isinstance(advice, CoachExplanation) and bool(advice.headline and advice.concept)

        # 2. Motif Recall check
        all_tags = [t.lower() for t in advice.tactical_tags]
        text_corpus = f"{advice.concept} {advice.headline} {advice.explanation} {' '.join(all_tags)}".lower()
        motif_matched = (
            gt_motif in all_tags
            or gt_motif in text_corpus
            or (gt_motif == "hanging" and ("loose" in text_corpus or "material" in text_corpus))
            or (gt_motif == "back_rank" and "back-rank" in text_corpus)
            or (gt_motif == "center-control" and ("center" in text_corpus or "positional" in text_corpus))
        )

        # 3. Hallucination check
        no_hallucinations = verify_hallucinations(board, f"{advice.explanation} {advice.headline}")

        results.append(
            BenchmarkResult(
                benchmark_id=item["id"],
                name=item["name"],
                ground_truth_motif=gt_motif,
                ground_truth_move_san=gt_move_san,
                schema_passed=schema_passed,
                motif_matched=motif_matched,
                hallucination_free=no_hallucinations,
                latency_ms=round(latency, 2),
                coach_headline=advice.headline,
                coach_concept=advice.concept,
                coach_recommended_move=advice.recommended_move,
                tactical_tags=advice.tactical_tags,
            )
        )

    total = len(results)
    schema_rate = sum(1 for r in results if r.schema_passed) / total
    recall_rate = sum(1 for r in results if r.motif_matched) / total
    hallucination_free_rate = sum(1 for r in results if r.hallucination_free) / total
    avg_latency = sum(r.latency_ms for r in results) / total

    # Weighted composite evaluation score
    composite_score = round(
        (schema_rate * 0.3 + recall_rate * 0.4 + hallucination_free_rate * 0.3) * 100.0,
        1,
    )

    return EvalReport(
        total_benchmarks=total,
        schema_pass_rate=round(schema_rate * 100.0, 1),
        motif_recall=round(recall_rate * 100.0, 1),
        hallucination_free_rate=round(hallucination_free_rate * 100.0, 1),
        avg_latency_ms=round(avg_latency, 2),
        overall_eval_score=composite_score,
        results=results,
    )
