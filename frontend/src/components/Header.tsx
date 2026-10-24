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
  House,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import type { AppTab, ModelHealth } from "../types/chess";
import { playSound } from "../utils/audio";
import { Logo } from "./Logo";

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  modelHealth: ModelHealth | null;
  /** The health check failed: this copy runs without the engine server */
  backendOffline?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFlipped: boolean;
  onFlipBoard: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const TABS: { id: AppTab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "arena", label: "Play", icon: Swords },
  { id: "trap_dojo", label: "Trap Spotter", icon: Target },
  { id: "blunder_dna", label: "Player Profile", icon: Dna },
  { id: "academy", label: "Lessons", icon: GraduationCap },
  { id: "settings", label: "Games & Settings", icon: Archive },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  modelHealth,
  backendOffline = false,
  soundEnabled,
  onToggleSound,
  isFlipped,
  onFlipBoard,
  onOpenSettings,
  isDark,
  onToggleTheme,
}) => {
  const backendUp = modelHealth !== null;
  const missing = [
    !(modelHealth?.engine_ready ?? false) && "Stockfish",
    !(modelHealth?.model_loaded ?? false) && "the blunder model",
  ].filter(Boolean) as string[];
  const fullyOnline = backendUp && missing.length === 0;
  const statusText = !backendUp ? (backendOffline ? "Engine offline" : "Connecting") : fullyOnline ? "Engine online" : "Limited";
  const statusTitle = !backendUp
    ? backendOffline
      ? "This copy runs without the engine server, so analysis, the bots and the coach are off. Free play, puzzles and lessons still work."
      : "Connecting to the engine server"
    : fullyOnline
      ? `Backend connected · Stockfish ready · model trained on ${modelHealth?.model_train_samples?.toLocaleString() ?? 0} samples`
      : `Backend connected, but ${missing.join(" and ")} ${missing.length > 1 ? "aren't" : "isn't"} available, so some numbers show "—"`;
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
      <button className="brand" onClick={() => handleTab("home")} aria-label="ChessWise AI home">
        <Logo size={40} className="brand-mark" />
        <span className="brand-text">
          <strong>
            ChessWise <span className="brand-ai">AI</span>
          </strong>
          <span className="brand-sub">Train smarter. Blunder less.</span>
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
          className={`engine-status ${fullyOnline ? "is-online" : ""}`}
          title={statusTitle}
        >
          <span className="live-dot" />
          <span className="engine-status__text">{statusText}</span>
        </span>
        <button
          className="btn btn--ghost btn--icon theme-toggle"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
          onClick={() => {
            playSound("click");
            onToggleTheme();
          }}
        >
          <span key={isDark ? "moon" : "sun"} className="theme-toggle__icon">
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </span>
        </button>
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
