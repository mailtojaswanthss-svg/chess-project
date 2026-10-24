import "./SidebarCards.css";
import React from "react";
import { Radar, ShieldCheck, Shield, Target, Flame, AlertTriangle } from "lucide-react";
import type { ThreatItem } from "../../types/chess";

interface ThreatRadarCardProps {
  threats: ThreatItem[];
  sideToMove: "w" | "b";
  onHoverThreatSquare?: (square: string | null) => void;
}

const MOTIF_ICON = { pinned: Shield, hanging: Target, check: Flame, underdefended: AlertTriangle, vulnerable: AlertTriangle };
const MOTIF_LABEL = { pinned: "Pinned", hanging: "Hanging", check: "Check", underdefended: "Under-defended", vulnerable: "Vulnerable" };

export const ThreatRadarCard: React.FC<ThreatRadarCardProps> = ({ threats, sideToMove, onHoverThreatSquare }) => (
  <section className="card threats" aria-label="Threat radar">
    <header className="card__header">
      <h2 className="card__title">
        <Radar size={16} /> Threat radar
      </h2>
      <span className={`pill ${threats.length ? "pill--danger" : "pill--good"}`}>
        {threats.length ? `${threats.length} ${threats.length === 1 ? "threat" : "threats"}` : "Clear"}
      </span>
    </header>

    {threats.length === 0 ? (
      <p className="threats-clear">
        <ShieldCheck size={16} aria-hidden="true" />
        No pinned, hanging or under-defended {sideToMove === "w" ? "White" : "Black"} pieces.
      </p>
    ) : (
      <ul className="threat-list stagger">
        {threats.map((t, idx) => {
          const Icon = MOTIF_ICON[t.motif] ?? AlertTriangle;
          return (
            <li
              key={`${t.square}-${t.motif}`}
              className={`threat threat--${t.motif}`}
              style={{ "--i": idx } as React.CSSProperties}
              tabIndex={0}
              onMouseEnter={() => onHoverThreatSquare?.(t.square)}
              onMouseLeave={() => onHoverThreatSquare?.(null)}
              onFocus={() => onHoverThreatSquare?.(t.square)}
              onBlur={() => onHoverThreatSquare?.(null)}
            >
              <span className="threat__icon">
                <Icon size={14} aria-hidden="true" />
              </span>
              <span className="threat__text">
                <strong>{MOTIF_LABEL[t.motif] ?? t.motif}</strong>
                <span>{t.description}</span>
              </span>
              <span className="threat__sq num">{t.square}</span>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
