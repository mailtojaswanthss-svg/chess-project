import "./GameOverModal.css";
import React from "react";
import { Trophy, Undo2, RotateCcw, Download, Eye, X } from "lucide-react";
import type { SavedGame } from "../types/chess";
import { coachingTakeaway } from "../utils/chessUtils";

interface GameOverModalProps {
  gameSummary: SavedGame;
  onUndo: () => void;
  onNewGame: () => void;
  onReviewGame: () => void;
  onDownloadPgn: () => void;
  onDismiss: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameSummary,
  onUndo,
  onNewGame,
  onReviewGame,
  onDownloadPgn,
  onDismiss,
}) => {
  const isDraw = gameSummary.result.toLowerCase().includes("draw");
  const isCheckmate = gameSummary.reason.toLowerCase().includes("checkmate");

  return (
    <div className="game-over-banner" role="alert">
      <div className="game-over-header">
        <div className="game-over-badge">
          <Trophy size={16} className={isDraw ? "draw-trophy" : "win-trophy"} />
          <span>GAME OVER</span>
        </div>
        <button
          className="dismiss-btn"
          aria-label="Close game over banner"
          title="Dismiss banner (keep board state)"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      </div>

      <div className="game-over-body">
        <h2 className="outcome-title">{gameSummary.result}</h2>
        <div className="outcome-reason">
          Finished by <strong>{gameSummary.reason}</strong> after {gameSummary.moves.length} plies
        </div>

        <div className="coach-takeaway-box">
          <span className="takeaway-badge">COACH TAKEAWAY</span>
          <p className="takeaway-text">{coachingTakeaway(gameSummary)}</p>
        </div>

        <div className="game-over-actions">
          <button
            className="secondary-btn action-takeback"
            onClick={onUndo}
            title="Take back the final move and keep playing"
          >
            <Undo2 size={15} /> Undo Last Move
          </button>
          <button
            className="secondary-btn"
            onClick={onReviewGame}
            title="Inspect every move in deep review"
          >
            <Eye size={15} /> Review Game
          </button>
          <button
            className="secondary-btn"
            onClick={onDownloadPgn}
            title="Download game in PGN format"
          >
            <Download size={15} /> Save PGN
          </button>
          <button
            className="primary-btn"
            onClick={onNewGame}
            title="Start a new game from starting position"
          >
            <RotateCcw size={15} /> New Game
          </button>
        </div>
      </div>
    </div>
  );
};
