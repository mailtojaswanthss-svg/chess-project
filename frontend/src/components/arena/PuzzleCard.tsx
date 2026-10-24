import "./SidebarCards.css";
import React from "react";
import { Puzzle, Lightbulb, Eye, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { TrapDrill } from "../../types/chess";

export type PuzzleStatus = "solving" | "correct" | "wrong" | "solved" | "revealed";

interface PuzzleCardProps {
  puzzle?: TrapDrill;
  index: number;
  total: number;
  /** Plies of the punishment line already on the board */
  step: number;
  solveLength: number;
  status: PuzzleStatus;
  solvedCount: number;
  onHint: () => void;
  onReveal: () => void;
  onRetry: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const STATUS_TEXT: Record<PuzzleStatus, string> = {
  solving: "Your move. Find the strongest reply.",
  correct: "Correct! Watch the reply…",
  wrong: "Not that one. The piece went back, so try again.",
  solved: "Solved! The trap is punished.",
  revealed: "Here's the winning line.",
};

export const PuzzleCard: React.FC<PuzzleCardProps> = ({
  puzzle,
  index,
  total,
  step,
  solveLength,
  status,
  solvedCount,
  onHint,
  onReveal,
  onRetry,
  onPrev,
  onNext,
}) => {
  if (!puzzle) {
    return (
      <section className="card puzzle" aria-label="Trap puzzle">
        <div className="skeleton" style={{ height: 120 }} />
      </section>
    );
  }

  // The player's moves are the even plies of the line
  const userMoves = Math.ceil(solveLength / 2);
  const userDone = Math.ceil(Math.min(step, solveLength) / 2);
  const finished = status === "solved" || status === "revealed";
  const solverSide = puzzle.side_to_move === "White" ? "Black" : "White";

  return (
    <section className={`card puzzle puzzle--${status}`} aria-label="Trap puzzle">
      <header className="card__header">
        <h2 className="card__title">
          <Puzzle size={16} /> Trap puzzle
        </h2>
        <span className="card__meta num">
          {index + 1} / {total} · {solvedCount} solved
        </span>
      </header>

      <div className="puzzle-brief">
        <div className="puzzle-brief__tags">
          <span className="pill pill--accent">{puzzle.difficulty}</span>
          <span className="pill">{puzzle.theme}</span>
        </div>
        <h3 className="puzzle-brief__title">{puzzle.title}</h3>
        <p className="card__body">
          You play <strong>{solverSide}</strong>. Your opponent just played{" "}
          <span className="num puzzle-move">{puzzle.tempted_move_san}</span> and walked into a trap. Punish it.
        </p>
      </div>

      <div className="puzzle-progress" aria-label={`${userDone} of ${userMoves} moves found`}>
        {Array.from({ length: userMoves }, (_, i) => (
          <span key={i} className={`puzzle-dot ${i < userDone ? "is-done" : ""} ${i === userDone && !finished ? "is-next" : ""}`} />
        ))}
      </div>

      <p className={`puzzle-status puzzle-status--${status}`} role="status" aria-live="polite">
        {status === "solved" ? <CheckCircle2 size={16} /> : status === "wrong" ? <XCircle size={16} /> : null}
        {STATUS_TEXT[status]}
      </p>

      {finished && <p className="puzzle-explain">{puzzle.trap_explanation}</p>}

      <div className="puzzle-actions">
        {!finished ? (
          <>
            <button className="btn btn--sm" onClick={onHint}>
              <Lightbulb size={14} /> Hint
            </button>
            <button className="btn btn--sm btn--ghost" onClick={onReveal}>
              <Eye size={14} /> Show solution
            </button>
          </>
        ) : (
          <button className="btn btn--sm" onClick={onRetry}>
            <RotateCcw size={14} /> Try again
          </button>
        )}
        <span className="puzzle-actions__spacer" />
        <button className="btn btn--sm btn--icon" onClick={onPrev} aria-label="Previous puzzle">
          <ChevronLeft size={15} />
        </button>
        <button className={`btn btn--sm ${finished ? "btn--primary" : ""}`} onClick={onNext}>
          Next <ChevronRight size={15} />
        </button>
      </div>
    </section>
  );
};
