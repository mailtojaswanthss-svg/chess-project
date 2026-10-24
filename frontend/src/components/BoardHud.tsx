import React, { useMemo } from "react";
import { ShieldCheck, AlertTriangle, Flame, Compass } from "lucide-react";

interface BoardHudProps {
  sideToMove: "w" | "b";
  fen: string;
  moveCount: number;
  riskScore: number; // 0.0 to 1.0
  isCheck?: boolean;
}

export const BoardHud: React.FC<BoardHudProps> = ({
  sideToMove,
  fen,
  moveCount,
  riskScore,
  isCheck = false,
}) => {
  // Determine game phase deterministically from moveCount & piece distribution in FEN
  const gamePhase = useMemo(() => {
    const boardPart = fen.split(" ")[0] || "";
    // Count major and minor pieces (exclude kings and pawns)
    let majorMinorCount = 0;
    let queens = 0;
    for (const char of boardPart) {
      if ("rnbqRNBQ".includes(char)) majorMinorCount++;
      if (char === "q" || char === "Q") queens++;
    }

    if (moveCount <= 10 && majorMinorCount >= 12) {
      return {
        label: "Opening Phase",
        tone: "opening",
        sub: "Theory & Development",
      };
    }

    if (queens === 0 || majorMinorCount <= 6 || (moveCount > 28 && majorMinorCount <= 8)) {
      return {
        label: "Endgame Conversion",
        tone: "endgame",
        sub: "King Activity & Queening",
      };
    }

    return {
      label: "Middlegame Tension",
      tone: "middlegame",
      sub: "Strategy & Tactical Sharpness",
    };
  }, [fen, moveCount]);

  // Determine Blunder Risk Badge
  const riskBadge = useMemo(() => {
    const pct = Math.round(riskScore * 100);
    if (riskScore < 0.20) {
      return {
        label: `Low < 20% (${pct}%)`,
        tone: "low",
        icon: ShieldCheck,
      };
    }
    if (riskScore <= 0.35) {
      return {
        label: `Moderate 20-35% (${pct}%)`,
        tone: "medium",
        icon: AlertTriangle,
      };
    }
    return {
      label: `Critical > 35% (${pct}%)`,
      tone: "high",
      icon: Flame,
    };
  }, [riskScore]);

  const RiskIcon = riskBadge.icon;

  return (
    <div className="board-hud-strip">
      {/* 1. Turn Indicator Pill */}
      <div className={`hud-pill turn-pill ${sideToMove === "w" ? "white-turn" : "black-turn"}`}>
        <span className="turn-glyph">{sideToMove === "w" ? "♔" : "♚"}</span>
        <span className="turn-text">{sideToMove === "w" ? "White to Move" : "Black to Move"}</span>
        <span className="status-dot pulse" />
      </div>

      {/* 2. Check Alert if active */}
      {isCheck && (
        <div className="hud-pill check-pill">
          <span className="pulse-danger-dot" />
          <span className="check-text">CHECK!</span>
        </div>
      )}

      {/* 3. Game Phase Pill */}
      <div className={`hud-pill phase-pill ${gamePhase.tone}`} title={gamePhase.sub}>
        <Compass size={14} className="hud-icon" />
        <span className="phase-text">{gamePhase.label}</span>
      </div>

      {/* 4. Blunder Risk Meter Badge */}
      <div
        className={`hud-pill risk-pill ${riskBadge.tone}`}
        title={`Estimated Human Blunder Risk: ${Math.round(riskScore * 100)}%`}
      >
        <RiskIcon size={14} className="hud-icon" />
        <span className="risk-text">Blunder Risk: {riskBadge.label}</span>
      </div>
    </div>
  );
};
