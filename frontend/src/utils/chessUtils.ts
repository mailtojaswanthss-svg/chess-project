import { Chess, type Square } from "chess.js";
import type {
  MoveClassification,
  RiskBand,
  SavedGame,
  TerritoryControl,
  MoveAnalysisItem,
} from "../types/chess";

export function gameOutcome(position: Chess): { result: string; reason: string } | null {
  if (position.isCheckmate()) {
    return {
      result: position.turn() === "w" ? "Black wins" : "White wins",
      reason: "Checkmate",
    };
  }
  if (position.isStalemate()) {
    return { result: "Draw", reason: "Stalemate" };
  }
  if (position.isThreefoldRepetition()) {
    return { result: "Draw", reason: "Threefold repetition" };
  }
  if (position.isInsufficientMaterial()) {
    return { result: "Draw", reason: "Insufficient material" };
  }
  if (position.isDrawByFiftyMoves()) {
    return { result: "Draw", reason: "50-move rule" };
  }
  if (position.isDraw()) {
    return { result: "Draw", reason: "Automatic draw" };
  }
  return null;
}

export function getKingSquare(position: Chess, color: "w" | "b"): Square | null {
  const board = position.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "k" && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

export type BadgeInfo = {
  classification: MoveClassification;
  symbol: string;
  label: string;
  color: string;
  badgeBg: string;
  description: string;
};

export function getMoveBadgeInfo(cls: MoveClassification = "good"): BadgeInfo {
  switch (cls) {
    case "brilliant":
      return {
        classification: "brilliant",
        symbol: "!!",
        label: "Brilliant",
        color: "#00e5ff",
        badgeBg: "rgba(0, 229, 255, 0.22)",
        description: "Spectacular sacrificial move finding the best resource under tension",
      };
    case "great":
      return {
        classification: "great",
        symbol: "!",
        label: "Great Move",
        color: "#38bdf8",
        badgeBg: "rgba(56, 189, 248, 0.22)",
        description: "Exceptional critical move that was hard to find",
      };
    case "best":
      return {
        classification: "best",
        symbol: "★",
        label: "Best Move",
        color: "#10b981",
        badgeBg: "rgba(16, 185, 129, 0.22)",
        description: "Optimal engine recommendation in this position",
      };
    case "good":
      return {
        classification: "good",
        symbol: "○",
        label: "Good Move",
        color: "#84cc16",
        badgeBg: "rgba(132, 204, 22, 0.2)",
        description: "Sound, natural move preserving your evaluation",
      };
    case "book":
      return {
        classification: "book",
        symbol: "📖",
        label: "Book",
        color: "#d97706",
        badgeBg: "rgba(217, 119, 6, 0.22)",
        description: "Established opening theory",
      };
    case "inaccuracy":
      return {
        classification: "inaccuracy",
        symbol: "?!",
        label: "Inaccuracy",
        color: "#eab308",
        badgeBg: "rgba(234, 179, 8, 0.22)",
        description: "Suboptimal move shedding minor evaluation advantage",
      };
    case "mistake":
      return {
        classification: "mistake",
        symbol: "?",
        label: "Mistake",
        color: "#f97316",
        badgeBg: "rgba(249, 115, 22, 0.22)",
        description: "Visible mistake conceding initiative or pawn",
      };
    case "blunder":
      return {
        classification: "blunder",
        symbol: "??",
        label: "Blunder",
        color: "#ef4444",
        badgeBg: "rgba(239, 68, 68, 0.25)",
        description: "Severe blunder leading to heavy material or tactical loss",
      };
    default:
      return {
        classification: "good",
        symbol: "○",
        label: "Good Move",
        color: "#84cc16",
        badgeBg: "rgba(132, 204, 22, 0.2)",
        description: "Sound move",
      };
  }
}

export function classifyMove(
  lossCentipawns: number,
  ply?: number,
  isSacrifice?: boolean,
  isCritical?: boolean
): MoveClassification {
  if (isSacrifice && lossCentipawns <= 15) return "brilliant";
  if (isCritical && lossCentipawns === 0) return "great";
  if (ply !== undefined && ply <= 6 && lossCentipawns <= 25) return "book";
  if (lossCentipawns <= 15) return "best";
  if (lossCentipawns <= 40) return "good";
  if (lossCentipawns <= 90) return "inaccuracy";
  if (lossCentipawns <= 200) return "mistake";
  return "blunder";
}

export function riskFor(probability: number): { label: string; tone: RiskBand; description: string } {
  if (probability >= 0.65) {
    return {
      label: "Critical Blunder Risk",
      tone: "high",
      description: "Severe tactical danger. Extreme caution required.",
    };
  }
  if (probability >= 0.35) {
    return {
      label: "Elevated Risk",
      tone: "medium",
      description: "Sharp position. Check candidate defenses carefully.",
    };
  }
  return {
    label: "Safe / Stable",
    tone: "low",
    description: "Position is tactically sound. Focus on strategic planning.",
  };
}

export function formatEvaluation(cp: number | null): string {
  if (cp === null) return "0.00";
  if (cp >= 9000) return "# 1-0";
  if (cp <= -9000) return "# 0-1";
  const val = (cp / 100).toFixed(1);
  return cp > 0 ? `+${val}` : `${val}`;
}

export function detectOpening(historySan: string[]): string {
  if (!historySan || historySan.length === 0) return "Starting Position";

  const moves = historySan.slice(0, 6).join(" ");

  if (moves.startsWith("e4 e5 Nf3 Nc6 Bb5")) return "Ruy Lopez";
  if (moves.startsWith("e4 e5 Nf3 Nc6 Bc4")) return "Italian Game";
  if (moves.startsWith("e4 e5 Nf3 Nc6 d4")) return "Scotch Game";
  if (moves.startsWith("e4 e5 Nf3")) return "King's Knight Opening";
  if (moves.startsWith("e4 e5 f4")) return "King's Gambit";
  if (moves.startsWith("e4 e5 Bc4")) return "Bishop's Opening";
  if (moves.startsWith("e4 e5 Qh5")) return "Wayward Queen Attack";
  if (moves.startsWith("e4 c5 Nf3 d6 d4")) return "Sicilian: Open";
  if (moves.startsWith("e4 c5")) return "Sicilian Defense";
  if (moves.startsWith("e4 e6 d4 d5")) return "French Defense";
  if (moves.startsWith("e4 e6")) return "French Defense";
  if (moves.startsWith("e4 c6 d4 d5")) return "Caro-Kann Defense";
  if (moves.startsWith("e4 c6")) return "Caro-Kann Defense";
  if (moves.startsWith("e4 d5 exd5")) return "Scandinavian Defense";
  if (moves.startsWith("e4 d5")) return "Scandinavian Defense";
  if (moves.startsWith("e4 d6")) return "Pirc Defense";
  if (moves.startsWith("d4 d5 c4 e6")) return "Queen's Gambit Declined";
  if (moves.startsWith("d4 d5 c4 c6")) return "Slav Defense";
  if (moves.startsWith("d4 d5 c4 dxc4")) return "Queen's Gambit Accepted";
  if (moves.startsWith("d4 d5 c4")) return "Queen's Gambit";
  if (moves.startsWith("d4 Nf6 c4 g6")) return "King's Indian Defense";
  if (moves.startsWith("d4 Nf6 c4 e6")) return "Nimzo/Bogo-Indian";
  if (moves.startsWith("d4 Nf6")) return "Indian Defense";
  if (moves.startsWith("d4 f5")) return "Dutch Defense";
  if (moves.startsWith("c4")) return "English Opening";
  if (moves.startsWith("Nf3")) return "Réti Opening";

  return "Open Game";
}

export function coachingTakeaway(outcome: SavedGame): string {
  const result = outcome.result.toLowerCase();
  const reason = outcome.reason.toLowerCase();

  if (reason.includes("checkmate")) {
    if (result.includes("white wins")) {
      return outcome.playerColor === "b"
        ? "Review the decisive blunder plies to see where defensive luft or coordination broke down."
        : "Excellent tactical execution delivering checkmate!";
    }
    return outcome.playerColor === "w"
      ? "Review king safety and back-rank defense in the Game Review tab to identify where the fatal threat penetrated."
      : "Magnificent checkmate victory with Black!";
  }
  if (reason.includes("stalemate") || reason.includes("draw")) {
    return "Balanced, resilient game ending in a draw. Inspect the move analysis below to see missed winning windows.";
  }
  return "Step through each move in the Game Review tab to see where the evaluation shifted and how to prevent similar inaccuracies.";
}

export type CapturedInfo = {
  capturedByWhite: string[];
  capturedByBlack: string[];
  materialDiff: number;
};

export function getCapturedPieces(position: Chess): CapturedInfo {
  const board = position.board();
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const currentCounts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number>,
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number>,
  };

  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.type !== "k") {
        currentCounts[sq.color][sq.type] = (currentCounts[sq.color][sq.type] || 0) + 1;
      }
    }
  }

  const whiteSymbols: Record<string, string> = { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕" };
  const blackSymbols: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛" };

  const capturedByWhite: string[] = [];
  const capturedByBlack: string[] = [];
  let whiteScore = 0;
  let blackScore = 0;

  for (const [type, init] of Object.entries(initialCounts)) {
    const lostBlack = init - (currentCounts.b[type] || 0);
    for (let i = 0; i < lostBlack; i++) {
      capturedByWhite.push(blackSymbols[type]);
      whiteScore += pieceValues[type];
    }
    const lostWhite = init - (currentCounts.w[type] || 0);
    for (let i = 0; i < lostWhite; i++) {
      capturedByBlack.push(whiteSymbols[type]);
      blackScore += pieceValues[type];
    }
  }

  return {
    capturedByWhite,
    capturedByBlack,
    materialDiff: whiteScore - blackScore,
  };
}

export function computeLocalTerritory(game: Chess): TerritoryControl {
  const board = game.board();
  const squares: Record<string, { square: string; white_attackers: number; black_attackers: number; dominant: "w" | "b" | "contested" | "neutral"; intensity: number }> = {};

  const whiteAttacks: Record<string, number> = {};
  const blackAttacks: Record<string, number> = {};

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = `${files[c]}${ranks[7 - r]}` as Square;
      whiteAttacks[sq] = 0;
      blackAttacks[sq] = 0;
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const color = piece.color;
      const targetMap = color === "w" ? whiteAttacks : blackAttacks;
      const fIdx = c;
      const rIdx = 7 - r;

      if (piece.type === "p") {
        const fwd = color === "w" ? 1 : -1;
        const targetR = rIdx + fwd;
        if (targetR >= 0 && targetR < 8) {
          if (fIdx > 0) targetMap[`${files[fIdx - 1]}${ranks[targetR]}`]++;
          if (fIdx < 7) targetMap[`${files[fIdx + 1]}${ranks[targetR]}`]++;
        }
      } else if (piece.type === "n") {
        const knightOffsets = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1],
        ];
        for (const [df, dr] of knightOffsets) {
          const nf = fIdx + df;
          const nr = rIdx + dr;
          if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            targetMap[`${files[nf]}${ranks[nr]}`]++;
          }
        }
      } else if (piece.type === "k") {
        for (let df = -1; df <= 1; df++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0) continue;
            const nf = fIdx + df;
            const nr = rIdx + dr;
            if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
              targetMap[`${files[nf]}${ranks[nr]}`]++;
            }
          }
        }
      } else {
        const dirs: [number, number][] = [];
        if (piece.type === "b" || piece.type === "q") {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === "r" || piece.type === "q") {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        for (const [df, dr] of dirs) {
          let nf = fIdx + df;
          let nr = rIdx + dr;
          while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const sqName = `${files[nf]}${ranks[nr]}`;
            targetMap[sqName]++;
            const blocker = board[7 - nr][nf];
            if (blocker) break;
            nf += df;
            nr += dr;
          }
        }
      }
    }
  }

  let whiteCount = 0;
  let blackCount = 0;
  let contestedCount = 0;
  let neutralCount = 0;

  const centerSquares = ["e4", "d4", "e5", "d5"];
  let whiteCenterPower = 0;
  let blackCenterPower = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = `${files[c]}${ranks[7 - r]}`;
      const occupant = board[r][c];
      const wAtt = whiteAttacks[sq] || 0;
      const bAtt = blackAttacks[sq] || 0;
      const wScore = wAtt + (occupant?.color === "w" ? 1 : 0);
      const bScore = bAtt + (occupant?.color === "b" ? 1 : 0);

      let dom: "w" | "b" | "contested" | "neutral" = "neutral";
      let intensity = 0;

      if (wScore > bScore) {
        dom = "w";
        whiteCount++;
        intensity = Math.min(0.85, 0.35 + (wScore - bScore) * 0.15);
      } else if (bScore > wScore) {
        dom = "b";
        blackCount++;
        intensity = Math.min(0.85, 0.35 + (bScore - wScore) * 0.15);
      } else if (wScore > 0) {
        dom = "contested";
        contestedCount++;
        intensity = 0.35;
      } else {
        dom = "neutral";
        neutralCount++;
        intensity = 0;
      }

      if (centerSquares.includes(sq)) {
        whiteCenterPower += wScore;
        blackCenterPower += bScore;
      }

      squares[sq] = {
        square: sq,
        white_attackers: wAtt,
        black_attackers: bAtt,
        dominant: dom,
        intensity: Number(intensity.toFixed(2)),
      };
    }
  }

  const totCenter = whiteCenterPower + blackCenterPower;
  const wCenterPct = totCenter > 0 ? Math.round((whiteCenterPower / totCenter) * 100) : 50;
  const bCenterPct = 100 - wCenterPct;

  return {
    fen: game.fen(),
    squares,
    center_control: {
      white_percent: wCenterPct,
      black_percent: bCenterPct,
      contested_percent: 0,
    },
    total_influence: {
      white_squares: whiteCount,
      black_squares: blackCount,
      contested_squares: contestedCount,
      neutral_squares: neutralCount,
    },
  };
}

export function calculateCapsAccuracy(moves: MoveAnalysisItem[]): { white: number; black: number } {
  const whiteMoves = moves.filter((m) => m.player === "White");
  const blackMoves = moves.filter((m) => m.player === "Black");

  const calc = (ms: MoveAnalysisItem[]): number => {
    if (!ms.length) return 100;
    const scores = ms.map((m) => 100 * Math.exp(-0.0035 * Math.max(0, m.evaluation_loss_centipawns)));
    return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
  };

  return {
    white: calc(whiteMoves),
    black: calc(blackMoves),
  };
}

export function estimatePerformanceRating(caps: number, avgLoss: number): number {
  const raw = 600 + caps * 22 - avgLoss * 2;
  return Math.max(400, Math.min(3100, Math.round(raw)));
}
