import "./Arena.css";
import React from "react";
import { FlaskConical, Zap, Brain, Bomb } from "lucide-react";
import type { PlayMode } from "../../types/chess";

export const MAIA_RATINGS = [1100, 1300, 1500, 1700, 1900];

const MODES: { id: PlayMode; label: string; tip: string; icon: typeof Zap }[] = [
  { id: "free_lab", label: "Free Lab", tip: "Move both sides and explore with live analysis", icon: FlaskConical },
  { id: "max_engine", label: "Stockfish", tip: "Play Stockfish at an adjustable strength", icon: Zap },
  { id: "human_sparring", label: "Maia", tip: "Play Maia-2, trained to move like humans at your level", icon: Brain },
  { id: "tricky_bot", label: "Tricky Bot", tip: "A bot that picks the sound move most likely to make you blunder", icon: Bomb },
];

interface PlayToolbarProps {
  playMode: PlayMode;
  rating: number;
  onSelectMode: (mode: PlayMode) => void;
  onSetRating: (rating: number) => void;
}

export const PlayToolbar: React.FC<PlayToolbarProps> = ({ playMode, rating, onSelectMode, onSetRating }) => (
  <div className="play-toolbar">
    <div className="segmented play-modes" role="group" aria-label="Game mode">
      {MODES.map(({ id, label, tip, icon: Icon }) => (
        <button
          key={id}
          className={`segmented__btn ${playMode === id ? "is-active" : ""}`}
          aria-pressed={playMode === id}
          title={tip}
          onClick={() => onSelectMode(id)}
        >
          <Icon size={15} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>

    <div className="play-strength">
      {playMode === "human_sparring" && (
        <>
          <span className="play-strength__label">Maia rating</span>
          <div className="segmented" role="group" aria-label="Maia rating">
            {MAIA_RATINGS.map((r) => (
              <button
                key={r}
                className={`segmented__btn num ${rating === r ? "is-active" : ""}`}
                aria-pressed={rating === r}
                onClick={() => onSetRating(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      {playMode === "max_engine" && (
        <label className="strength-slider">
          <span className="play-strength__label">Strength</span>
          <input
            type="range"
            min={800}
            max={2800}
            step={200}
            value={rating}
            onChange={(e) => onSetRating(Number(e.target.value))}
            style={{ "--fill": `${((rating - 800) / 2000) * 100}%` } as React.CSSProperties}
          />
          <span className="pill pill--accent num">{rating >= 2800 ? "2800+" : rating}</span>
        </label>
      )}

      {(playMode === "free_lab" || playMode === "tricky_bot") && (
        <span className="pill">No rating in this mode</span>
      )}
    </div>
  </div>
);
