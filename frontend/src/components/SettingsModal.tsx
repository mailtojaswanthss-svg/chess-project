import "./SettingsModal.css";
import React from "react";
import { X, Volume2, VolumeX, Trash2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  savedGamesCount: number;
  onClearSavedGames: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  savedGamesCount,
  onClearSavedGames,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>SETTINGS</h3>
          <button className="icon-action-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          <div className="setting-row">
            <div>
              <strong>Move Sound Effects</strong>
              <p>Play synthesised acoustic clicks on piece moves, captures, and checks.</p>
            </div>
            <button
              className={`toggle-btn ${soundEnabled ? "on" : "off"}`}
              onClick={onToggleSound}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{soundEnabled ? "Enabled" : "Muted"}</span>
            </button>
          </div>

          <div className="setting-row">
            <div>
              <strong>Local Game History</strong>
              <p>{savedGamesCount} matches stored locally in this browser.</p>
            </div>
            <button
              className="secondary-btn danger-btn"
              onClick={onClearSavedGames}
              disabled={savedGamesCount === 0}
            >
              <Trash2 size={14} /> Clear Cache
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
