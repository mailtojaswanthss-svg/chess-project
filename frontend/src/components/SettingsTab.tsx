import React from "react";
import {
  Settings2,
  Volume2,
  VolumeX,
  Maximize2,
  Trash2,
  Play,
  Eye,
  Download,
  Inbox,
  Cpu,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Code2,
} from "lucide-react";
import type { SavedGame, ModelHealth } from "../types/chess";
import { playSound } from "../utils/audio";

interface SettingsTabProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  boardSize: "compact" | "standard" | "large";
  onChangeBoardSize: (size: "compact" | "standard" | "large") => void;
  savedGames: SavedGame[];
  onLoadGame: (game: SavedGame) => void;
  onReviewGame?: (game: SavedGame) => void;
  onDownloadPgn: (game: SavedGame) => void;
  onDeleteGame: (id: string) => void;
  onClearAllGames: () => void;
  modelHealth: ModelHealth | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  soundEnabled,
  onToggleSound,
  boardSize,
  onChangeBoardSize,
  savedGames,
  onLoadGame,
  onReviewGame,
  onDownloadPgn,
  onDeleteGame,
  onClearAllGames,
  modelHealth,
}) => {
  const isModelActive = modelHealth?.model_loaded ?? false;

  return (
    <div className="settings-tab-container">
      {/* 1. Header */}
      <div className="settings-header-banner">
        <div className="settings-badge-pill">
          <Settings2 size={16} className="text-cyan" />
          <span>SYSTEM CONTROLS &amp; REPOSITORY</span>
        </div>
        <h2>Settings, Match Archive &amp; Engineering Dossier</h2>
        <p>
          Configure audio-visual preferences, manage your recorded matches with granular deletion, and explore the
          hybrid AI architecture.
        </p>
      </div>

      <div className="settings-layout-grid">
        {/* Left Column: Preferences & Architecture Credits */}
        <div className="settings-left-col">
          {/* Card A: Audio & Display Preferences */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Settings2 size={15} className="text-cyan" />
              <strong>DISPLAY &amp; AUDIO PREFERENCES</strong>
            </div>

            <div className="settings-options-list">
              {/* Sound Toggle */}
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-name">Audio &amp; Move Cues</div>
                  <div className="setting-desc">Tactical alerts, captures, checks, and blunder audio feedback</div>
                </div>
                <button
                  className={`toggle-action-btn ${soundEnabled ? "active" : ""}`}
                  onClick={() => {
                    onToggleSound();
                  }}
                  title={soundEnabled ? "Mute all sounds" : "Enable all audio"}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 size={15} /> <span>Enabled</span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={15} /> <span>Muted</span>
                    </>
                  )}
                </button>
              </div>

              {/* Board Size Selector */}
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-name">Board Viewport Scale</div>
                  <div className="setting-desc">Adjust the Tactical Arena board dimensions</div>
                </div>
                <div className="board-size-selector-group">
                  {(["compact", "standard", "large"] as const).map((sz) => (
                    <button
                      key={sz}
                      className={`size-choice-btn ${boardSize === sz ? "active" : ""}`}
                      onClick={() => {
                        playSound("click");
                        onChangeBoardSize(sz);
                      }}
                    >
                      <Maximize2 size={12} />
                      <span>{sz.charAt(0).toUpperCase() + sz.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Permanent Lead Architect & Platform Credits */}
          <div className="settings-card credits-card">
            <div className="settings-card-header">
              <Sparkles size={15} className="text-gold" />
              <strong className="credits-heading">LEAD ARCHITECT &amp; PLATFORM CREDITS</strong>
            </div>

            <div className="architect-info-box">
              <div className="architect-avatar">JS</div>
              <div className="architect-details">
                <h3 className="architect-name">Jaswanth S S</h3>
                <span className="architect-role">Created &amp; Engineered by Lead AI/ML Architect</span>
                <p className="architect-edu">
                  <GraduationCap size={14} className="text-cyan inline-icon" />
                  <span>
                    <strong>B.Tech in Computer Science &amp; Engineering (AI &amp; ML)</strong>
                    <br />
                    SRM Institute of Science and Technology (SRMIST)
                  </span>
                </p>
              </div>
            </div>

            <div className="architecture-overview-section">
              <h4 className="tech-stack-title">
                <Cpu size={14} className="text-cyan" />
                <span>Hybrid AI Engine Architecture</span>
              </h4>
              <div className="tech-pillars-list">
                <div className="tech-pillar-item">
                  <span className="pillar-dot cyan" />
                  <div>
                    <strong>Calibrated Random Forest:</strong> Pre-cognitive blunder prediction trained on 100,000+ GM
                    positions evaluating 18 strategic and geometric features.
                  </div>
                </div>
                <div className="tech-pillar-item">
                  <span className="pillar-dot emerald" />
                  <div>
                    <strong>Stockfish 16 Multi-PV:</strong> Deep engine tactical calculation delivering top 3 candidate
                    lines with exact centipawn evaluations and win probabilities.
                  </div>
                </div>
                <div className="tech-pillar-item">
                  <span className="pillar-dot violet" />
                  <div>
                    <strong>Maia-2 Neural Engine:</strong> Human-like sparring engine modeled on authentic human
                    decision psychology across discrete Elo rating bands (1100 to 1900+).
                  </div>
                </div>
                <div className="tech-pillar-item">
                  <span className="pillar-dot gold" />
                  <div>
                    <strong>Gemini Agentic Coach:</strong> Context-engineered LLM coaching agent synthesizing tactical
                    motifs, threats, and player Blunder DNA archetypes.
                  </div>
                </div>
              </div>
            </div>

            {/* Model Telemetry */}
            <div className="telemetry-compact-box">
              <div className="telemetry-pill">
                <span className="telemetry-label">Status:</span>
                <span className={`telemetry-val ${isModelActive ? "online" : "offline"}`}>
                  {isModelActive ? "● Engine Online" : "○ Disconnected"}
                </span>
              </div>
              <div className="telemetry-pill">
                <span className="telemetry-label">Samples:</span>
                <span className="telemetry-val">
                  {modelHealth?.model_train_samples?.toLocaleString() ?? "100,000+"}
                </span>
              </div>
              {modelHealth?.model_metrics?.roc_auc && (
                <div className="telemetry-pill">
                  <span className="telemetry-label">ROC-AUC:</span>
                  <span className="telemetry-val">{modelHealth.model_metrics.roc_auc.toFixed(3)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Granular Match Archive */}
        <div className="settings-right-col">
          <div className="settings-card archive-full-card">
            <div className="archive-card-top-bar">
              <div className="archive-title-wrap">
                <Code2 size={16} className="text-cyan" />
                <strong>MATCH ARCHIVE ({savedGames.length})</strong>
              </div>
              {savedGames.length > 0 && (
                <button
                  className="secondary-btn danger-btn btn-sm"
                  onClick={onClearAllGames}
                  title="Wipe entire local match history"
                >
                  <Trash2 size={13} />
                  <span>Clear Entire History</span>
                </button>
              )}
            </div>

            {savedGames.length === 0 ? (
              <div className="archive-empty-state">
                <Inbox size={42} className="empty-icon" />
                <h4>No Matches Recorded Yet</h4>
                <p>
                  Games played in the Tactical Arena (against Stockfish, Maia, or Tricky Bot) are automatically saved
                  here with complete move logs and PGN files.
                </p>
              </div>
            ) : (
              <div className="saved-games-scroll-list">
                {savedGames.map((game) => {
                  const dateStr = new Date(game.completedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const isWhiteWin = game.result.toLowerCase().includes("white wins");
                  const isBlackWin = game.result.toLowerCase().includes("black wins");
                  const badgeClass = isWhiteWin ? "white-win" : isBlackWin ? "black-win" : "draw";

                  return (
                    <div key={game.id} className="game-archive-item">
                      <div className="archive-item-main">
                        <div className="item-meta-row">
                          <span className={`result-tag ${badgeClass}`}>{game.result}</span>
                          <span className="game-date">{dateStr}</span>
                          {game.mode && <span className="game-mode-tag">Mode: {game.mode}</span>}
                        </div>
                        <div className="game-reason-text">{game.reason}</div>
                        <div className="game-plies-count">{game.moves.length} plies played</div>
                      </div>

                      {/* Granular Action Buttons */}
                      <div className="archive-item-actions">
                        <button
                          className="secondary-btn btn-sm"
                          onClick={() => {
                            playSound("click");
                            onLoadGame(game);
                          }}
                          title="Load match into Tactical Arena"
                        >
                          <Play size={13} />
                          <span>Load</span>
                        </button>

                        {onReviewGame && (
                          <button
                            className="secondary-btn btn-sm review-btn"
                            onClick={() => {
                              playSound("click");
                              onReviewGame(game);
                            }}
                            title="Open in CAPS Game Review"
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </button>
                        )}

                        <button
                          className="secondary-btn btn-sm"
                          onClick={() => onDownloadPgn(game)}
                          title="Download PGN notation"
                        >
                          <Download size={13} />
                          <span>PGN</span>
                        </button>

                        {/* Granular Single-Match Deletion */}
                        <button
                          className="icon-action-btn delete-btn"
                          onClick={() => {
                            playSound("click");
                            onDeleteGame(game.id);
                          }}
                          title="Delete this match record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
