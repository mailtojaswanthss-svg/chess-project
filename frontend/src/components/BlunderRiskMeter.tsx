import React from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Flame,
  Info,
  Trophy,
  RotateCcw,
  Target,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import type { Analysis, SavedGame, TacticalAnalysis } from "../types/chess";
import { riskFor, coachingTakeaway } from "../utils/chessUtils";

interface BlunderRiskMeterProps {
  analysis: Analysis | null;
  tacticalAnalysis?: TacticalAnalysis | null;
  isAnalyzing: boolean;
  sideToMove: "w" | "b";
  isCheck: boolean;
  moveCount: number;
  lastMoveSan?: string;
  rating: number;
  outcome?: SavedGame | null;
  onHoverCandidateMove?: (uci: string | null) => void;
  onHoverThreatSquare?: (square: string | null) => void;
}

export const BlunderRiskMeter: React.FC<BlunderRiskMeterProps> = ({
  analysis,
  tacticalAnalysis,
  isAnalyzing,
  sideToMove,
  isCheck,
  moveCount,
  lastMoveSan,
  rating,
  outcome,
  onHoverCandidateMove,
  onHoverThreatSquare,
}) => {
  // If the game has completed, show the terminal state instead of stale metrics
  if (outcome) {
    const isWhiteWin = outcome.result.toLowerCase().includes("white wins");
    const isBlackWin = outcome.result.toLowerCase().includes("black wins");
    const isDraw = outcome.result.toLowerCase().includes("draw");

    return (
      <div className={`risk-card ${isDraw ? "medium" : "high"}`}>
        <div className="risk-card-header">
          <div className="active-turn-pill">
            <Trophy size={18} className={isDraw ? "risk-icon medium" : "risk-icon high"} />
            <div>
              <strong className="turn-title">{outcome.result}</strong>
              <span className="turn-sub">Game Decided by {outcome.reason}</span>
            </div>
          </div>
          <div className="risk-badge">
            <span className="dot pulse" />
            <span>GAME TERMINATED</span>
          </div>
        </div>

        <div className="risk-main-display">
          <div className="risk-number-wrap">
            <span className="risk-number">{isDraw ? "½-½" : isWhiteWin ? "1-0" : "0-1"}</span>
            <span className="risk-sub-label">Final Game Result</span>
          </div>

          <div className="risk-visual-gauge">
            <div className="gauge-track">
              <div
                className={`gauge-fill ${isDraw ? "medium" : "high"}`}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        <p className="risk-explanation">{coachingTakeaway(outcome)}</p>

        <div className="tactical-factors-section">
          <div className="factors-heading">
            <Info size={12} />
            <span>Post-Game Diagnostics</span>
          </div>
          <div className="factors-list">
            <div className="factor-pill danger">
              <span className="dot pulse" /> No legal moves remaining. Game concluded after {outcome.moves.length} plies.
            </div>
            <div className="factor-pill success">
              <RotateCcw size={13} /> Click <strong>Undo Last Move</strong> above to explore alternative defenses.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prob = tacticalAnalysis
    ? tacticalAnalysis.overall_blunder_probability
    : analysis
    ? analysis.blunder_probability
    : 0;
  const percentage = Math.round(prob * 100);
  const riskInfo = riskFor(prob);
  const activeSideLabel = sideToMove === "w" ? "White" : "Black";
  const activeSidePiece = sideToMove === "w" ? "♔" : "♚";

  const threats = tacticalAnalysis?.threats || [];
  const candidateMoves = tacticalAnalysis?.candidate_moves || [];
  const winChances = tacticalAnalysis?.win_chances;

  return (
    <div className={`risk-card ${riskInfo.tone} ${isAnalyzing ? "is-analyzing" : ""}`}>
      {/* 1. Header with Turn & Risk Badge */}
      <div className="risk-card-header">
        <div className="active-turn-pill">
          <span className="piece-icon">{activeSidePiece}</span>
          <div>
            <strong className="turn-title">{activeSideLabel} to move</strong>
            <span className="turn-sub">Assessing {activeSideLabel}&apos;s blunder likelihood</span>
          </div>
        </div>
        <div className="risk-badge">
          {riskInfo.tone === "high" ? (
            <Flame size={13} className="risk-icon high" />
          ) : riskInfo.tone === "medium" ? (
            <AlertTriangle size={13} className="risk-icon medium" />
          ) : (
            <ShieldCheck size={13} className="risk-icon low" />
          )}
          <span>{riskInfo.label}</span>
        </div>
      </div>

      {/* 2. Main Risk Gauge & Value */}
      <div className="risk-main-display">
        <div className="risk-number-wrap">
          <span className="risk-number">{isAnalyzing ? "..." : `${percentage}%`}</span>
          <span className="risk-sub-label">Predicted Blunder Probability</span>
        </div>

        <div className="risk-visual-gauge">
          <div className="gauge-track">
            <div
              className={`gauge-fill ${riskInfo.tone}`}
              style={{ width: `${Math.max(5, percentage)}%` }}
            />
          </div>
          <div className="gauge-markers">
            <span>0% Safe</span>
            <span>35% Moderate</span>
            <span>65% Critical Danger</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 3. Statistical Win/Draw/Loss Model Bar */}
      {winChances && (
        <div className="win-chances-widget">
          <div className="win-chances-labels">
            <span className="win-chance-tag white">White {Math.round(winChances.white * 100)}%</span>
            <span className="win-chance-tag draw">Draw {Math.round(winChances.draw * 100)}%</span>
            <span className="win-chance-tag black">Black {Math.round(winChances.black * 100)}%</span>
          </div>
          <div className="win-chances-bar">
            <div
              className="win-bar-segment white"
              style={{ width: `${winChances.white * 100}%` }}
              title={`White win chance: ${Math.round(winChances.white * 100)}%`}
            />
            <div
              className="win-bar-segment draw"
              style={{ width: `${winChances.draw * 100}%` }}
              title={`Draw chance: ${Math.round(winChances.draw * 100)}%`}
            />
            <div
              className="win-bar-segment black"
              style={{ width: `${winChances.black * 100}%` }}
              title={`Black win chance: ${Math.round(winChances.black * 100)}%`}
            />
          </div>
        </div>
      )}

      {/* 4. Tactical Threat Radar */}
      <div className="tactical-threat-radar">
        <div className="threat-radar-header">
          <div className="threat-radar-title">
            <Swords size={13} className="threat-header-icon" />
            <span>TACTICAL THREAT RADAR</span>
          </div>
          <span className={`threat-count-badge ${threats.length > 0 ? "active" : "clear"}`}>
            {threats.length === 0 ? "Radar Clear" : `${threats.length} ${threats.length === 1 ? "Threat" : "Threats"}`}
          </span>
        </div>

        {threats.length > 0 ? (
          <div className="threats-list">
            {threats.map((t, idx) => (
              <div
                key={idx}
                className={`threat-item ${t.motif}`}
                onMouseEnter={() => onHoverThreatSquare?.(t.square)}
                onMouseLeave={() => onHoverThreatSquare?.(null)}
                title={`Hover to highlight square ${t.square.toUpperCase()} on board`}
              >
                <span className="threat-motif-icon">
                  {t.motif === "pinned" ? (
                    <Shield size={12} />
                  ) : t.motif === "hanging" ? (
                    <Target size={12} />
                  ) : t.motif === "check" ? (
                    <Flame size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                </span>
                <span className="threat-desc">{t.description}</span>
                <span className="threat-square-pill">{t.square.toUpperCase()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="threat-clear-banner">
            <ShieldCheck size={14} className="clear-icon" />
            <span>No pinned, hanging, or under-defended pieces for {activeSideLabel}. Structure is sound.</span>
          </div>
        )}
      </div>

      {/* 5. Top Candidate Moves Matrix (Stockfish 16) */}
      {candidateMoves.length > 0 && (
        <div className="candidate-moves-section">
          <div className="candidates-header">
            <Sparkles size={13} className="candidates-header-icon" />
            <span>CANDIDATE MOVES (MULTI-PV)</span>
          </div>
          <div className="candidates-table">
            {candidateMoves.map((cand, idx) => {
              const evalPawns = (cand.centipawns / 100).toFixed(2);
              const evalSign = cand.centipawns > 0 ? "+" : "";
              const candRisk = Math.round(cand.blunder_probability * 100);

              return (
                <div
                  key={idx}
                  className={`candidate-row ${cand.classification}`}
                  onMouseEnter={() => onHoverCandidateMove?.(cand.uci)}
                  onMouseLeave={() => onHoverCandidateMove?.(null)}
                  title={`Hover to visualize ${cand.san} on board · Eval: ${evalSign}${evalPawns} · Opponent Response Risk: ${candRisk}%`}
                >
                  <div className="cand-rank-san">
                    <span className={`cand-badge ${cand.classification}`}>
                      {cand.classification.toUpperCase()}
                    </span>
                    <strong className="cand-san">{cand.san}</strong>
                  </div>
                  <div className="cand-meta">
                    <span className="cand-eval" title="Stockfish Centipawn Evaluation">
                      {evalSign}{evalPawns}
                    </span>
                    <span
                      className={`cand-blunder-risk ${
                        candRisk >= 65 ? "high" : candRisk >= 35 ? "med" : "low"
                      }`}
                      title="Predicted Opponent Blunder Likelihood in the resulting position"
                    >
                      Opp. Risk: {candRisk}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Coach Natural Language Insight */}
      <div className="coach-advice-box">
        <div className="coach-advice-header">
          <Info size={12} />
          <span>TACTICAL COACH INSIGHT ({rating} ELO MODEL)</span>
        </div>
        <p className="coach-advice-text">
          {tacticalAnalysis?.coach_explanation || riskInfo.description}
        </p>
      </div>

      {/* 7. Position Diagnostics */}
      <div className="tactical-factors-section">
        <div className="factors-heading">
          <Info size={12} />
          <span>Status Signals</span>
        </div>
        <div className="factors-list">
          {isCheck && (
            <div className="factor-pill danger">
              <span className="dot pulse" /> King is in Check! Legal responses are strictly limited.
            </div>
          )}
          {moveCount <= 6 ? (
            <div className="factor-pill neutral">
              <span className="dot" /> Opening phase: Standard book development minimizes risk.
            </div>
          ) : prob >= 0.65 ? (
            <div className="factor-pill danger">
              <span className="dot" /> High tactical tension: Severe threat vectors on the board.
            </div>
          ) : prob >= 0.35 ? (
            <div className="factor-pill warning">
              <span className="dot" /> Dynamic tension: Several candidate moves result in material loss.
            </div>
          ) : (
            <div className="factor-pill success">
              <span className="dot" /> Solid coordination: Defended structure and secure King.
            </div>
          )}
          {lastMoveSan && (
            <div className="factor-pill neutral">
              <span className="dot" /> Prior move played: <strong>{lastMoveSan}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
