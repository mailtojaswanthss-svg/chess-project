import React from "react";
import { Sparkles, ArrowRight, Eye } from "lucide-react";
import type { CandidateMove } from "../types/chess";

interface CandidateMovesCardProps {
  candidateMoves: CandidateMove[];
  onHoverCandidateMove?: (uci: string | null) => void;
  hoveredUci?: string | null;
}

export const CandidateMovesCard: React.FC<CandidateMovesCardProps> = ({
  candidateMoves,
  onHoverCandidateMove,
  hoveredUci,
}) => {
  if (!candidateMoves || candidateMoves.length === 0) {
    return null;
  }

  const getRankBadge = (idx: number, cand: CandidateMove) => {
    if (idx === 0) {
      return { text: "Rank 1 Best ★", className: "rank-best" };
    }
    if (idx === 1) {
      return { text: "Rank 2 Good ○", className: "rank-good" };
    }
    if (idx === 2) {
      return { text: "Rank 3 Inaccuracy ?!", className: "rank-inaccuracy" };
    }
    return { text: `Rank ${idx + 1} Alternative`, className: "rank-alt" };
  };

  // Convert centipawns to estimated White winning percentage
  const getWinProb = (cp: number): number => {
    const prob = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
    return Math.max(2, Math.min(98, Math.round(prob)));
  };

  const getTacticalTags = (idx: number, cand: CandidateMove): string[] => {
    const tags: string[] = [];
    if (idx === 0) tags.push("Best Line");
    if (cand.loss_centipawns === 0) tags.push("Engine Choice");
    else if (cand.loss_centipawns <= 35) tags.push("Sound Defense");
    else if (cand.loss_centipawns <= 90) tags.push("Suboptimal");
    else tags.push("Sharp Concession");

    if (cand.classification === "brilliant") tags.push("Brilliant");
    else if (cand.classification === "book") tags.push("Opening Book");

    return tags;
  };

  return (
    <div className="candidate-moves-card">
      <div className="candidate-card-header">
        <div className="candidate-header-left">
          <Sparkles size={15} className="text-cyan" />
          <strong className="candidate-title">MULTI-PV CANDIDATE LINES</strong>
        </div>
        <span className="candidate-subtitle-badge">Stockfish 16 Multi-PV</span>
      </div>

      <div className="candidate-rows-container">
        {candidateMoves.map((cand, idx) => {
          const rank = getRankBadge(idx, cand);
          const evalPawns = (cand.centipawns / 100).toFixed(2);
          const evalSign = cand.centipawns > 0 ? "+" : "";
          const winProbWhite = getWinProb(cand.centipawns);
          const winProbBlack = 100 - winProbWhite;
          const oppBlunderRisk = Math.round(cand.blunder_probability * 100);
          const tags = getTacticalTags(idx, cand);
          const isHovered = hoveredUci === cand.uci;

          return (
            <div
              key={cand.uci + idx}
              className={`candidate-pv-row ${rank.className} ${isHovered ? "is-hovered" : ""}`}
              onMouseEnter={() => onHoverCandidateMove?.(cand.uci)}
              onMouseLeave={() => onHoverCandidateMove?.(null)}
              title={`Hover to preview move ${cand.san} on board (${cand.uci})`}
            >
              {/* Top Row: Rank Badge, SAN, Centipawn Eval */}
              <div className="cand-pv-top">
                <div className="cand-pv-meta-left">
                  <span className={`cand-rank-badge ${rank.className}`}>{rank.text}</span>
                  <span className="cand-san-pill">
                    <strong>{cand.san}</strong>
                    <span className="cand-uci-muted">({cand.uci})</span>
                  </span>
                </div>

                <div className="cand-pv-meta-right">
                  <span
                    className={`cand-eval-badge ${
                      cand.centipawns > 50 ? "eval-positive" : cand.centipawns < -50 ? "eval-negative" : "eval-even"
                    }`}
                  >
                    {evalSign}{evalPawns}
                  </span>
                  <div className="cand-hover-hint">
                    <Eye size={12} />
                    <span>Preview</span>
                  </div>
                </div>
              </div>

              {/* Middle Row: Animated Win Probability Bar */}
              <div className="cand-winbar-wrap">
                <div className="cand-winbar-track">
                  <div
                    className="cand-winbar-fill-white"
                    style={{ width: `${winProbWhite}%` }}
                    title={`White Win Probability: ${winProbWhite}%`}
                  />
                  <div
                    className="cand-winbar-fill-black"
                    style={{ width: `${winProbBlack}%` }}
                    title={`Black Win Probability: ${winProbBlack}%`}
                  />
                </div>
                <div className="cand-winbar-labels">
                  <span className="cand-win-label white">W {winProbWhite}%</span>
                  <span className="cand-opp-risk-label">Opponent Error Likelihood: {oppBlunderRisk}%</span>
                  <span className="cand-win-label black">B {winProbBlack}%</span>
                </div>
              </div>

              {/* Bottom Row: Tactical Tags */}
              <div className="cand-tags-row">
                {tags.map((tag, tIdx) => (
                  <span key={tIdx} className="cand-tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
