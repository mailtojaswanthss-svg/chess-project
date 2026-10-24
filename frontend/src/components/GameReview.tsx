import "./GameReview.css";
import React from "react";
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  AlertOctagon,
  Flame,
  Award,
  Sparkles,
  Trophy,
  Zap,
  Info,
} from "lucide-react";
import type { GameReport, MoveAnalysisItem, MoveClassification } from "../types/chess";
import {
  classifyMove,
  getMoveBadgeInfo,
  calculateCapsAccuracy,
  estimatePerformanceRating,
} from "../utils/chessUtils";
import { playSound } from "../utils/audio";
import { MetricInfo } from "./MetricInfo";

interface GameReviewProps {
  gameReport: GameReport | null;
  selectedPly: number | null;
  onSelectPly: (ply: number) => void;
  onUploadPgn: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  onDownloadPracticePositions: () => void;
}

const BADGE_ORDER: MoveClassification[] = [
  "brilliant",
  "great",
  "best",
  "good",
  "book",
  "inaccuracy",
  "mistake",
  "blunder",
];

export const GameReview: React.FC<GameReviewProps> = ({
  gameReport,
  selectedPly,
  onSelectPly,
  onUploadPgn,
  isUploading,
  onDownloadPracticePositions,
}) => {
  const moves = gameReport?.moves ?? [];
  const selectedMove =
    selectedPly === 0 ? null : (moves.find((m) => m.ply === selectedPly) ?? (moves.length ? moves[0] : null));
  const selectedIndex = selectedMove ? moves.indexOf(selectedMove) : (selectedPly === 0 ? -1 : (moves.length ? 0 : -1));

  // Breakdown by side (White vs Black)
  const whiteMoves = moves.filter((m) => m.player === "White");
  const blackMoves = moves.filter((m) => m.player === "Black");

  // Accuracy (our own formula, see utils/metricCopy.ts)
  const caps = gameReport?.caps_accuracy ?? calculateCapsAccuracy(moves);
  const whiteAvgLoss = whiteMoves.length
    ? Math.round(whiteMoves.reduce((acc, m) => acc + m.evaluation_loss_centipawns, 0) / whiteMoves.length)
    : 0;
  const blackAvgLoss = blackMoves.length
    ? Math.round(blackMoves.reduce((acc, m) => acc + m.evaluation_loss_centipawns, 0) / blackMoves.length)
    : 0;

  const whiteElo =
    gameReport?.performance_rating?.white ?? estimatePerformanceRating(caps.white, whiteAvgLoss);
  const blackElo =
    gameReport?.performance_rating?.black ?? estimatePerformanceRating(caps.black, blackAvgLoss);

  // Count badges
  const badgeCounts = {
    white: {} as Record<MoveClassification, number>,
    black: {} as Record<MoveClassification, number>,
  };
  BADGE_ORDER.forEach((b) => {
    badgeCounts.white[b] = 0;
    badgeCounts.black[b] = 0;
  });

  moves.forEach((m) => {
    const cls: MoveClassification =
      m.classification ?? classifyMove(m.evaluation_loss_centipawns, m.ply);
    const side = m.player === "White" ? "white" : "black";
    if (badgeCounts[side][cls] !== undefined) {
      badgeCounts[side][cls]++;
    } else {
      badgeCounts[side]["good"]++;
    }
  });

  function step(delta: number) {
    if (!moves.length) return;
    if (selectedIndex === -1 && delta > 0) {
      onSelectPly(moves[0].ply);
      return;
    }
    const nextIdx = selectedIndex + delta;
    if (nextIdx < 0) {
      onSelectPly(0);
      playSound("click");
      return;
    }
    const clampedIdx = Math.min(moves.length - 1, nextIdx);
    const targetMove = moves[clampedIdx];
    const cls = targetMove.classification ?? classifyMove(targetMove.evaluation_loss_centipawns, targetMove.ply);
    if (cls === "brilliant") playSound("brilliant");
    else playSound("click");
    onSelectPly(targetMove.ply);
  }

  const selectedCls: MoveClassification = selectedMove
    ? selectedMove.classification ?? classifyMove(selectedMove.evaluation_loss_centipawns, selectedMove.ply)
    : "good";
  const selectedBadge = getMoveBadgeInfo(selectedCls);

  // Circular gauge rendering helper
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const whiteOffset = circumference - (caps.white / 100) * circumference;
  const blackOffset = circumference - (caps.black / 100) * circumference;

  return (
    <div className="review-dashboard">
      {/* 1. Upload Header */}
      <div className="review-upload-bar">
        <label className="upload-pgn-btn">
          <Upload size={15} />
          <span>{isUploading ? "Analyzing Game PGN..." : "Upload a PGN to review"}</span>
          <input type="file" accept=".pgn,.txt" onChange={onUploadPgn} disabled={isUploading} />
        </label>
        {gameReport && (
          <button
            className="secondary-btn"
            onClick={onDownloadPracticePositions}
            title="Export critical blunder positions as training FENs"
          >
            <Download size={15} /> Export Blunder FENs
          </button>
        )}
      </div>

      {!gameReport ? (
        <div className="review-empty-state">
          <AlertOctagon size={36} className="empty-icon" />
          <h3>No Game Analysis Loaded</h3>
          <p>
            Upload any standard chess PGN file above, or finish a game in <strong>Play & Train</strong> mode to
            inspect calibrated blunder risks, accuracy dials, and iconic move badges move by move.
          </p>
        </div>
      ) : (
        <div className="review-content">
          {/* 2. Accuracy and estimated performance dials */}
          <div className="caps-dials-container">
            <div className="caps-card white-caps">
              <div className="caps-dial-wrap">
                <svg viewBox="0 0 100 100" className="caps-svg">
                  <circle cx="50" cy="50" r={radius} className="caps-track" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="caps-progress white"
                    strokeDasharray={circumference}
                    strokeDashoffset={whiteOffset}
                  />
                </svg>
                <div className="caps-dial-center">
                  <span className="caps-pct">{caps.white}%</span>
                  <span className="caps-sub">Accuracy</span>
                </div>
              </div>
              <div className="caps-info">
                <div className="caps-player">
                  <div className="player-badge-pill">♔ White</div>
                  <MetricInfo metric="accuracy" />
                </div>
                <div className="caps-elo">
                  <Award size={14} className="text-cyan" />
                  <span>Est. performance: <strong>{whiteElo}</strong></span>
                  <MetricInfo metric="performance" />
                </div>
                <span className="caps-summary-text">{whiteMoves.length} moves · {whiteAvgLoss} cp avg loss</span>
              </div>
            </div>

            <div className="caps-vs-badge">
              <span>VS</span>
            </div>

            <div className="caps-card black-caps">
              <div className="caps-dial-wrap">
                <svg viewBox="0 0 100 100" className="caps-svg">
                  <circle cx="50" cy="50" r={radius} className="caps-track" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="caps-progress black"
                    strokeDasharray={circumference}
                    strokeDashoffset={blackOffset}
                  />
                </svg>
                <div className="caps-dial-center">
                  <span className="caps-pct">{caps.black}%</span>
                  <span className="caps-sub">Accuracy</span>
                </div>
              </div>
              <div className="caps-info">
                <div className="caps-player">
                  <div className="player-badge-pill black">♚ Black</div>
                  <MetricInfo metric="accuracy" />
                </div>
                <div className="caps-elo">
                  <Award size={14} className="text-cyan" />
                  <span>Est. performance: <strong>{blackElo}</strong></span>
                  <MetricInfo metric="performance" />
                </div>
                <span className="caps-summary-text">{blackMoves.length} moves · {blackAvgLoss} cp avg loss</span>
              </div>
            </div>
          </div>

          {/* 3. Iconic Move Classification Badges Grid */}
          <div className="badges-breakdown-card">
            <div className="badges-header">
              <Sparkles size={15} className="text-gold" />
              <span>MOVE CLASSIFICATION BREAKDOWN</span>
            </div>
            <div className="badges-table">
              <div className="badge-row header">
                <span className="col-white">♔ White</span>
                <span className="col-badge">Badge</span>
                <span className="col-black">♚ Black</span>
              </div>
              {BADGE_ORDER.map((cls) => {
                const info = getMoveBadgeInfo(cls);
                const wCount = badgeCounts.white[cls] || 0;
                const bCount = badgeCounts.black[cls] || 0;
                return (
                  <div key={cls} className={`badge-row ${cls}`}>
                    <span className="col-white num">{wCount}</span>
                    <div className="col-badge badge-tag" style={{ color: info.color, backgroundColor: info.badgeBg }}>
                      <span className="badge-sym">{info.symbol}</span>
                      <span className="badge-txt">{info.label}</span>
                    </div>
                    <span className="col-black num">{bCount}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Interactive Evaluation & Blunder Timeline (SVG) */}
          <div className="eval-chart-container">
            <div className="chart-title">
              <span>GAME EVALUATION & BLUNDER TIMELINE</span>
              <small>Click any bar/dot to jump directly to that position</small>
            </div>
            <div className="svg-chart-wrap">
              <svg viewBox={`0 0 ${Math.max(300, moves.length * 14)} 100`} className="eval-svg">
                <line x1="0" y1="50" x2={Math.max(300, moves.length * 14)} y2="50" style={{ stroke: "rgb(var(--fg-rgb) / 0.15)" }} strokeDasharray="3 3" />
                {moves.map((m, idx) => {
                  const x = idx * 14 + 7;
                  const loss = Math.min(50, m.evaluation_loss_centipawns / 10);
                  const isBlunder = m.is_blunder;
                  const isSelected = selectedMove?.ply === m.ply;
                  const barY = m.player === "White" ? 50 - loss : 50;
                  const barHeight = Math.max(4, loss);
                  const cls = m.classification ?? classifyMove(m.evaluation_loss_centipawns, m.ply);
                  const isBrilliant = cls === "brilliant";

                  return (
                    <g
                      key={m.ply}
                      onClick={() => {
                        if (isBrilliant) playSound("brilliant");
                        else playSound("click");
                        onSelectPly(m.ply);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x={x - 4}
                        y={barY}
                        width="8"
                        height={barHeight}
                        rx="2"
                        className={`chart-bar ${
                          isBrilliant
                            ? "brilliant-bar"
                            : isBlunder
                            ? "blunder-bar"
                            : m.risk_band === "high"
                            ? "high-bar"
                            : "normal-bar"
                        } ${isSelected ? "selected-bar" : ""}`}
                      />
                      {isBlunder && (
                        <circle cx={x} cy={m.player === "White" ? barY - 4 : barY + barHeight + 4} r="3" style={{ fill: "var(--danger)" }} />
                      )}
                      {isBrilliant && (
                        <circle cx={x} cy={m.player === "White" ? barY - 4 : barY + barHeight + 4} r="3.5" style={{ fill: "var(--accent)" }} />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* 5. Step Navigation Toolbar */}
          <div className="review-step-toolbar">
            <button
              className="icon-action-btn"
              onClick={() => onSelectPly(0)}
              disabled={selectedPly === 0}
              title="Game start (before move 1)"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className="secondary-btn"
              onClick={() => step(-1)}
              disabled={selectedPly === 0}
              title="Previous move"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <span className="step-indicator">
              {selectedPly === 0
                ? `Start Position (0 of ${moves.length})`
                : `Move ${selectedMove ? `${selectedMove.move_number}${selectedMove.ply % 2 === 1 ? "." : "..."} ${selectedMove.san}` : "-"} (${selectedIndex + 1} of ${moves.length})`}
            </span>

            <button
              className="secondary-btn"
              onClick={() => step(1)}
              disabled={selectedIndex >= moves.length - 1}
              title="Next move"
            >
              Next <ChevronRight size={16} />
            </button>
            <button
              className="icon-action-btn"
              onClick={() => onSelectPly(moves[moves.length - 1].ply)}
              disabled={selectedIndex >= moves.length - 1}
              title="Last move"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          {/* 6. Detailed Card for Selected Move with Iconic Badge */}
          {selectedMove && (
            <div
              className="selected-move-card-modern"
              style={{ borderLeftColor: selectedBadge.color }}
            >
              <div className="move-card-top-row">
                <div className="move-player-title">
                  <span className="ply-number">Ply #{selectedMove.ply}</span>
                  <strong>{selectedMove.player} played {selectedMove.san}</strong>
                </div>

                {/* Iconic Floating Badge */}
                <div
                  className="iconic-move-badge pop"
                  style={{ backgroundColor: selectedBadge.badgeBg, color: selectedBadge.color, borderColor: selectedBadge.color }}
                >
                  <span className="badge-symbol">{selectedBadge.symbol}</span>
                  <span className="badge-name">{selectedBadge.label}</span>
                </div>
              </div>

              <p className="badge-explanation">{selectedBadge.description}</p>

              <div className="move-card-stats-grid">
                <div className="stat-pill">
                  <span className="stat-sub">Eval Loss</span>
                  <strong className={selectedMove.evaluation_loss_centipawns > 100 ? "text-danger" : ""}>
                    -{selectedMove.evaluation_loss_centipawns} cp
                  </strong>
                </div>
                <div className="stat-pill">
                  <span className="stat-sub">
                    Risk on this move <MetricInfo metric="moveRisk" />
                  </span>
                  <strong className={selectedMove.probability >= 0.5 ? "text-danger" : ""}>
                    {Math.round(selectedMove.probability * 100)}%
                  </strong>
                </div>
                <div className="stat-pill">
                  <span className="stat-sub">UCI Representation</span>
                  <strong className="font-mono">{selectedMove.uci}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 7. Critical Moments Quick List */}
          <div className="critical-moments-box">
            <div className="moments-title">
              <Flame size={14} className="danger-icon" />
              <span>CRITICAL BLUNDER MOMENTS &amp; TACTICAL TURNING POINTS</span>
            </div>
            <div className="moments-pills">
              {moves
                .filter((m) => m.is_blunder || m.risk_band === "high")
                .map((m) => (
                  <button
                    key={m.ply}
                    className={`moment-pill ${m.is_blunder ? "is-blunder" : "is-high"} ${selectedPly === m.ply ? "active" : ""}`}
                    onClick={() => {
                      playSound("click");
                      onSelectPly(m.ply);
                    }}
                  >
                    <span>{m.move_number}{m.ply % 2 === 1 ? "." : "..."} {m.san}</span>
                    <small>{Math.round(m.probability * 100)}% risk</small>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
