import "./Header.css";
import React, { useLayoutEffect, useRef } from "react";
import {
  Settings2,
  Volume2,
  VolumeX,
  FlipHorizontal2,
  Target,
  Dna,
  Swords,
  GraduationCap,
  Archive,
  type LucideIcon,
} from "lucide-react";
import type { AppTab, ModelHealth } from "../types/chess";
import { playSound } from "../utils/audio";

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  modelHealth: ModelHealth | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFlipped: boolean;
  onFlipBoard: () => void;
  onOpenSettings: () => void;
}

const TABS: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "arena", label: "Tactical Arena", icon: Swords },
  { id: "trap_dojo", label: "Trap Dojo", icon: Target },
  { id: "blunder_dna", label: "Tactical DNA", icon: Dna },
  { id: "academy", label: "Chess Academy", icon: GraduationCap },
  { id: "settings", label: "Settings & Archive", icon: Archive },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  modelHealth,
  soundEnabled,
  onToggleSound,
  isFlipped,
  onFlipBoard,
  onOpenSettings,
}) => {
  const isModelActive = modelHealth?.model_loaded ?? false;
  const navRef = useRef<HTMLElement>(null);

  // Slide the active-tab indicator to the selected tab; CSS transitions the move.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const active = nav.querySelector<HTMLElement>(".nav-tab.is-active");
      if (!active) return;
      nav.style.setProperty("--ind-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--ind-w", `${active.offsetWidth}px`);
      // Scroll only the tab strip (scrollIntoView would also scroll the page)
      if (nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeTab]);

  const handleTab = (tab: AppTab) => {
    playSound("click");
    onTabChange(tab);
  };

  return (
    <header className="topbar">
      <button className="brand" onClick={() => handleTab("arena")} aria-label="ChessWise AI home">
        <span className="brand-mark" aria-hidden="true">♞</span>
        <span className="brand-text">
          <strong>ChessWise AI</strong>
          <span className="brand-sub">Tactical lab &amp; blunder intelligence</span>
        </span>
      </button>

      <nav className="nav-tabs" aria-label="Main navigation" ref={navRef}>
        <span className="nav-indicator" aria-hidden="true" />
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-tab ${activeTab === id ? "is-active" : ""}`}
            aria-current={activeTab === id ? "page" : undefined}
            aria-label={label}
            onClick={() => handleTab(id)}
          >
            <Icon size={15} aria-hidden="true" />
            <span className="nav-tab__label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <span
          className={`engine-status ${isModelActive ? "is-online" : ""}`}
          title={
            isModelActive
              ? `Backend connected · model trained on ${modelHealth?.model_train_samples?.toLocaleString() ?? 0} samples`
              : "Backend offline or still connecting"
          }
        >
          <span className="live-dot" />
          <span className="engine-status__text">{isModelActive ? "Engine online" : "Connecting"}</span>
        </span>
        <button
          className="btn btn--ghost btn--icon"
          aria-label="Flip board"
          title={`Flip board (playing ${isFlipped ? "Black" : "White"})`}
          onClick={() => {
            playSound("click");
            onFlipBoard();
          }}
        >
          <FlipHorizontal2 size={17} />
        </button>
        <button
          className="btn btn--ghost btn--icon"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
          onClick={onToggleSound}
        >
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button
          className="btn btn--ghost btn--icon"
          aria-label="Quick settings"
          title="Quick settings"
          onClick={() => {
            playSound("click");
            onOpenSettings();
          }}
        >
          <Settings2 size={17} />
        </button>
      </div>
    </header>
  );
};
