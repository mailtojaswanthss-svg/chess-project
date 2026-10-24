import "./Arena.css";
import React from "react";

interface ArenaViewProps {
  boardSize: "compact" | "standard" | "large";
  topStrip: React.ReactNode;
  board: React.ReactNode;
  bottomStrip: React.ReactNode;
  /** Mode switcher, strength and status: the fixed top of the game panel */
  panelHead: React.ReactNode;
  /** Analysis sections: the scrolling middle of the game panel */
  sidebar: React.ReactNode[];
  /** Board controls: the fixed bottom of the game panel */
  controls: React.ReactNode;
}

/**
 * Play layout: the board takes the full height with thin player bars, and
 * everything else lives in one game panel beside it (stacked below on phones).
 */
export const ArenaView: React.FC<ArenaViewProps> = ({
  boardSize,
  topStrip,
  board,
  bottomStrip,
  panelHead,
  sidebar,
  controls,
}) => (
  <div className={`workspace arena board-size-${boardSize}`}>
    <div className="board-col">
      {topStrip}
      {board}
      {bottomStrip}
    </div>
    <aside className="game-panel" aria-label="Game panel">
      <div className="game-panel__head">{panelHead}</div>
      <div className="game-panel__body stagger">
        {sidebar.map((child, i) => (
          <div key={i} className="panel-slot" style={{ "--i": i } as React.CSSProperties}>
            {child}
          </div>
        ))}
      </div>
      <div className="game-panel__foot">{controls}</div>
    </aside>
  </div>
);
