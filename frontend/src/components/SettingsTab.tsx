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
  Palette,
  Sun,
  Moon,
  Monitor,
  BarChart3,
} from "lucide-react";
import type { SavedGame, ModelHealth } from "../types/chess";
import { playSound } from "../utils/audio";
import { detectOpening } from "../utils/chessUtils";
import type { BoardTheme, ThemePref } from "../utils/useAppearance";

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
  theme: ThemePref;
  onChangeTheme: (t: ThemePref) => void;
  boardTheme: BoardTheme;
  onChangeBoardTheme: (b: BoardTheme) => void;
}

const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: "green", label: "Green", light: "#eeeed2", dark: "#769656" },
  { id: "walnut", label: "Walnut", light: "#f0d9b5", dark: "#b58863" },
  { id: "ocean", label: "Ocean", light: "#dee3e6", dark: "#8ca2ad" },
];

const THEMES: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Summary of the archive: what's been played and how games ended. */
function summarise(games: SavedGame[]) {
  const results = { white: 0, black: 0, draw: 0 };
  const byMode: Record<string, number> = {};
  const openings: Record<string, number> = {};
  let plies = 0;
  for (const g of games) {
    const r = g.result.toLowerCase();
    if (r.includes("white wins")) results.white++;
    else if (r.includes("black wins")) results.black++;
    else results.draw++;
    const mode = g.mode ?? "free_lab";
    byMode[mode] = (byMode[mode] ?? 0) + 1;
    const opening = detectOpening(g.moves);
    if (opening !== "Starting Position" && opening !== "Open Game") openings[opening] = (openings[opening] ?? 0) + 1;
    plies += g.moves.length;
  }
  const favourite = Object.entries(openings).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { results, byMode, favourite, avgMoves: games.length ? Math.round(plies / games.length / 2) : 0 };
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
  theme,
  onChangeTheme,
  boardTheme,
  onChangeBoardTheme,
}) => {
  const isModelActive = modelHealth?.model_loaded ?? false;
  const record = summarise(savedGames);
  const total = savedGames.length;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
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
          <section className="card" style={{ "--i": 0 } as React.CSSProperties} aria-label="Appearance">
            <header className="card__header">
              <h2 className="card__title">
                <Palette size={16} /> Appearance
              </h2>
            </header>
            <div className="setting">
              <div>
                <div className="setting__name">Theme</div>
                <div className="setting__desc">System follows your device</div>
              </div>
              <div className="segmented" role="group" aria-label="Theme">
                {THEMES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`segmented__btn ${theme === id ? "is-active" : ""}`}
                    aria-pressed={theme === id}
                    onClick={() => {
                      playSound("click");
                      onChangeTheme(id);
                    }}
                  >
                    <Icon size={14} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting setting--stacked">
              <div>
                <div className="setting__name">Board colours</div>
                <div className="setting__desc">Used on every board in the app</div>
              </div>
              <div className="board-swatches" role="group" aria-label="Board colours">
                {BOARD_THEMES.map((b) => (
                  <button
                    key={b.id}
                    className={`board-swatch ${boardTheme === b.id ? "is-active" : ""}`}
                    aria-pressed={boardTheme === b.id}
                    onClick={() => {
                      playSound("click");
                      onChangeBoardTheme(b.id);
                    }}
                  >
                    <span
                      className="board-swatch__preview"
                      style={{ "--sq-l": b.light, "--sq-d": b.dark } as React.CSSProperties}
                      aria-hidden="true"
                    />
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card" style={{ "--i": 1 } as React.CSSProperties} aria-label="Preferences">
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

        <div className="settings-col settings-col--wide">
        <section className="card record" aria-label="Your record">
          <header className="card__header">
            <h2 className="card__title">
              <BarChart3 size={16} /> Your record
            </h2>
            <span className="card__meta">From your saved games</span>
          </header>
          {total === 0 ? (
            <p className="card__body">Finish a game against any bot and your results, favourite opening and game length show up here.</p>
          ) : (
            <>
              <div className="record-stats">
                <div className="record-stat">
                  <span className="record-stat__value num">{total}</span>
                  <span className="record-stat__label">Games finished</span>
                </div>
                <div className="record-stat">
                  <span className="record-stat__value num">{record.avgMoves}</span>
                  <span className="record-stat__label">Average length, moves</span>
                </div>
                <div className="record-stat record-stat--wide">
                  <span className="record-stat__value">{record.favourite ?? "Not enough data"}</span>
                  <span className="record-stat__label">Most played opening</span>
                </div>
              </div>
              <div className="record-results">
                <div className="record-bar" role="img" aria-label={`White won ${record.results.white}, drawn ${record.results.draw}, Black won ${record.results.black}`}>
                  <span className="record-bar__seg record-bar__seg--white" style={{ width: `${pct(record.results.white)}%` }} />
                  <span className="record-bar__seg record-bar__seg--draw" style={{ width: `${pct(record.results.draw)}%` }} />
                  <span className="record-bar__seg record-bar__seg--black" style={{ width: `${pct(record.results.black)}%` }} />
                </div>
                <div className="record-legend">
                  <span>White won <span className="num">{record.results.white}</span></span>
                  <span>Drawn <span className="num">{record.results.draw}</span></span>
                  <span>Black won <span className="num">{record.results.black}</span></span>
                </div>
              </div>
              <ul className="record-modes">
                {Object.entries(record.byMode).map(([mode, n]) => (
                  <li key={mode}>
                    <span>{MODE_LABEL[mode] ?? mode}</span>
                    <span className="meter"><span className="meter__fill" style={{ width: `${pct(n)}%`, display: "block" }} /></span>
                    <span className="num">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

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
          <section className="card" aria-label="Engine">
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

        </div>
      </div>
    </div>
  );
};
