import "./ChessAcademy.css";
import React, { useEffect, useRef, useState } from "react";
import { BookOpen, Swords, Shield, Compass, Play, CheckCircle2, type LucideIcon } from "lucide-react";
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

type Pillar = AcademyLesson["pillar"];

const PILLARS: { id: Pillar; title: string; blurb: string; icon: LucideIcon; tone: string }[] = [
  { id: "opening", title: "Openings", blurb: "Centre, development, king safety", icon: Compass, tone: "accent" },
  { id: "middlegame", title: "Middlegames", blurb: "Plans, pins and attacks", icon: Swords, tone: "violet" },
  { id: "endgame", title: "Endgames", blurb: "Technique and the active king", icon: BookOpen, tone: "warn" },
  { id: "defense", title: "Defense", blurb: "Prophylaxis and parrying threats", icon: Shield, tone: "danger" },
];

const DIFFICULTIES = ["all", "Beginner", "Intermediate", "Master"] as const;

const GLYPH: Record<string, string> = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
};

/** Static, non-interactive preview of a FEN position. */
const MiniBoard: React.FC<{ fen: string }> = ({ fen }) => {
  const rows = (fen.split(" ")[0] ?? "").split("/");
  const cells: { piece: string; dark: boolean }[] = [];
  rows.forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) cells.push({ piece: "", dark: (r + file++) % 2 === 1 });
      } else {
        cells.push({ piece: ch, dark: (r + file++) % 2 === 1 });
      }
    }
  });
  return (
    <div className="mini-board" aria-hidden="true">
      {cells.map((c, i) => (
        <span key={i} className={`mini-sq ${c.dark ? "is-dark" : ""} ${c.piece && c.piece === c.piece.toUpperCase() ? "is-white" : "is-black"}`}>
          {c.piece ? GLYPH[c.piece] : ""}
        </span>
      ))}
    </div>
  );
};

export const ChessAcademy: React.FC<ChessAcademyProps> = ({ onPracticePosition, initialPillar = "all" }) => {
  const [focusPillar, setFocusPillar] = useState<string>(initialPillar);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("all");
  const columnRefs = useRef<Partial<Record<Pillar, HTMLElement | null>>>({});

  useEffect(() => {
    setFocusPillar(initialPillar || "all");
  }, [initialPillar]);

  // Bring the focused pillar into view (matters when the grid stacks on narrow screens)
  useEffect(() => {
    if (focusPillar === "all") return;
    columnRefs.current[focusPillar as Pillar]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [focusPillar]);

  return (
    <div className="view academy">
      <div className="page-head">
        <div>
          <h1 className="page-title">Chess Academy</h1>
          <p className="page-sub">Eight hand-picked positions across the four stages of a game. Load any of them into the lab and play it out.</p>
        </div>
      </div>

      <div className="academy-filters">
        <div className="segmented" role="group" aria-label="Focus a pillar">
          <button
            className={`segmented__btn ${focusPillar === "all" ? "is-active" : ""}`}
            aria-pressed={focusPillar === "all"}
            onClick={() => {
              playSound("click");
              setFocusPillar("all");
            }}
          >
            All pillars
          </button>
          {PILLARS.map((p) => (
            <button
              key={p.id}
              className={`segmented__btn ${focusPillar === p.id ? "is-active" : ""}`}
              aria-pressed={focusPillar === p.id}
              onClick={() => {
                playSound("click");
                setFocusPillar(p.id);
              }}
            >
              <p.icon size={14} aria-hidden="true" /> {p.title}
            </button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              className={`segmented__btn ${difficulty === d ? "is-active" : ""}`}
              aria-pressed={difficulty === d}
              onClick={() => {
                playSound("click");
                setDifficulty(d);
              }}
            >
              {d === "all" ? "Any level" : d}
            </button>
          ))}
        </div>
      </div>

      <div className={`pillar-grid ${focusPillar !== "all" ? "has-focus" : ""}`}>
        {PILLARS.map((pillar, colIdx) => {
          const lessons = ACADEMY_LESSONS.filter(
            (l) => l.pillar === pillar.id && (difficulty === "all" || l.difficulty === difficulty),
          );
          const total = ACADEMY_LESSONS.filter((l) => l.pillar === pillar.id).length;
          const Icon = pillar.icon;
          return (
            <section
              key={pillar.id}
              ref={(el) => {
                columnRefs.current[pillar.id] = el;
              }}
              className={`pillar pillar--${pillar.tone} ${focusPillar === pillar.id ? "is-focused" : ""}`}
              style={{ "--i": colIdx } as React.CSSProperties}
              aria-label={pillar.title}
            >
              <header className="pillar__head">
                <span className="pillar__icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="pillar__titles">
                  <h2 className="pillar__title">{pillar.title}</h2>
                  <p className="pillar__blurb">{pillar.blurb}</p>
                </div>
                <span className="pillar__count num">{lessons.length}/{total}</span>
              </header>

              {lessons.length === 0 ? (
                <p className="pillar__empty">No {difficulty.toLowerCase()} lessons here yet.</p>
              ) : (
                lessons.map((lesson) => (
                  <article key={lesson.id} className="lesson card card--interactive">
                    <MiniBoard fen={lesson.fen} />
                    <div className="lesson__head">
                      <h3 className="lesson__title">{lesson.title}</h3>
                      <span className={`pill lesson__level lesson__level--${lesson.difficulty.toLowerCase()}`}>
                        {lesson.difficulty}
                      </span>
                    </div>
                    <p className="lesson__objective">{lesson.objective}</p>
                    <details className="lesson__points">
                      <summary>Key ideas ({lesson.keyPoints.length})</summary>
                      <ul>
                        {lesson.keyPoints.map((point) => (
                          <li key={point}>
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                    <button
                      className="btn btn--primary lesson__load"
                      onClick={() => {
                        playSound("click");
                        onPracticePosition(lesson.fen, lesson.title);
                      }}
                    >
                      <Play size={14} /> Load in Lab
                    </button>
                  </article>
                ))
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
