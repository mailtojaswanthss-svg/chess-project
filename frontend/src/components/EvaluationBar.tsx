import React from "react";
import { formatEvaluation } from "../utils/chessUtils";

interface EvaluationBarProps {
  evaluationCentipawns: number | null;
  isFlipped?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  evaluationCentipawns,
  isFlipped = false,
}) => {
  const cp = evaluationCentipawns ?? 0;
  
  // Calculate percentage
  let whitePercent: number;
  if (cp >= 9000) {
    whitePercent = 100;
  } else if (cp <= -9000) {
    whitePercent = 0;
  } else {
    // Non-linear sigmoid-like clamp for chess evaluations
    const winChance = 1 / (1 + Math.pow(10, -cp / 400));
    whitePercent = Math.min(96, Math.max(4, winChance * 100));
  }

  // If flipped, invert bar perspective
  const displayWhitePercent = isFlipped ? 100 - whitePercent : whitePercent;

  return (
    <div className="eval-bar-container" title={`Engine Evaluation: ${formatEvaluation(evaluationCentipawns)}`}>
      <div className="eval-bar-track">
        {/* Black is top, White is bottom (or inverted if flipped) */}
        <div
          className="eval-bar-fill-white"
          style={{ height: `${displayWhitePercent}%` }}
        />
      </div>
      <div className="eval-bar-score">
        {formatEvaluation(evaluationCentipawns)}
      </div>
    </div>
  );
};
