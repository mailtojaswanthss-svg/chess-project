import React from "react";
import {
  Gauge,
  Settings2,
  Volume2,
  VolumeX,
  FlipHorizontal2,
  BrainCircuit,
  Target,
  Dna,
  Swords,
  GraduationCap,
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

  const handleTab = (tab: AppTab) => {
    playSound("click");
    onTabChange(tab);
  };

  return (
    <header className="topbar">
      <div className="brand" onClick={() => handleTab("arena")} style={{ cursor: "pointer" }}>
        <div className="brand-mark">
          <Gauge size={20} strokeWidth={2.5} />
        </div>
        <div className="brand-text">
          <div className="brand-title-wrap">
            <strong>ChessWise AI</strong>
            <span className="brand-badge">PRE-COGNITIVE ENGINE</span>
          </div>
          <span className="brand-sub">Grandmaster Tactical Lab &amp; Blunder Intelligence</span>
        </div>
      </div>

      <nav className="main-tabs" aria-label="Main Navigation">
        <button
          className={`main-tab ${activeTab === "arena" ? "active" : ""}`}
          onClick={() => handleTab("arena")}
        >
          <Swords size={14} style={{ marginRight: 6 }} /> Tactical Arena
        </button>
        <button
          className={`main-tab ${activeTab === "trap_dojo" ? "active" : ""}`}
          onClick={() => handleTab("trap_dojo")}
        >
          <Target size={14} style={{ marginRight: 6 }} /> Trap Dojo
        </button>
        <button
          className={`main-tab ${activeTab === "blunder_dna" ? "active" : ""}`}
          onClick={() => handleTab("blunder_dna")}
        >
          <Dna size={14} style={{ marginRight: 6 }} /> Tactical DNA
        </button>
        <button
          className={`main-tab ${activeTab === "academy" ? "active" : ""}`}
          onClick={() => handleTab("academy")}
        >
          <GraduationCap size={15} style={{ marginRight: 6 }} /> Chess Academy
        </button>
        <button
          className={`main-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => handleTab("settings")}
        >
          <Settings2 size={14} style={{ marginRight: 6 }} /> Settings &amp; Archive
        </button>
      </nav>

      <div className="topbar-actions">
        {/* Connection status indicator */}
        <div
          className={`status-pill ${isModelActive ? "online" : "offline"}`}
          title={
            isModelActive
              ? `Backend Connected · ML Model active (${modelHealth?.model_train_samples?.toLocaleString() ?? 0} samples)`
              : "Backend connecting or offline..."
          }
        >
          <span className="status-dot pulse" />
          <span className="status-text">{isModelActive ? "Engine Online" : "Connecting..."}</span>
        </div>

        {/* Board Flip Quick Control */}
        <button
          className="icon-action-btn"
          aria-label="Flip Board"
          title={`Flip board perspective (Currently ${isFlipped ? "Black" : "White"})`}
          onClick={() => {
            playSound("click");
            onFlipBoard();
          }}
        >
          <FlipHorizontal2 size={17} />
        </button>

        {/* Sound toggle button */}
        <button
          className="icon-action-btn"
          aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
          title={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
          onClick={onToggleSound}
        >
          {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>

        {/* Settings button */}
        <button
          className="icon-action-btn"
          aria-label="Engine Settings"
          title="Engine parameters and rating options"
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
