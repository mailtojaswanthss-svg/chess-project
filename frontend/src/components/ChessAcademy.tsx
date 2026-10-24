import React, { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Swords,
  Shield,
  Compass,
  Sparkles,
  Play,
  CheckCircle2,
  Filter,
} from "lucide-react";
import type { AcademyLesson } from "../types/chess";
import { playSound } from "../utils/audio";

interface ChessAcademyProps {
  onPracticePosition: (fen: string, lessonTitle: string) => void;
  initialPillar?: string;
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  // 1. Opening Mastery (Cyan)
  {
    id: "opening-giuoco-piano",
    title: "Italian Game: Giuoco Piano Central Strike",
    pillar: "opening",
    subtitle: "Classical e4/e5 Central Clashes & Harmonious Development",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5",
    objective:
      "Establish expansive central presence with d2-d4, opening powerful diagonal channels for the bishops while securing king safety.",
    keyPoints: [
      "Seize central control over e4 and d4 squares with dynamic pawn support",
      "Develop minor pieces toward the center before initiating pawn storm breaks",
      "Castle early to tuck your King safely behind solid pawns",
    ],
    difficulty: "Beginner",
  },
  {
    id: "opening-najdorf-outpost",
    title: "Sicilian Defense: Najdorf Outpost Warfare",
    pillar: "opening",
    subtitle: "Asymmetrical Counter-Attacking & The Critical d5 Pivot",
    fen: "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6",
    objective:
      "Master the classic Sicilian dynamic: White commands space and rapid initiative, while Black prepares Queenside expansion (...b5) with counter-play down the c-file.",
    keyPoints: [
      "The d5 outpost is the central tactical pivot in Najdorf structures",
      "Black's ...a6 prophylaxis safeguards b5 from enemy knight infiltration",
      "Opposite-side castling creates a thrilling double-edged mating race",
    ],
    difficulty: "Intermediate",
  },

  // 2. Middlegame Warfare (Violet)
  {
    id: "middlegame-greek-gift",
    title: "The Classical Greek Gift Sacrifice (Bxh7+)",
    pillar: "middlegame",
    subtitle: "Demolishing Castled King Defenses with a Decoy Bishop",
    fen: "r1bq1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 4 7",
    objective:
      "Execute the thematic Bxh7+ clearance sacrifice by exploiting an undefended h7 square, followed by Ng5+ and Queen infiltration onto h5.",
    keyPoints: [
      "Precondition 1: The enemy f6 knight defender must be absent or deflectable",
      "Precondition 2: White's dark-squared bishop must control the g5 jump square",
      "Precondition 3: The White Queen must have an immediate highway to h5",
    ],
    difficulty: "Intermediate",
  },
  {
    id: "middlegame-pin-crusher",
    title: "The Absolute Pin Crusher",
    pillar: "middlegame",
    subtitle: "Exploiting Paralyzed Pieces to Win Decisive Material",
    fen: "r1b1k2r/pppp1ppp/5n2/4q3/1bP5/2N1P3/PP1B1PPP/R2QKB1R w KQkq - 0 9",
    objective:
      "Identify pinned pieces along King files and diagonals, then systematically pile attackers on the pinned unit until it inevitably collapses.",
    keyPoints: [
      "An absolute pin freezes the target completely because moving it exposes the King",
      "Attack the pinned piece with lower-value pawns and knights to maximize gain",
      "Maintain the pin; do not trade prematurely unless forced by tactical refutation",
    ],
    difficulty: "Master",
  },

  // 3. Endgame Precision (Amber)
  {
    id: "endgame-lucena-bridge",
    title: "Lucena Position: Building the Bridge",
    pillar: "endgame",
    subtitle: "The Master Blueprint for Converting Rook & Pawn Endgames",
    fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1",
    objective:
      "Convert a 7th-rank passed pawn into a new Queen by activating the rook to the 4th rank (1.Rc4!) and shielding the King from vertical checks.",
    keyPoints: [
      "Step 1: Check the enemy King away from the promotion file (1.Rd1+)",
      "Step 2: Place your rook on the 4th rank (1.Rc4!) to prepare the bridge",
      "Step 3: March your King out; use the 4th-rank rook to block the checks",
    ],
    difficulty: "Intermediate",
  },
  {
    id: "endgame-philidor-barrier",
    title: "Philidor Defense: Third Rank Barrier",
    pillar: "endgame",
    subtitle: "The Essential Technique to Secure a Draw Down a Pawn",
    fen: "8/4k3/8/4P3/8/8/3R4/r3K3 b - - 0 1",
    objective:
      "Hold an airtight draw against an advanced rook and pawn by anchoring your rook on the 6th rank (or 3rd rank) to restrict the enemy king, then switching to rear checks.",
    keyPoints: [
      "Keep your rook on the 6th rank to prevent the enemy King from advancing forward",
      "Once the enemy pawn pushes to the 6th rank, immediately drop your rook to the 1st rank",
      "Deliver endless checks from behind since the enemy King has no shelter",
    ],
    difficulty: "Master",
  },

  // 4. The Art of Defense & Prophylaxis (Crimson)
  {
    id: "defense-prophylactic-luft",
    title: "Petrosian Prophylaxis & King Luft",
    pillar: "defense",
    subtitle: "Extinguishing Enemy Tactical Threats Before They Are Conceived",
    fen: "r4rk1/pp1b1ppp/2n1pn2/q2p4/2PP4/P1NBPN2/1PQ2PPP/R3K2R w KQ - 1 11",
    objective:
      "Analyze your opponent's intended plans and neutralize their tactical avenues in advance using disciplined prophylaxis and pawn anchors.",
    keyPoints: [
      "Always ask: 'If it were my opponent's turn, what would their most dangerous move be?'",
      "Play gentle prophylactic pawn moves (h3 / a3) to eliminate outposts and pins",
      "King safety comes first: creating 'luft' guarantees you never suffer back-rank mate",
    ],
    difficulty: "Intermediate",
  },
  {
    id: "defense-back-rank-parry",
    title: "Parrying the Back-Rank Swindle",
    pillar: "defense",
    subtitle: "Corridor Defense, Escape Hatches & Interposition",
    fen: "3r2k1/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1",
    objective:
      "Recognize back-rank corridor vulnerability and execute urgent defensive prophylaxis before heavy enemy pieces deliver catastrophic mate.",
    keyPoints: [
      "A back-rank mate ignores material advantages; king safety is absolute",
      "Always verify that your King has an open flight square (luft) on h2/g2/h7/g7",
      "Maintain active rook coordination along the 1st or 2nd rank for mutual defense",
    ],
    difficulty: "Beginner",
  },
];

export const ChessAcademy: React.FC<ChessAcademyProps> = ({ onPracticePosition, initialPillar = "all" }) => {
  const [selectedPillar, setSelectedPillar] = useState<string>(initialPillar);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  React.useEffect(() => {
    if (initialPillar && initialPillar !== "all") {
      setSelectedPillar(initialPillar);
    }
  }, [initialPillar]);

  const filteredLessons = ACADEMY_LESSONS.filter((lesson) => {
    if (selectedPillar !== "all" && lesson.pillar !== selectedPillar) return false;
    if (selectedDifficulty !== "all" && lesson.difficulty.toLowerCase() !== selectedDifficulty.toLowerCase())
      return false;
    return true;
  });

  const getPillarMeta = (pillar: AcademyLesson["pillar"]) => {
    switch (pillar) {
      case "opening":
        return {
          title: "Opening Mastery",
          badgeColor: "#38bdf8",
          icon: Compass,
          headerTone: "cyan-pillar",
        };
      case "middlegame":
        return {
          title: "Middlegame Warfare",
          badgeColor: "#a855f7",
          icon: Swords,
          headerTone: "violet-pillar",
        };
      case "endgame":
        return {
          title: "Endgame Precision",
          badgeColor: "#f59e0b",
          icon: BookOpen,
          headerTone: "amber-pillar",
        };
      case "defense":
        return {
          title: "Art of Defense & Prophylaxis",
          badgeColor: "#ef4444",
          icon: Shield,
          headerTone: "crimson-pillar",
        };
    }
  };

  return (
    <div className="academy-container">
      {/* 1. Academy Hero Header */}
      <div className="academy-header-card">
        <div className="academy-badge-pill">
          <GraduationCap size={18} className="text-cyan" />
          <span>GRANDMASTER CURRICULUM</span>
        </div>
        <h2>ChessWise Tactical &amp; Strategic Academy</h2>
        <p>
          Master the four cornerstones of high-level chess: opening harmony, sharp tactical calculation,
          endgame precision, and ironclad prophylaxis. Practice each position directly in our Free Lab.
        </p>

        {/* Pillar Filter Bar */}
        <div className="academy-filter-bar">
          <div className="filter-group">
            <span className="filter-group-label">Pillar:</span>
            <button
              className={`academy-filter-btn ${selectedPillar === "all" ? "active" : ""}`}
              onClick={() => {
                playSound("click");
                setSelectedPillar("all");
              }}
            >
              All Pillars ({ACADEMY_LESSONS.length})
            </button>
            <button
              className={`academy-filter-btn opening ${selectedPillar === "opening" ? "active" : ""}`}
              onClick={() => {
                playSound("click");
                setSelectedPillar("opening");
              }}
            >
              🟦 Opening Mastery
            </button>
            <button
              className={`academy-filter-btn middlegame ${selectedPillar === "middlegame" ? "active" : ""}`}
              onClick={() => {
                playSound("click");
                setSelectedPillar("middlegame");
              }}
            >
              🟪 Middlegame Warfare
            </button>
            <button
              className={`academy-filter-btn endgame ${selectedPillar === "endgame" ? "active" : ""}`}
              onClick={() => {
                playSound("click");
                setSelectedPillar("endgame");
              }}
            >
              🟧 Endgame Precision
            </button>
            <button
              className={`academy-filter-btn defense ${selectedPillar === "defense" ? "active" : ""}`}
              onClick={() => {
                playSound("click");
                setSelectedPillar("defense");
              }}
            >
              🟥 Defense &amp; Prophylaxis
            </button>
          </div>

          <div className="filter-group right">
            <span className="filter-group-label">Difficulty:</span>
            {["all", "beginner", "intermediate", "master"].map((diff) => (
              <button
                key={diff}
                className={`academy-filter-btn diff-btn ${selectedDifficulty === diff ? "active" : ""}`}
                onClick={() => {
                  playSound("click");
                  setSelectedDifficulty(diff);
                }}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Four Color-Coded Learning Columns / Cards Grid */}
      <div className="academy-lessons-grid">
        {filteredLessons.map((lesson) => {
          const meta = getPillarMeta(lesson.pillar);
          const PillarIcon = meta.icon;

          return (
            <div key={lesson.id} className={`academy-lesson-card ${meta.headerTone}`}>
              {/* Card Header */}
              <div className="lesson-card-header">
                <div className="lesson-pillar-badge" style={{ borderColor: meta.badgeColor, color: meta.badgeColor }}>
                  <PillarIcon size={13} />
                  <span>{meta.title}</span>
                </div>
                <span
                  className={`lesson-diff-tag ${
                    lesson.difficulty === "Beginner"
                      ? "diff-beginner"
                      : lesson.difficulty === "Intermediate"
                      ? "diff-intermediate"
                      : "diff-master"
                  }`}
                >
                  {lesson.difficulty}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h3 className="lesson-title">{lesson.title}</h3>
              <p className="lesson-subtitle">{lesson.subtitle}</p>

              {/* Objective Box */}
              <div className="lesson-objective-box">
                <strong className="obj-title">Core Objective:</strong>
                <p className="obj-text">{lesson.objective}</p>
              </div>

              {/* Key Takeaways */}
              <div className="lesson-keypoints-list">
                <strong className="keypoints-title">Key Tactical Takeaways:</strong>
                <ul>
                  {lesson.keyPoints.map((point, pIdx) => (
                    <li key={pIdx}>
                      <CheckCircle2 size={13} className="point-icon" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practice in Free Lab Action Button */}
              <div className="lesson-footer-action">
                <button
                  className="practice-lab-btn"
                  onClick={() => {
                    playSound("click");
                    onPracticePosition(lesson.fen, lesson.title);
                  }}
                  title="Load this curated position into the Tactical Arena Free Lab"
                >
                  <Play size={14} />
                  <span>Practice Position in Free Lab</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
