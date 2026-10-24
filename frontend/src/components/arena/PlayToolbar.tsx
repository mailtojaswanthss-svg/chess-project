import "./Arena.css";
import React from "react";
import { FlaskConical, Cpu, Users, Bomb, Puzzle, Lock } from "lucide-react";
import type { PlayMode } from "../../types/chess";

export const MAIA_RATINGS = [1100, 1300, 1500, 1700, 1900];

export const MODES: { id: PlayMode; label: string; tip: string; icon: typeof Cpu }[] = [
  { id: "free_lab", label: "Analysis", tip: "Move both sides freely with live engine analysis", icon: FlaskConical },
  { id: "max_engine", label: "vs Stockfish", tip: "Play Stockfish at the strength you choose", icon: Cpu },
  { id: "human_sparring", label: "vs Maia", tip: "Play Maia-2, trained to move like a human at your rating", icon: Users },
  { id: "tricky_bot", label: "vs Trapper", tip: "A bot that picks sound moves most likely to make you blunder", icon: Bomb },
  { id: "trap_puzzle", label: "Trap puzzles", tip: "Your opponent fell for a classic trap: find the punishing line", icon: Puzzle },
];

interface PlayToolbarProps {
  playMode: PlayMode;
  rating: number;
  /** True once a rated game has started; the rating can't change until it ends. */
  ratingLocked?: boolean;
  onSelectMode: (mode: PlayMode) => void;
  onSetRating: (rating: number) => void;
}

export const PlayToolbar: React.FC<PlayToolbarProps> = ({
  playMode,
  rating,
  ratingLocked = false,
  onSelectMode,
  onSetRating,
}) => (
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

    <div className={`play-strength ${ratingLocked ? "is-locked" : ""}`}>
      {playMode === "human_sparring" && (
        <>
          <span className="play-strength__label">Maia rating</span>
          <div className="segmented" role="group" aria-label="Maia rating">
            {MAIA_RATINGS.map((r) => (
              <button
                key={r}
                className={`segmented__btn num ${rating === r ? "is-active" : ""}`}
                aria-pressed={rating === r}
                disabled={ratingLocked && rating !== r}
                onClick={() => onSetRating(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </>
      )}

      {(playMode === "max_engine" || playMode === "tricky_bot") && (
        <label className="strength-slider">
          <span className="play-strength__label">{playMode === "tricky_bot" ? "Your rating" : "Stockfish rating"}</span>
          <input
            type="range"
            min={800}
            max={2800}
            step={200}
            value={rating}
            disabled={ratingLocked}
            onChange={(e) => onSetRating(Number(e.target.value))}
            style={{ "--fill": `${((rating - 800) / 2000) * 100}%` } as React.CSSProperties}
          />
          <span className="pill pill--accent num">{rating >= 2800 ? "2800+" : rating}</span>
        </label>
      )}

      {ratingLocked && (
        <span className="pill pill--warn rating-lock" title="The rating stays fixed for the whole game. Start a new game to change it.">
          <Lock size={12} aria-hidden="true" /> Locked for this game
        </span>
      )}

      {playMode === "free_lab" && <span className="pill">Free play, no rating</span>}
      {playMode === "trap_puzzle" && <span className="pill">Find the refutation</span>}
    </div>
  </div>
);
