import "./Arena.css";
import React from "react";
import { Layers, Radar, MoveUpRight } from "lucide-react";

export interface OverlayState {
  influence: boolean;
  threats: boolean;
  arrows: boolean;
}

interface OverlayControlsProps {
  overlays: OverlayState;
  onToggle: (key: keyof OverlayState) => void;
}

const OVERLAYS: { key: keyof OverlayState; label: string; tip: string; icon: typeof Layers }[] = [
  {
    key: "influence",
    label: "Influence",
    tip: "Colour all 64 squares by which side controls them",
    icon: Layers,
  },
  {
    key: "threats",
    label: "Threats",
    tip: "Ring every pinned, hanging or under-defended piece",
    icon: Radar,
  },
  {
    key: "arrows",
    label: "Arrows",
    tip: "Draw hint and candidate-move arrows on the board",
    icon: MoveUpRight,
  },
];

export const OverlayControls: React.FC<OverlayControlsProps> = ({ overlays, onToggle }) => (
  <div className="overlay-controls" role="group" aria-label="Board overlays">
    <span className="overlay-controls__label">Overlays</span>
    <div className="segmented">
      {OVERLAYS.map(({ key, label, tip, icon: Icon }) => (
        <button
          key={key}
          className={`segmented__btn ${overlays[key] ? "is-active" : ""}`}
          aria-pressed={overlays[key]}
          data-tip={tip}
          onClick={() => onToggle(key)}
        >
          <Icon size={14} aria-hidden="true" />
          {label}
          <span className="overlay-switch" aria-hidden="true" />
        </button>
      ))}
    </div>
  </div>
);
