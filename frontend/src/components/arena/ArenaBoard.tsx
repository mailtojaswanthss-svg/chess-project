import "./Arena.css";
import React from "react";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Piece } from "react-chessboard/dist/chessboard/types";
import { EvaluationBar } from "../EvaluationBar";

type Arrow = [Square, Square, string?];

interface ArenaBoardProps {
  fen: string;
  boardWidth: number;
  boardRef?: React.Ref<HTMLDivElement>;
  isFlipped: boolean;
  evaluationCentipawns: number | null;
  turn?: "w" | "b";
  isCheck?: boolean;
  squareStyles?: Record<string, React.CSSProperties>;
  arrows?: Arrow[];
  interactive?: {
    onPieceDrop: (from: Square, to: Square) => boolean;
    onPieceDragBegin: (piece: Piece, from: Square) => void;
    onPieceDragEnd: () => void;
    onSquareClick: (square: Square) => void;
    isDraggablePiece: (args: { piece: Piece }) => boolean;
  };
}

export const ArenaBoard: React.FC<ArenaBoardProps> = ({
  fen,
  boardWidth,
  boardRef,
  isFlipped,
  evaluationCentipawns,
  turn,
  isCheck = false,
  squareStyles,
  arrows,
  interactive,
}) => (
  <div className="arena-board">
    <EvaluationBar evaluationCentipawns={evaluationCentipawns} isFlipped={isFlipped} />
    <div
      className={`board-frame ${turn ? `board-frame--turn-${turn}` : ""} ${isCheck ? "is-check" : ""}`}
      ref={boardRef}
    >
      <Chessboard
        position={fen}
        boardWidth={boardWidth}
        boardOrientation={isFlipped ? "black" : "white"}
        customSquareStyles={squareStyles}
        customArrows={arrows}
        customArrowColor="rgb(255, 150, 40)"
        customBoardStyle={{ borderRadius: "10px" }}
        customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
        customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
        customDropSquareStyle={{ boxShadow: "inset 0 0 1px 4px rgba(255, 255, 255, 0.75)" }}
        arePiecesDraggable={Boolean(interactive)}
        onPieceDrop={interactive?.onPieceDrop}
        onPieceDragBegin={interactive?.onPieceDragBegin}
        onPieceDragEnd={interactive?.onPieceDragEnd}
        onSquareClick={interactive?.onSquareClick}
        isDraggablePiece={interactive?.isDraggablePiece}
        snapToCursor={false}
        autoPromoteToQueen
        dropOffBoardAction="snapback"
        animationDuration={180}
      />
    </div>
  </div>
);
