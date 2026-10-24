// Plain-English definitions for every number the app shows.
// Keep these in step with the backend formulas they describe.

export type MetricKey =
  | "blunderRisk"
  | "opponentSlip"
  | "outlook"
  | "evalBar"
  | "centreControl"
  | "accuracy"
  | "performance"
  | "moveRisk"
  | "dnaDimensions"
  | "resilience"
  | "riskyPositions"
  | "spotterAccuracy";

export type MetricCopy = {
  title: string;
  /** What the number means, one sentence */
  what: string;
  /** How it's calculated */
  how: string;
  /** Caveat worth knowing, if any */
  note?: string;
};

export const METRIC_COPY: Record<MetricKey, MetricCopy> = {
  blunderRisk: {
    title: "Blunder risk",
    what: "The chance that the side to move, playing at the rating you picked, makes a move that loses about a pawn or more (100+ centipawns).",
    how: "A Random Forest trained on rated games reads 14 facts about the position (material, legal moves for both sides, attackers near each king, undefended pieces, check, castling rights, your rating) and outputs a calibrated probability. 35%+ is sharp, 65%+ is high.",
    note: "It's a prediction about people at that rating, not a judgement of the position itself.",
  },
  opponentSlip: {
    title: "Opponent slip chance",
    what: "If you play this move, the chance your opponent then blunders (loses a pawn or more) on their reply.",
    how: "The same blunder model, run on the position after the candidate move.",
    note: "High numbers mean the move sets practical problems, not that it's objectively better.",
  },
  outlook: {
    title: "White / Draw / Black",
    what: "A rough estimate of how the game ends from here if both sides keep playing well.",
    how: "Converted from Stockfish's evaluation: a logistic curve (each pawn of advantage shifts it about 10%), with a draw share of up to 36% when the position is level.",
    note: "It's a formula on the engine score, not statistics from real games.",
  },
  evalBar: {
    title: "Engine evaluation",
    what: "Stockfish's score in pawns from White's side: +1.00 means White is about a pawn better, M3 means mate in 3.",
    how: "The bar fill uses the same curve as Outlook, so a level position sits at 50%.",
  },
  centreControl: {
    title: "Centre control",
    what: "How the attacks on the four centre squares (d4, e4, d5, e5) split between the two sides.",
    how: "For each centre square we count the pieces attacking it, plus the piece standing on it, for each side. The % is each side's share of that total.",
  },
  accuracy: {
    title: "Accuracy",
    what: "How close each player's moves were to Stockfish's best, from 0 to 100.",
    how: "Each move scores 100 × e^(−0.0035 × centipawns lost), so a perfect move is 100 and losing a full pawn is about 70. The game score is the average.",
    note: "Our own formula; it won't match chess.com or Lichess exactly.",
  },
  performance: {
    title: "Est. performance",
    what: "A rough guess at the rating someone would need to play like this in one game.",
    how: "600 + 22 × accuracy − 2 × average centipawns lost, kept between 400 and 3100.",
    note: "A single game is a small sample, so treat it as a ballpark.",
  },
  moveRisk: {
    title: "Risk on this move",
    what: "The blunder model's estimate, before the move was played, that the player would lose a pawn or more here.",
    how: "Same model as the live blunder risk, at the rating you analysed with.",
  },
  dnaDimensions: {
    title: "Weakness rates",
    what: "Each bar is the % of your positions (just before you moved) where that weakness was on your side of the board.",
    how: "We replay your saved games and check only your side: pieces that are attacked and under-defended, pinned pieces, defenders guarding 2+ attacked pieces, a boxed-in king on the back rank, doubled or isolated pawns. Late-game slips are the % of your positions after move 25 with a loose piece.",
    note: "There's no clock data, so late-game slips stand in for time pressure. Lower is better.",
  },
  resilience: {
    title: "Resilience",
    what: "An overall score for how rarely those weaknesses showed up in your games. Higher is better.",
    how: "100 minus the average of the six weakness rates.",
  },
  riskyPositions: {
    title: "Risky positions",
    what: "How many of your positions had a loose piece, or one defender guarding two attacked pieces.",
    how: "Counted while replaying your saved games, your side only.",
  },
  spotterAccuracy: {
    title: "Spotter accuracy",
    what: "The share of Trap Spotter positions you judged correctly this session.",
    how: "Correct answers ÷ attempts.",
  },
};

/** Win/draw/loss split from an eval in White's centipawns. Mirrors _calculate_win_chances in api.py. */
export function winChancesFromEval(whiteCp: number): { white: number; draw: number; black: number } {
  if (whiteCp >= 9000) return { white: 1, draw: 0, black: 0 };
  if (whiteCp <= -9000) return { white: 0, draw: 0, black: 1 };
  const w = 1 / (1 + Math.exp(-0.004 * whiteCp));
  const draw = 0.36 * Math.exp(-((whiteCp / 280) ** 2));
  const rest = Math.max(0, 1 - draw);
  return { white: rest * w, draw, black: rest * (1 - w) };
}
