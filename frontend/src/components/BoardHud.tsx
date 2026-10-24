import "./BoardHud.css";
import React, { useMemo } from "react";
import { Compass, ShieldCheck, AlertTriangle, Flame } from "lucide-react";
import { riskFor } from "../utils/chessUtils";
import { useCountUp } from "../utils/useCountUp";
import { MetricInfo, NEEDS_MODEL, Unavailable } from "./MetricInfo";

interface BoardHudProps {
  sideToMove: "w" | "b";
  fen: string;
  moveCount: number;
  /** 0.0 to 1.0; null hides the meter (e.g. in puzzles) */
  riskScore: number | null;
  /** The backend has no blunder model: show "—" rather than hiding the meter */
  riskUnavailable?: boolean;
  isCheck?: boolean;
  isAnalyzing?: boolean;
  /** Extra controls shown at the end of the row (e.g. overlay toggles) */
  children?: React.ReactNode;
}

function gamePhase(fen: string, moveCount: number): { label: string; hint: string } {
  const placement = fen.split(" ")[0] ?? "";
  let pieces = 0;
  let queens = 0;
  for (const ch of placement) {
    if ("rnbqRNBQ".includes(ch)) pieces++;
    if (ch === "q" || ch === "Q") queens++;
  }
  if (moveCount <= 10 && pieces >= 12) return { label: "Opening", hint: "Theory and development" };
  if (queens === 0 || pieces <= 6 || (moveCount > 28 && pieces <= 8)) {
    return { label: "Endgame", hint: "King activity and promotion" };
  }
  return { label: "Middlegame", hint: "Strategy and tactical sharpness" };
}

const RISK_ICON = { low: ShieldCheck, medium: AlertTriangle, high: Flame };

export const BoardHud: React.FC<BoardHudProps> = ({
  sideToMove,
  fen,
  moveCount,
  riskScore,
  riskUnavailable = false,
  isCheck = false,
  isAnalyzing = false,
  children,
}) => {
  const phase = useMemo(() => gamePhase(fen, moveCount), [fen, moveCount]);
  const risk = riskFor(riskScore ?? 0);
  const RiskIcon = RISK_ICON[risk.tone];
  const shownPct = Math.round(useCountUp((riskScore ?? 0) * 100));

  return (
    <div className={`board-hud ${isCheck ? "is-check" : ""}`} role="status" aria-live="polite">
      <span className={`hud-chip hud-turn hud-turn--${sideToMove}`}>
        <span className="hud-turn__glyph" aria-hidden="true">{sideToMove === "w" ? "♔" : "♚"}</span>
        <span key={sideToMove} className="hud-turn__text">
          {sideToMove === "w" ? "White" : "Black"}
          <span className="hud-turn__suffix"> to move</span>
        </span>
      </span>

      {isCheck && (
        <span className="hud-chip hud-check">
          <span className="live-dot" /> Check
        </span>
      )}

      <span className="hud-chip hud-phase" title={phase.hint}>
        <Compass size={14} aria-hidden="true" />
        {phase.label}
      </span>

      {riskScore !== null && <div className={`hud-risk hud-risk--${risk.tone}`} title={`${risk.label}: ${risk.description}`}>
        <RiskIcon size={14} aria-hidden="true" />
        <span className="hud-risk__label">Blunder risk <span className="hud-risk__unit">(≥1 pawn)</span></span>
        <div className="meter hud-risk__meter">
          <div
            className={`meter__fill meter__fill--${risk.tone} ${isAnalyzing ? "is-pending" : ""}`}
            style={{ width: `${Math.max(3, riskScore * 100)}%` }}
          />
        </div>
        <span className="hud-risk__value num">{shownPct}%</span>
        <MetricInfo metric="blunderRisk" />
      </div>}
      {riskScore === null && riskUnavailable && (
        <div className="hud-risk hud-risk--none">
          <span className="hud-risk__label">Blunder risk</span>
          <Unavailable reason={NEEDS_MODEL} />
          <MetricInfo metric="blunderRisk" unavailableReason="The backend has no trained blunder model, so there's no reading. Train one with chess-train and set MODEL_PATH." />
        </div>
      )}
      {children && <div className="hud-extras">{children}</div>}
    </div>
  );
};
