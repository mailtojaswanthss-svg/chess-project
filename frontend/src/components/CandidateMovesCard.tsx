import "./CandidateMovesCard.css";
import React from "react";
import { Sparkles, Eye } from "lucide-react";
import type { CandidateMove } from "../types/chess";
import { winChancesFromEval } from "../utils/metricCopy";
import { MetricInfo, NEEDS_ENGINE, Unavailable } from "./MetricInfo";

interface CandidateMovesCardProps {
  candidateMoves: CandidateMove[];
  /** Candidate scores arrive from the side-to-move's point of view. */
  sideToMove: "w" | "b";
  isLoading?: boolean;
  /** Backend has no Stockfish */
  engineUnavailable?: boolean;
  onHoverCandidateMove?: (uci: string | null) => void;
  hoveredUci?: string | null;
}

// White's expected score (win + half the draws), on the same curve as Outlook
const whiteWinPct = (whiteCp: number): number => {
  const c = winChancesFromEval(whiteCp);
  return Math.max(2, Math.min(98, Math.round((c.white + c.draw / 2) * 100)));
};

const formatPawns = (cp: number): string => {
  if (Math.abs(cp) >= 9000) return cp > 0 ? "#+" : "#-";
  const pawns = (cp / 100).toFixed(2);
  return cp > 0 ? `+${pawns}` : pawns;
};

const QUALITY: Record<string, string> = {
  best: "Best",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

export const CandidateMovesCard: React.FC<CandidateMovesCardProps> = ({
  candidateMoves,
  sideToMove,
  isLoading = false,
  engineUnavailable = false,
  onHoverCandidateMove,
  hoveredUci,
}) => {
  const showSkeleton = isLoading && candidateMoves.length === 0;

  return (
    <section className="card candidates" aria-label="Candidate moves">
      <header className="card__header">
        <h2 className="card__title">
          <Sparkles size={16} /> Candidate moves
        </h2>
        <span className="card__meta">
          Stockfish top 3
          <MetricInfo
            metric="opponentSlip"
            unavailableReason={
              candidateMoves.length > 0 && candidateMoves.every((c) => c.blunder_probability === null)
                ? "Hidden for now: it needs the blunder model, which isn't loaded."
                : null
            }
          />
        </span>
      </header>

      {showSkeleton ? (
        <div className="cand-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton cand-skeleton" />
          ))}
        </div>
      ) : candidateMoves.length === 0 && engineUnavailable ? (
        <p className="card__empty"><Unavailable reason={NEEDS_ENGINE} /> Connect Stockfish to see the engine's top moves.</p>
      ) : candidateMoves.length === 0 ? (
        <p className="card__empty">Make a move to see the engine's top lines.</p>
      ) : (
        <>
          <div className="cand-head" aria-hidden="true">
            <span>#</span>
            <span>Move</span>
            <span>White's expected score</span>
            <span className="cand-head__eval">Eval</span>
          </div>
          <ol className={`cand-list stagger ${isLoading ? "is-refreshing" : ""}`}>
            {candidateMoves.map((cand, idx) => {
              const whiteCp = sideToMove === "w" ? cand.centipawns : -cand.centipawns;
              const white = whiteWinPct(whiteCp);
              const tone = whiteCp > 50 ? "pos" : whiteCp < -50 ? "neg" : "even";
              const isHovered = hoveredUci === cand.uci;
              return (
                <li
                  key={cand.uci}
                  className={`cand-row cand-row--${cand.classification} ${isHovered ? "is-hovered" : ""}`}
                  style={{ "--i": idx } as React.CSSProperties}
                  tabIndex={0}
                  onMouseEnter={() => onHoverCandidateMove?.(cand.uci)}
                  onMouseLeave={() => onHoverCandidateMove?.(null)}
                  onFocus={() => onHoverCandidateMove?.(cand.uci)}
                  onBlur={() => onHoverCandidateMove?.(null)}
                  aria-label={`${idx + 1}. ${cand.san}, evaluation ${formatPawns(whiteCp)}`}
                >
                  <span className="cand-rank num">{idx + 1}</span>
                  <span className="cand-san">
                    {cand.san}
                    <Eye size={12} className="cand-peek" aria-hidden="true" />
                  </span>
                  <span className="cand-bar" title={`White's expected score ${white}% (wins plus half the draws), from the engine eval`}>
                    <span className="cand-bar__white" style={{ width: `${white}%` }} />
                  </span>
                  <span className={`cand-eval num cand-eval--${tone}`}>{formatPawns(whiteCp)}</span>
                  <span className="cand-sub">
                    <span className={`cand-quality cand-quality--${cand.classification}`}>
                      {QUALITY[cand.classification] ?? cand.classification}
                    </span>
                    {cand.loss_centipawns > 0 && <span className="num">−{cand.loss_centipawns} cp</span>}
                    {cand.blunder_probability !== null && (
                      <span title="Chance your opponent then loses a pawn or more on their reply">
                        Opponent slip chance <span className="num">{Math.round(cand.blunder_probability * 100)}%</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
};
