import "./Arena.css";
import React from "react";

interface ArenaViewProps {
  boardSize: "compact" | "standard" | "large";
  hud: React.ReactNode;
  overlays: React.ReactNode;
  topStrip: React.ReactNode;
  board: React.ReactNode;
  bottomStrip: React.ReactNode;
  controls: React.ReactNode;
  /** Optional panel that unfolds under the overlay toggles (e.g. the influence summary). */
  overlayDetail?: React.ReactNode;
  sidebar: React.ReactNode;
}

/** Two-column arena: board stack on the left, analysis cards on the right; stacks below 900px. */
export const ArenaView: React.FC<ArenaViewProps> = ({
  boardSize,
  hud,
  overlays,
  topStrip,
  board,
  bottomStrip,
  controls,
  overlayDetail,
  sidebar,
}) => (
  <div className="workspace arena">
    <div className={`workspace__board board-size-${boardSize}`}>
      {hud}
      {overlays}
      {overlayDetail}
      {topStrip}
      {board}
      {bottomStrip}
      {controls}
    </div>
    <aside className="workspace__side stagger" aria-label="Analysis">
      {React.Children.toArray(sidebar).map((child, i) => (
        <div key={i} className="side-slot" style={{ "--i": i } as React.CSSProperties}>
          {child}
        </div>
      ))}
    </aside>
  </div>
);
