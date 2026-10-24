import "./EvaluationBar.css";
import React from "react";
import { formatEvaluation } from "../utils/chessUtils";

interface EvaluationBarProps {
  evaluationCentipawns: number | null;
  isFlipped?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluationCentipawns, isFlipped = false }) => {
  const cp = evaluationCentipawns ?? 0;

  let whitePercent: number;
  if (cp >= 9000) whitePercent = 100;
  else if (cp <= -9000) whitePercent = 0;
  else whitePercent = Math.min(96, Math.max(4, (1 / (1 + Math.pow(10, -cp / 400))) * 100));

  const label = formatEvaluation(evaluationCentipawns);
  const whiteAhead = cp >= 0;

  return (
    <div
      className={`eval-bar ${isFlipped ? "is-flipped" : ""}`}
      role="meter"
      aria-label="Engine evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePercent)}
      aria-valuetext={label}
      title={`Engine evaluation: ${label}`}
    >
      <div className="eval-bar__white" style={{ height: `${whitePercent}%` }} />
      <span className={`eval-bar__score num ${whiteAhead ? "on-white" : "on-black"}`}>{label}</span>
    </div>
  );
};
