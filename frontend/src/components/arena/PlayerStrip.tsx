import "./Arena.css";
import React from "react";

interface PlayerStripProps {
  avatar: React.ReactNode;
  name: string;
  color: "w" | "b";
  isTurn: boolean;
  /** Short status shown while it is this player's turn, e.g. "Thinking" or "Your turn". */
  turnLabel?: string;
  isThinking?: boolean;
  inCheck?: boolean;
  captured: string[];
  materialLead: number;
  trailing?: React.ReactNode;
}

export const PlayerStrip: React.FC<PlayerStripProps> = ({
  avatar,
  name,
  color,
  isTurn,
  turnLabel,
  isThinking = false,
  inCheck = false,
  captured,
  materialLead,
  trailing,
}) => (
  <div className={`player-strip ${isTurn ? "is-turn" : ""}`}>
    <span className={`player-avatar player-avatar--${color}`} aria-hidden="true">
      {avatar}
    </span>
    <div className="player-info">
      <div className="player-line">
        <span className="player-name">{name}</span>
        <span className="player-side">{color === "w" ? "White" : "Black"}</span>
        {isTurn && turnLabel && (
          <span className={`pill ${isThinking ? "pill--accent" : "pill--good"} player-turn`}>
            <span className="live-dot" />
            {turnLabel}
          </span>
        )}
        {inCheck && <span className="pill pill--danger">In check</span>}
      </div>
      <div className="player-captured" aria-label={`Captured pieces: ${captured.length}`}>
        {captured.map((sym, i) => (
          <span key={i} className="captured-piece">
            {sym}
          </span>
        ))}
        {materialLead > 0 && <span className="material-lead num">+{materialLead}</span>}
      </div>
    </div>
    {trailing && <div className="player-trailing">{trailing}</div>}
  </div>
);
