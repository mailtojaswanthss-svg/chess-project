import type { Move } from "chess.js";

export type RiskBand = "low" | "medium" | "high";

export type Analysis = {
  blunder_probability: number;
  rating: number;
  fen: string;
  risk_band: RiskBand;
  model_samples: number | null;
  side_to_move?: "w" | "b";
};

export type PlayMode = "free_lab" | "max_engine" | "human_sparring" | "tricky_bot" | "trap_puzzle";
export type AppTab = "arena" | "trap_dojo" | "blunder_dna" | "academy" | "settings";

export interface AcademyLesson {
  id: string;
  title: string;
  pillar: "opening" | "middlegame" | "endgame" | "defense";
  subtitle: string;
  fen: string;
  objective: string;
  keyPoints: string[];
  difficulty: "Beginner" | "Intermediate" | "Master";
}

export type BotMove = {
  fen: string;
  uci: string;
  san: string;
  evaluation_centipawns: number;
  predicted_blunder_probability?: number;
  evaluation_loss_centipawns?: number;
};

export type ModelHealth = {
  status?: string;
  model_loaded?: boolean;
  model_train_samples: number | null;
  model_metrics?: {
    accuracy?: number;
    majority_accuracy?: number;
    roc_auc?: number;
    brier_score?: number;
    calibration_error?: number;
    pr_auc?: number;
    top_decile_lift?: number;
    brier_skill_vs_base_rate?: number;
    decision_threshold?: number;
  };
};

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type ThreatMotif = "pinned" | "hanging" | "underdefended" | "vulnerable" | "check";

export type ThreatItem = {
  square: string;
  piece: string;
  motif: ThreatMotif;
  description: string;
};

export type CandidateMove = {
  san: string;
  uci: string;
  centipawns: number;
  loss_centipawns: number;
  blunder_probability: number;
  classification: MoveClassification;
};

export type WinChances = {
  white: number;
  draw: number;
  black: number;
};

export type TacticalAnalysis = {
  fen: string;
  side_to_move: "White" | "Black";
  overall_blunder_probability: number;
  risk_band: RiskBand;
  threats: ThreatItem[];
  candidate_moves: CandidateMove[];
  coach_explanation: string;
  win_chances: WinChances;
  evaluation_centipawns: number;
};

export type MoveAnalysisItem = {
  ply: number;
  move_number: number;
  player: "White" | "Black";
  san: string;
  uci: string;
  fen: string;
  probability: number;
  risk_band: RiskBand;
  evaluation_loss_centipawns: number;
  is_blunder: boolean;
  classification?: MoveClassification;
  badge_symbol?: string;
};

export type GameReport = {
  headers: Record<string, string>;
  moves: MoveAnalysisItem[];
  blunder_count: number;
  high_risk_count: number;
  caps_accuracy?: { white: number; black: number };
  performance_rating?: { white: number; black: number };
  badge_counts?: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
};

export type SavedGame = {
  id: string;
  completedAt: string;
  result: string;
  reason: string;
  moves: string[];
  pgn: string;
  playerColor?: "w" | "b";
  mode?: PlayMode | string;
  rating?: number;
};

export type MovePair = {
  number: number;
  white?: Move;
  black?: Move;
};

export type TerritorySquare = {
  square: string;
  white_attackers: number;
  black_attackers: number;
  dominant: "w" | "b" | "contested" | "neutral";
  intensity: number;
};

export type TerritoryControl = {
  fen: string;
  squares: Record<string, TerritorySquare>;
  center_control: {
    white_percent: number;
    black_percent: number;
    contested_percent: number;
  };
  total_influence: {
    white_squares: number;
    black_squares: number;
    contested_squares: number;
    neutral_squares: number;
  };
};

export type BlunderDnaDimensions = {
  pins: number;
  hanging_pieces: number;
  overloaded_defenders: number;
  back_rank: number;
  time_scramble: number;
  pawn_structure: number;
};

export type TacticalArchetype = {
  name: string;
  title: string;
  quote: string;
  badge_color: string;
  dominant_flaw: string;
  strengths: string[];
  blind_spots: string[];
  training_prescription: string;
};

export type BlunderDnaReport = {
  dimensions: BlunderDnaDimensions;
  archetype: TacticalArchetype;
  resilience_score: number;
  games_analyzed: number;
  blunders_detected: number;
  critical_advice: string[];
};

export type TrapDrill = {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Master";
  theme: string;
  side_to_move: "White" | "Black";
  fen: string;
  tempted_move_san: string;
  tempted_move_uci: string;
  is_trap: boolean;
  prompt: string;
  trap_explanation: string;
  punishment_line: string[];
};


export type CoachExplanation = {
  headline: string;
  concept: string;
  explanation: string;
  threat_summary: string;
  recommended_move: string;
  tactical_tags: string[];
  confidence: number;
  engine_source: string;
};
