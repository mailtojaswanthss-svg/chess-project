import React from "react";
import { ArrowLeft } from "lucide-react";
import type { GameReport } from "../../types/chess";
import { ArenaBoard } from "../arena/ArenaBoard";
import { GameReview } from "../GameReview";

interface ReviewWorkspaceProps {
  gameReport: GameReport;
  reviewFen: string;
  boardWidth: number;
  boardRef: React.Ref<HTMLDivElement>;
  boardSize: "compact" | "standard" | "large";
  isFlipped: boolean;
  squareStyles: Record<string, React.CSSProperties>;
  selectedPly: number | null;
  isUploading: boolean;
  onSelectPly: (ply: number) => void;
  onUploadPgn: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadPracticePositions: () => void;
  onExit: () => void;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  gameReport,
  reviewFen,
  boardWidth,
  boardRef,
  boardSize,
  isFlipped,
  squareStyles,
  selectedPly,
  isUploading,
  onSelectPly,
  onUploadPgn,
  onDownloadPracticePositions,
  onExit,
}) => (
  <div className="view">
    <div className="page-head">
      <div>
        <h1 className="page-title">Game review</h1>
        <p className="page-sub">Accuracy, estimated performance and a move-by-move breakdown. Step through moves on the right.</p>
      </div>
      <button className="btn" onClick={onExit}>
        <ArrowLeft size={15} /> Back to the arena
      </button>
    </div>
    <div className="workspace review-workspace">
      <div className={`workspace__board board-size-${boardSize}`}>
        <ArenaBoard
          fen={reviewFen}
          boardWidth={boardWidth}
          boardRef={boardRef}
          isFlipped={isFlipped}
          evaluationCentipawns={null}
          squareStyles={squareStyles}
        />
      </div>
      <div className="workspace__side">
        <GameReview
          gameReport={gameReport}
          selectedPly={selectedPly}
          onSelectPly={onSelectPly}
          onUploadPgn={onUploadPgn}
          isUploading={isUploading}
          onDownloadPracticePositions={onDownloadPracticePositions}
        />
      </div>
    </div>
  </div>
);
