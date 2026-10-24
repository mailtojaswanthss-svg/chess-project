import "./CandidateMovesCard.css";
import React from "react";
import { Sparkles, Eye } from "lucide-react";
import type { CandidateMove } from "../types/chess";

interface CandidateMovesCardProps {
  candidateMoves: CandidateMove[];
  /** Candidate scores arrive from the side-to-move's point of view. */
  sideToMove: "w" | "b";
  isLoading?: boolean;
  onHoverCandidateMove?: (uci: string | null) => void;
  hoveredUci?: string | null;
}

// Expected score for White from a White-perspective centipawn evaluation
const whiteWinPct = (whiteCp: number): number => {
  const pct = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteCp)) - 1);
  return Math.max(2, Math.min(98, Math.round(pct)));
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
        <span className="card__meta">Stockfish multi-PV</span>
      </header>

      {showSkeleton ? (
        <div className="cand-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton cand-skeleton" />
          ))}
        </div>
      ) : candidateMoves.length === 0 ? (
        <p className="card__empty">Make a move to see the engine's top lines.</p>
      ) : (
        <>
          <div className="cand-head" aria-hidden="true">
            <span>#</span>
            <span>Move</span>
            <span>White / Black</span>
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
                  <span className="cand-bar" title={`White ${white}% · Black ${100 - white}%`}>
                    <span className="cand-bar__white" style={{ width: `${white}%` }} />
                  </span>
                  <span className={`cand-eval num cand-eval--${tone}`}>{formatPawns(whiteCp)}</span>
                  <span className="cand-sub">
                    <span className={`cand-quality cand-quality--${cand.classification}`}>
                      {QUALITY[cand.classification] ?? cand.classification}
                    </span>
                    {cand.loss_centipawns > 0 && <span className="num">−{cand.loss_centipawns} cp</span>}
                    <span>
                      Reply-error risk <span className="num">{Math.round(cand.blunder_probability * 100)}%</span>
                    </span>
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
