import "./EvaluationBar.css";
import React from "react";
import { formatEvaluation } from "../utils/chessUtils";
import { METRIC_COPY, winChancesFromEval } from "../utils/metricCopy";

interface EvaluationBarProps {
  evaluationCentipawns: number | null;
  isFlipped?: boolean;
  /** No engine on the backend: show an empty bar instead of a fake 0.00 */
  unavailable?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluationCentipawns, isFlipped = false, unavailable = false }) => {
  const cp = evaluationCentipawns ?? 0;

  // Same curve as the Outlook card: White's expected score (win + half the draws)
  const chances = winChancesFromEval(cp);
  const expected = (chances.white + chances.draw / 2) * 100;
  const whitePercent = Math.abs(cp) >= 9000 ? expected : Math.min(96, Math.max(4, expected));

  const label = unavailable ? "—" : formatEvaluation(evaluationCentipawns);
  const whiteAhead = cp >= 0;
  const title = unavailable
    ? "No engine evaluation: Stockfish isn't connected"
    : `Engine evaluation ${label}. ${METRIC_COPY.evalBar.what}`;

  return (
    <div
      className={`eval-bar ${isFlipped ? "is-flipped" : ""} ${unavailable ? "is-unavailable" : ""}`}
      role="meter"
      aria-label="Engine evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whitePercent)}
      aria-valuetext={unavailable ? "Not available" : label}
      title={title}
    >
      <div className="eval-bar__white" style={{ height: `${unavailable ? 50 : whitePercent}%` }} />
      <span className={`eval-bar__score num ${whiteAhead || unavailable ? "on-white" : "on-black"}`}>{label}</span>
    </div>
  );
};
