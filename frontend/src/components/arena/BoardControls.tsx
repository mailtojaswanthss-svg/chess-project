import "./Arena.css";
import React from "react";
import { Undo2, Lightbulb, FlipHorizontal2, Copy, Download, RotateCcw, Maximize2, Loader2 } from "lucide-react";

interface BoardControlsProps {
  canUndo: boolean;
  canHint: boolean;
  isFetchingHint: boolean;
  hasMoves: boolean;
  boardSize: "compact" | "standard" | "large";
  onUndo: () => void;
  onHint: () => void;
  onFlip: () => void;
  onCopyFen: () => void;
  onDownloadPgn: () => void;
  onToggleBoardSize: () => void;
  onNewGame: () => void;
  newGameLabel?: string;
}

export const BoardControls: React.FC<BoardControlsProps> = ({
  canUndo,
  canHint,
  isFetchingHint,
  hasMoves,
  boardSize,
  onUndo,
  onHint,
  onFlip,
  onCopyFen,
  onDownloadPgn,
  onToggleBoardSize,
  onNewGame,
  newGameLabel = "New game",
}) => (
  <div className="board-controls" role="toolbar" aria-label="Board controls">
    <div className="board-controls__group">
      <button className="btn" onClick={onUndo} disabled={!canUndo} title="Take back (two plies against a bot)">
        <Undo2 size={15} /> <span className="btn-label">Undo</span>
      </button>
      <button className="btn hint-btn" onClick={onHint} disabled={!canHint} title="Ask Stockfish for the best move">
        {isFetchingHint ? <Loader2 size={15} className="spin" /> : <Lightbulb size={15} />}
        <span className="btn-label">Hint</span>
      </button>
    </div>
    <div className="board-controls__group">
      <button className="btn btn--icon" onClick={onFlip} aria-label="Flip board" title="Flip board">
        <FlipHorizontal2 size={15} />
      </button>
      <button className="btn btn--icon" onClick={onCopyFen} aria-label="Copy FEN" title="Copy FEN">
        <Copy size={15} />
      </button>
      <button
        className="btn btn--icon"
        onClick={onDownloadPgn}
        disabled={!hasMoves}
        aria-label="Download PGN"
        title="Download PGN"
      >
        <Download size={15} />
      </button>
      <button
        className="btn btn--icon"
        onClick={onToggleBoardSize}
        aria-label={`Board size: ${boardSize}`}
        title={`Board size: ${boardSize} (click to cycle)`}
      >
        <Maximize2 size={15} />
      </button>
      <button className="btn btn--primary" onClick={onNewGame} title="Reset to the starting position">
        <RotateCcw size={15} /> <span className="btn-label">{newGameLabel}</span>
      </button>
    </div>
  </div>
);
