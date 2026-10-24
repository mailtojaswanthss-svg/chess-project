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
  Brain,
  Loader2,
} from "lucide-react";
import type { Analysis, SavedGame, TacticalAnalysis, CoachExplanation } from "../types/chess";
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
  coachAdvice?: CoachExplanation | null;
  onFetchCoachAdvice?: () => void;
  isFetchingCoachAdvice?: boolean;
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
  rating: _rating,
  outcome,
  coachAdvice,
  onFetchCoachAdvice,
  isFetchingCoachAdvice,
  onHoverCandidateMove: _onHoverCandidateMove,
  onHoverThreatSquare,
}) => {
  // Terminal state display
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
            <span>GAME CONCLUDED</span>
          </div>
        </div>

        <div className="risk-main-display">
          <div className="risk-number-wrap">
            <span className="risk-number">{isDraw ? "½-½" : isWhiteWin ? "1-0" : "0-1"}</span>
            <span className="risk-sub-label">Final Match Score</span>
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
              <span className="dot pulse" /> Game concluded after {outcome.moves.length} plies.
            </div>
            <div className="factor-pill success">
              <RotateCcw size={13} /> Click <strong>Undo</strong> above or review in Settings &amp; Archive.
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
  const threats = tacticalAnalysis?.threats || [];
  const winChances = tacticalAnalysis?.win_chances;

  return (
    <div className={`risk-card ${riskInfo.tone} ${isAnalyzing ? "is-analyzing" : ""}`}>
      {/* 1. Header with Turn & Risk Badge */}
      <div className="risk-card-header">
        <div className="active-turn-pill">
          <span className="piece-icon">{sideToMove === "w" ? "♔" : "♚"}</span>
          <div>
            <strong className="turn-title">{activeSideLabel} to move</strong>
            <span className="turn-sub">Calibrated Cognitive Tension</span>
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

      {/* 3. Win / Draw / Loss Probability Distribution */}
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

      {/* 4. Grandmaster AI Coach Guidance */}
      <div className="coach-advice-box gm-coach-box">
        <div className="coach-advice-header">
          <div className="coach-header-left">
            <Brain size={15} className="text-cyan" />
            <strong className="coach-header-title">GRANDMASTER AI COACH</strong>
          </div>
          {onFetchCoachAdvice && (
            <button
              className="gm-ask-btn"
              onClick={onFetchCoachAdvice}
              disabled={isFetchingCoachAdvice}
              title="Query Agentic Coach for deep pedagogical reasoning"
            >
              {isFetchingCoachAdvice ? (
                <>
                  <Loader2 size={11} className="spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={11} />
                  <span>{coachAdvice ? "Re-Analyze" : "Ask GM Coach"}</span>
                </>
              )}
            </button>
          )}
        </div>

        {coachAdvice ? (
          <div className="gm-advice-content">
            <div className="gm-concept-row">
              <span className="gm-concept-pill">👑 {coachAdvice.concept}</span>
              <span className="gm-source-tag">{coachAdvice.engine_source}</span>
            </div>
            <h4 className="gm-headline">"{coachAdvice.headline}"</h4>
            <p className="coach-advice-text gm-explanation">{coachAdvice.explanation}</p>
            {coachAdvice.threat_summary && (
              <div className="gm-threat-alert">
                <AlertTriangle size={12} className="text-amber" />
                <span><strong>Opponent Threat:</strong> {coachAdvice.threat_summary}</span>
              </div>
            )}
            <div className="gm-rec-row">
              <span className="gm-rec-tag">Recommended: <strong>{coachAdvice.recommended_move}</strong></span>
              <div className="gm-tags">
                {coachAdvice.tactical_tags.map((tag, i) => (
                  <span key={i} className="gm-tag">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="coach-advice-text">
            {tacticalAnalysis?.coach_explanation || riskInfo.description}
          </p>
        )}
      </div>

      {/* 5. Tactical Threat Radar */}
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

      {/* 6. Position Diagnostics & Status Signals */}
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
