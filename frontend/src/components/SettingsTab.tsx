import "./SettingsTab.css";
import React from "react";
import {
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Trash2,
  Play,
  Eye,
  Download,
  Inbox,
  Cpu,
  GraduationCap,
  Sparkles,
  Archive,
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

const MODE_LABEL: Record<string, string> = {
  free_lab: "Analysis",
  max_engine: "Stockfish",
  human_sparring: "Maia",
  tricky_bot: "Trapper",
  trap_puzzle: "Trap puzzle",
};

const STACK = [
  {
    tone: "accent",
    name: "Calibrated random forest",
    text: "Predicts how likely a human is to blunder in a position, from 14 board features.",
  },
  {
    tone: "good",
    name: "Stockfish multi-PV",
    text: "Top three candidate lines with centipawn evaluations and win chances.",
  },
  {
    tone: "violet",
    name: "Maia-2",
    text: "A human-like sparring partner trained to play like people at a given rating.",
  },
  {
    tone: "gold",
    name: "Gemini coach",
    text: "Turns the engine's findings, threats and your DNA profile into plain-language advice.",
  },
];

function resultTone(result: string): "white" | "black" | "draw" {
  const r = result.toLowerCase();
  if (r.includes("white wins")) return "white";
  if (r.includes("black wins")) return "black";
  return "draw";
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
  const auc = modelHealth?.model_metrics?.roc_auc;

  return (
    <div className="view settings">
      <div className="page-head">
        <div>
          <h1 className="page-title">Games &amp; Settings</h1>
          <p className="page-sub">Preferences, your saved matches, and how the engine works.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-col stagger">
          <section className="card" style={{ "--i": 0 } as React.CSSProperties} aria-label="Preferences">
            <header className="card__header">
              <h2 className="card__title">
                <SlidersHorizontal size={16} /> Preferences
              </h2>
            </header>
            <div className="setting">
              <div>
                <div className="setting__name">Sound</div>
                <div className="setting__desc">Move, capture, check and blunder cues</div>
              </div>
              <button
                className={`switch ${soundEnabled ? "is-on" : ""}`}
                role="switch"
                aria-checked={soundEnabled}
                aria-label="Sound"
                onClick={onToggleSound}
              >
                <span className="switch__knob">{soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}</span>
              </button>
            </div>
            <div className="setting">
              <div>
                <div className="setting__name">Board size</div>
                <div className="setting__desc">Maximum size of the arena board</div>
              </div>
              <div className="segmented" role="group" aria-label="Board size">
                {(["compact", "standard", "large"] as const).map((sz) => (
                  <button
                    key={sz}
                    className={`segmented__btn ${boardSize === sz ? "is-active" : ""}`}
                    aria-pressed={boardSize === sz}
                    onClick={() => {
                      playSound("click");
                      onChangeBoardSize(sz);
                    }}
                  >
                    {sz.charAt(0).toUpperCase() + sz.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card" style={{ "--i": 1 } as React.CSSProperties} aria-label="Engine">
            <header className="card__header">
              <h2 className="card__title">
                <Cpu size={16} /> Engine
              </h2>
              <span className={`pill ${isModelActive ? "pill--good" : "pill--warn"}`}>
                <span className="live-dot" /> {isModelActive ? "Online" : "Offline"}
              </span>
            </header>
            <dl className="engine-stats">
              <div>
                <dt>Training samples</dt>
                <dd className="num">{modelHealth?.model_train_samples?.toLocaleString() ?? "—"}</dd>
              </div>
              <div>
                <dt>ROC-AUC</dt>
                <dd className="num">{typeof auc === "number" ? auc.toFixed(3) : "—"}</dd>
              </div>
            </dl>
            <ul className="stack-list">
              {STACK.map((item) => (
                <li key={item.name} className={`stack-item stack-item--${item.tone}`}>
                  <strong>{item.name}</strong>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card credits" style={{ "--i": 2 } as React.CSSProperties} aria-label="Credits">
            <header className="card__header">
              <h2 className="card__title">
                <Sparkles size={16} /> Credits
              </h2>
            </header>
            <div className="architect">
              <span className="architect__avatar" aria-hidden="true">JS</span>
              <div>
                <h3 className="architect__name">Jaswanth S S</h3>
                <p className="architect__role">Created &amp; engineered by the lead AI/ML architect</p>
                <p className="architect__edu">
                  <GraduationCap size={14} aria-hidden="true" />
                  <span>
                    B.Tech in Computer Science &amp; Engineering (AI &amp; ML), SRM Institute of Science and Technology
                    (SRMIST)
                  </span>
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="card archive" aria-label="Match archive">
          <header className="card__header">
            <h2 className="card__title">
              <Archive size={16} /> Match archive
              <span className="pill num">{savedGames.length}</span>
            </h2>
            {savedGames.length > 0 && (
              <button className="btn btn--sm btn--danger" onClick={onClearAllGames}>
                <Trash2 size={13} /> Clear all
              </button>
            )}
          </header>

          {savedGames.length === 0 ? (
            <div className="card__empty archive-empty">
              <Inbox size={40} aria-hidden="true" />
              <strong>No matches yet</strong>
              <span>Finished games against Stockfish, Maia or the Trapper are saved here automatically.</span>
            </div>
          ) : (
            <div className="archive-scroll">
              <table className="data-table archive-table">
                <thead>
                  <tr>
                    <th scope="col">Result</th>
                    <th scope="col">Date</th>
                    <th scope="col">Mode</th>
                    <th scope="col" className="col-num">Moves</th>
                    <th scope="col" className="col-actions">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {savedGames.map((game, idx) => {
                    const tone = resultTone(game.result);
                    const date = new Date(game.completedAt);
                    return (
                      <tr key={game.id} style={{ "--i": idx } as React.CSSProperties}>
                        <td data-label="Result">
                          <span className={`result result--${tone}`}>{game.result}</span>
                          <span className="result-reason">{game.reason}</span>
                        </td>
                        <td data-label="Date" className="num archive-date">
                          {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          <span className="archive-time">
                            {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>
                        <td data-label="Mode">{game.mode ? MODE_LABEL[game.mode] ?? game.mode : "—"}</td>
                        <td data-label="Moves" className="col-num num">
                          {Math.ceil(game.moves.length / 2)}
                        </td>
                        <td className="col-actions">
                          <div className="row-actions">
                            {onReviewGame && (
                              <button
                                className="btn btn--sm"
                                onClick={() => {
                                  playSound("click");
                                  onReviewGame(game);
                                }}
                                aria-label={`Review ${game.result} game`}
                                title="Review with CAPS accuracy"
                              >
                                <Eye size={13} /> Review
                              </button>
                            )}
                            <button
                              className="btn btn--sm"
                              onClick={() => {
                                playSound("click");
                                onLoadGame(game);
                              }}
                              title="Load into the arena"
                            >
                              <Play size={13} /> Load
                            </button>
                            <button className="btn btn--sm" onClick={() => onDownloadPgn(game)} title="Download PGN">
                              <Download size={13} /> PGN
                            </button>
                            <button
                              className="btn btn--sm btn--icon btn--danger"
                              onClick={() => {
                                playSound("click");
                                onDeleteGame(game.id);
                              }}
                              aria-label="Delete this match"
                              title="Delete this match"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
