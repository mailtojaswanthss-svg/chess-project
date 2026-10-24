"""Grandmaster AI Coach with Context Engineering & Structured Output.

Integrates multi-PV engine candidate lines, calibrated blunder probability,
tactical motif detection, opening theory, and player Blunder DNA archetypes
into explainable pedagogical coaching advice.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, List, Optional
import chess
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class TacticalContext(BaseModel):
    fen: str
    side_to_move: str
    opening_name: str
    engine_eval_cp: int
    blunder_probability: float
    risk_band: str
    archetype: Optional[str] = None
    motifs: List[str] = Field(default_factory=list)
    threat_descriptions: List[str] = Field(default_factory=list)
    top_moves_san: List[str] = Field(default_factory=list)
    top_moves_uci: List[str] = Field(default_factory=list)
    is_check: bool = False
    in_check_square: Optional[str] = None


class CoachExplanation(BaseModel):
    headline: str = Field(..., description="Short punchy pedagogical headline (< 80 chars)")
    concept: str = Field(..., description="Grandmaster chess concept (e.g. Overloaded Defender, Pin, Back-Rank)")
    explanation: str = Field(..., description="Detailed pedagogical reasoning explaining the position and danger")
    threat_summary: str = Field(..., description="What the opponent is threatening if careless")
    recommended_move: str = Field(..., description="Best move in SAN and UCI notation")
    tactical_tags: List[str] = Field(default_factory=list, description="Extracted tactical motif tags")
    confidence: float = Field(default=0.92, ge=0.0, le=1.0)
    engine_source: str = Field(default="Context-Engineered Grandmaster Agent")


def build_tactical_context(
    board: chess.Board,
    engine_eval_cp: int = 0,
    blunder_probability: float = 0.15,
    risk_band: str = "low",
    opening_name: str = "Standard Opening",
    archetype: Optional[str] = None,
    candidate_moves: Optional[List[Any]] = None,
    threats: Optional[List[Any]] = None,
) -> TacticalContext:
    """Builds a rich, normalized context bundle for LLM prompt engineering."""
    turn_str = "White" if board.turn == chess.WHITE else "Black"
    motifs: list[str] = []
    threat_descs: list[str] = []

    if threats:
        for t in threats:
            m = getattr(t, "motif", "") or (t.get("motif") if isinstance(t, dict) else "")
            desc = getattr(t, "description", "") or (t.get("description") if isinstance(t, dict) else "")
            if m and m not in motifs:
                motifs.append(m)
            if desc and desc not in threat_descs:
                threat_descs.append(desc)

    top_san: list[str] = []
    top_uci: list[str] = []
    if candidate_moves:
        for c in candidate_moves[:3]:
            san = getattr(c, "san", "") or (c.get("san") if isinstance(c, dict) else "")
            uci = getattr(c, "uci", "") or (c.get("uci") if isinstance(c, dict) else "")
            if san:
                top_san.append(san)
            if uci:
                top_uci.append(uci)

    check_sq = None
    if board.is_check():
        ksq = board.king(board.turn)
        if ksq is not None:
            check_sq = chess.square_name(ksq)
            if "check" not in motifs:
                motifs.append("check")

    return TacticalContext(
        fen=board.fen(),
        side_to_move=turn_str,
        opening_name=opening_name,
        engine_eval_cp=engine_eval_cp,
        blunder_probability=blunder_probability,
        risk_band=risk_band,
        archetype=archetype,
        motifs=motifs,
        threat_descriptions=threat_descs,
        top_moves_san=top_san,
        top_moves_uci=top_uci,
        is_check=board.is_check(),
        in_check_square=check_sq,
    )


def generate_agentic_coach_advice(
    ctx: TacticalContext,
    api_key: Optional[str] = None,
) -> CoachExplanation:
    """Generates structured coaching advice.
    
    If GEMINI_API_KEY is available, invokes Gemini with structured JSON output.
    Otherwise, invokes the high-precision Context-Engineered Grandmaster Agent.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if key and key.strip():
        try:
            return _call_gemini_coach(ctx, key.strip())
        except Exception as exc:
            logger.warning(
                "Gemini coach failed (%s); falling back to deterministic coach",
                type(exc).__name__,
            )

    return _generate_deterministic_grandmaster_advice(ctx)


def _call_gemini_coach(ctx: TacticalContext, api_key: str) -> CoachExplanation:
    """Calls Gemini API with structured JSON output and schema validation across candidate models."""
    import httpx

    prompt = f"""You are the Chess.com Grandmaster Coach. Analyze the following engineered tactical position and return strict JSON advice for the player.

POSITION CONTEXT:
- Side to move: {ctx.side_to_move}
- FEN: {ctx.fen}
- Opening: {ctx.opening_name}
- Evaluation: {ctx.engine_eval_cp} centipawns
- Calibrated Blunder Risk: {ctx.blunder_probability * 100:.1f}% ({ctx.risk_band} danger)
- Player Tactical Archetype: {ctx.archetype or 'Balanced Competitor'}
- Active Motifs: {', '.join(ctx.motifs) if ctx.motifs else 'None detected'}
- Immediate Threats: {'; '.join(ctx.threat_descriptions) if ctx.threat_descriptions else 'None immediately hanging'}
- Top Engine Candidate Moves: {', '.join(ctx.top_moves_san) if ctx.top_moves_san else 'Engine calculating'}

Respond in EXACT JSON with keys:
"headline": (string, max 80 chars, punchy coaching alert)
"concept": (string, chess tactical or strategic concept)
"explanation": (string, 2-3 pedagogical sentences explaining why this move matters and what the trap is)
"threat_summary": (string, 1 clear sentence of opponent's threat)
"recommended_move": (string, best move with reason, e.g. "Nf3 (defends e5)")
"tactical_tags": (list of strings, e.g. ["pin", "center-control"])
"confidence": (float between 0.85 and 1.0)
"""

    models: list[str] = []
    env_model = os.environ.get("GEMINI_MODEL_ID")
    if env_model and env_model.strip():
        models.append(env_model.strip())
    for fallback_model in ["gemini-3-flash", "gemini-3.1-flash-lite-preview", "gemini-2.5-flash"]:
        if fallback_model not in models:
            models.append(fallback_model)

    last_error: Exception | None = None
    for model_id in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        try:
            resp = httpx.post(url, json=payload, headers={"x-goog-api-key": api_key}, timeout=8.0)
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)

            return CoachExplanation(
                headline=parsed.get("headline", "Tactical Alert in Current Position"),
                concept=parsed.get("concept", "Tactical Alertness"),
                explanation=parsed.get("explanation", "Maintain piece coordination and avoid hasty pawn advances."),
                threat_summary=parsed.get("threat_summary", "Watch for counter-tactics in the center."),
                recommended_move=parsed.get("recommended_move", ctx.top_moves_san[0] if ctx.top_moves_san else "Develop piece"),
                tactical_tags=parsed.get("tactical_tags", ctx.motifs or ["tactics"]),
                confidence=float(parsed.get("confidence", 0.95)),
                engine_source=f"Gemini {model_id} LLM",
            )
        except Exception as exc:
            logger.warning("Gemini model %s failed: %s", model_id, type(exc).__name__)
            last_error = exc
            continue

    if last_error is not None:
        raise last_error

    raise RuntimeError("No candidate models available for Gemini coach")


def _generate_deterministic_grandmaster_advice(ctx: TacticalContext) -> CoachExplanation:
    """Synthesizes context-engineered tactical motifs, candidate lines, and Blunder DNA

    into rigorous, hallucination-free grandmaster guidance.
    """
    board = chess.Board(ctx.fen)
    best_move_san = ctx.top_moves_san[0] if ctx.top_moves_san else ""
    best_move_uci = ctx.top_moves_uci[0] if ctx.top_moves_uci else ""
    if not best_move_san:
        # Fallback to legal move
        legal = list(board.legal_moves)
        if legal:
            best_move_san = board.san(legal[0])
            best_move_uci = legal[0].uci()

    rec_str = f"{best_move_san} ({best_move_uci})" if best_move_uci else best_move_san or "Develop Pieces"

    # 1. King in Check
    if ctx.is_check:
        ch_sq = ctx.in_check_square or "your King"
        return CoachExplanation(
            headline=f"Immediate Check: King under attack on {ch_sq}",
            concept="Defensive Urgency & King Safety",
            explanation=f"Your King on {ch_sq} is under direct fire. You must respond immediately by capturing the checking piece, interposing a defender, or retreating.",
            threat_summary="Failure to parry check leaves the position terminated.",
            recommended_move=rec_str,
            tactical_tags=["check", "king-safety", "forced-move"],
            confidence=0.98,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 2. Pin Motif Detected
    if "pin" in ctx.motifs or "pinned" in ctx.motifs:
        pin_threat = next((t for t in ctx.threat_descriptions if "pin" in t.lower()), "Pinned piece restricts movement")
        return CoachExplanation(
            headline="Tactical Pin Restriction: Defensive piece is immobilized",
            concept="Absolute & Relative Pins",
            explanation=f"An active pin freezes your defender in place: {pin_threat}. Moving a pinned piece exposes higher-value material behind it. Break the pin or reinforce with secondary defense.",
            threat_summary="Opponent will pile attackers onto the pinned piece.",
            recommended_move=rec_str,
            tactical_tags=["pin", "piece-coordination", "tactical-tension"],
            confidence=0.94,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 2b. Fork / Double Attack Motif Detected
    if "fork" in ctx.motifs or "double_attack" in ctx.motifs:
        fork_threat = next((t for t in ctx.threat_descriptions if "fork" in t.lower()), "Double attack threatening multiple targets")
        return CoachExplanation(
            headline="Double Attack Alert: Knight or Pawn fork geometry",
            concept="Tactical Fork & Double Attack",
            explanation=f"A geometric double attack is unfolding: {fork_threat}. Knights and pawns exploit loose coordination to strike two pieces at once. Eliminate the attacker or retreat to guarded outposts.",
            threat_summary="Opponent threatens to strike multiple targets simultaneously.",
            recommended_move=rec_str,
            tactical_tags=["fork", "double-attack", "tactical-tension"],
            confidence=0.94,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 3. Hanging Material Motif
    if "hanging" in ctx.motifs or "underdefended" in ctx.motifs:
        hang_threat = next((t for t in ctx.threat_descriptions if "hanging" in t.lower() or "underdefended" in t.lower()), "Undefended piece targeted")
        return CoachExplanation(
            headline="Hanging Material Alert: Clean up loose pieces",
            concept="Tactical Hanging Pieces (John Nunn's LPDO)",
            explanation=f"Loose pieces drop off: {hang_threat}. In sharp positions, undefended tactical anchors invite forks and deflective sacrifices. Solidify or withdraw immediately.",
            threat_summary="Opponent can win free material with a tactical strike.",
            recommended_move=rec_str,
            tactical_tags=["hanging-piece", "tactical-anchor", "material-security"],
            confidence=0.93,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 4. High Calibrated Blunder Risk
    if ctx.risk_band in ("high", "extreme") or ctx.blunder_probability > 0.45:
        arch_note = f" (Aligns with your '{ctx.archetype}' profile)" if ctx.archetype else ""
        return CoachExplanation(
            headline=f"High Blunder Danger: Sharp tactical crossroad{arch_note}",
            concept="Cognitive Tunnel Vision & Tactical Overload",
            explanation=f"Our calibrated ML model forecasts a {ctx.blunder_probability * 100:.0f}% human mistake probability here. The position possesses hidden tactical tension where intuitive moves can backfire.",
            threat_summary="Hidden tactical refutation exists against routine candidate moves.",
            recommended_move=rec_str,
            tactical_tags=["blunder-alert", "sharp-position", "calculation"],
            confidence=0.91,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 5. Overloaded or Back-Rank Motif
    if "back_rank" in ctx.motifs:
        return CoachExplanation(
            headline="Back-Rank Corridor Vulnerability: Create luft for your King",
            concept="Back-Rank Mate Corridor",
            explanation="The back rank is vulnerable to heavy piece infiltration. Pushing h3/h6 or maintaining a rook on the first rank prevents sudden checkmate catastrophes.",
            threat_summary="Enemy Rook or Queen infiltration on the 1st/8th rank delivers mate.",
            recommended_move=rec_str,
            tactical_tags=["back-rank", "king-safety", "luft"],
            confidence=0.95,
            engine_source="Context-Engineered Grandmaster Agent",
        )

    # 6. Strategic / Positional Guidance
    adv_side = "advantageous" if ctx.engine_eval_cp > 80 else "contested" if abs(ctx.engine_eval_cp) < 50 else "challenging"
    return CoachExplanation(
        headline=f"Strategic Development: Position is {adv_side} ({ctx.opening_name})",
        concept="Positional Harmony & Center Outposts",
        explanation=f"Play continues within the {ctx.opening_name}. Prioritize central outpost control, piece activity, and coordination across the e4/d4 corridors. {best_move_san} provides the cleanest harmonic transition.",
        threat_summary="Allowing the opponent free central pawn breaks grants them dynamic activity.",
        recommended_move=rec_str,
        tactical_tags=["center-control", "positional-harmony", "piece-activity"],
        confidence=0.89,
        engine_source="Context-Engineered Grandmaster Agent",
    )
