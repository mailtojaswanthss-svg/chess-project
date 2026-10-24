import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { TrapDrill } from "../types/chess";
import { FALLBACK_TRAPS } from "../data/traps";

/**
 * Trap puzzles for the arena: the opponent has just played the tempting move,
 * and the player must find the punishing line. Only genuine traps qualify.
 */
export function useTrapPuzzles(apiUrl: string) {
  const [traps, setTraps] = useState<TrapDrill[]>(FALLBACK_TRAPS);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/trap-puzzles`)
      .then((res) => (res.ok ? (res.json() as Promise<TrapDrill[]>) : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) setTraps(data);
      })
      .catch(() => {
        // Keep the bundled set
      });
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const puzzles = useMemo(() => traps.filter((t) => t.is_trap && t.punishment_line.length > 0), [traps]);
  return puzzles;
}

/** Position the player faces: the trap position with the tempting move already played. */
export function puzzleStartPosition(puzzle: TrapDrill): Chess {
  const board = new Chess(puzzle.fen);
  board.move(puzzle.tempted_move_uci.length > 4
    ? { from: puzzle.tempted_move_uci.slice(0, 2), to: puzzle.tempted_move_uci.slice(2, 4), promotion: puzzle.tempted_move_uci[4] }
    : { from: puzzle.tempted_move_uci.slice(0, 2), to: puzzle.tempted_move_uci.slice(2, 4) });
  return board;
}

/** The player answers on even plies of the punishment line; a trailing opponent reply is dropped. */
export function puzzleSolveLength(puzzle: TrapDrill): number {
  const n = puzzle.punishment_line.length;
  return n % 2 === 0 ? n - 1 : n;
}

/** The side that punishes the trap (the side to move after the tempting move). */
export function puzzleSolverColor(puzzle: TrapDrill): "w" | "b" {
  return puzzle.side_to_move === "White" ? "b" : "w";
}
