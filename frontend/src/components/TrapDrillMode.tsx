import React, { useState, useEffect, useRef } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Flame,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  Zap,
  Target,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import type { TrapDrill } from "../types/chess";
import { playSound } from "../utils/audio";

interface TrapDrillModeProps {
  apiUrl?: string;
  onViewAnalysis?: (fen: string) => void;
}

const FALLBACK_TRAPS: TrapDrill[] = [
  {
    id: "legals-mate",
    title: "Legal's Mate Trap",
    difficulty: "Beginner",
    theme: "Decoy & Queen Sacrifice",
    side_to_move: "Black",
    fen: "rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5",
    tempted_move_san: "Bxd1",
    tempted_move_uci: "g4d1",
    is_trap: true,
    prompt: "White just played 5.Nxe5, leaving the Queen on d1 completely hanging! Can Black greedily play 5...Bxd1?",
    trap_explanation: "POISONED TRAP! Capturing the free queen leads to forced mate: 6.Bxf7+ Ke7 7.Nd5# checkmate!",
    punishment_line: ["Bxf7+", "Ke7", "Nd5#"],
  },
  {
    id: "blackburne-shilling",
    title: "Blackburne Shilling Gambit",
    difficulty: "Beginner",
    theme: "Overloaded Defender & Fork",
    side_to_move: "White",
    fen: "r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    tempted_move_san: "Nxe5",
    tempted_move_uci: "f3e5",
    is_trap: true,
    prompt: "Black plays 3...Nd4 leaving the e5 pawn apparently free for the taking. Can White play 4.Nxe5?",
    trap_explanation: "POISONED TRAP! Black retaliates with 4...Qg5! attacking both the knight and the g2 pawn, leading to the smothering 7...Nf3# or winning the rook on h1!",
    punishment_line: ["Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"],
  },
  {
    id: "noahs-ark",
    title: "Noah's Ark Trap (Ruy Lopez)",
    difficulty: "Intermediate",
    theme: "Bishop Trap",
    side_to_move: "White",
    fen: "r1bqkbnr/2p2ppp/p2p4/1p6/3pP3/1B6/PPP2PPP/RNBQK2R w KQkq - 0 8",
    tempted_move_san: "Qxd4",
    tempted_move_uci: "d1d4",
    is_trap: true,
    prompt: "In the Ruy Lopez, Black just played 7...exd4. Can White recapture the pawn with 8.Qxd4?",
    trap_explanation: "POISONED TRAP! Black plays 8...c5! followed by 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4!, completely trapping and capturing White's light-squared bishop on b3!",
    punishment_line: ["c5", "Qd5", "Be6", "Qc6+", "Bd7", "Qd5", "c4"],
  },
  {
    id: "italian-center-strike",
    title: "Italian Game Central Strike",
    difficulty: "Beginner",
    theme: "Center Control",
    side_to_move: "White",
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5",
    tempted_move_san: "d4",
    tempted_move_uci: "d2d4",
    is_trap: false,
    prompt: "In the Italian Game (Giuoco Piano), White plays 5.d4 striking the center. Is this a Poisoned Trap or Sound & Safe?",
    trap_explanation: "SOUND & SAFE! 5.d4 is the classical mainline thrust, establishing broad central dominance and opening lines for the pieces.",
    punishment_line: ["exd4", "cxd4", "Bb4+", "Bd2", "Bxd2+", "Nbxd2"],
  },
];

export const TrapDrillMode: React.FC<TrapDrillModeProps> = ({
  apiUrl = "http://127.0.0.1:8000",
}) => {
  const [traps, setTraps] = useState<TrapDrill[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Drill State
  const [userGuess, setUserGuess] = useState<boolean | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Animated Refutation Playback State
  const [isPlayingRefutation, setIsPlayingRefutation] = useState<boolean>(false);
  const [refutationStep, setRefutationStep] = useState<number>(-1);
  const [currentMoveLabel, setCurrentMoveLabel] = useState<string | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Game/Score State
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem("chesswise.trap_best_streak") || "0", 10);
  });
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  // Board position state (to allow refutation preview)
  const [currentBoard, setCurrentBoard] = useState<Chess>(() => new Chess());

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    setIsPlayingRefutation(false);
    setRefutationStep(-1);
    setCurrentMoveLabel(null);
  };

  useEffect(() => {
    return () => {
      clearPendingTimeouts();
    };
  }, []);

  const fetchTraps = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/trap-puzzles`);
      if (resp.ok) {
        const data = (await resp.json()) as TrapDrill[];
        if (data && data.length > 0) {
          setTraps(data);
          return;
        }
      }
      setTraps(FALLBACK_TRAPS);
    } catch {
      setTraps(FALLBACK_TRAPS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTraps();
  }, [apiUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTraps = traps.filter((t) => {
    if (filterDifficulty === "all") return true;
    return t.difficulty.toLowerCase() === filterDifficulty.toLowerCase();
  });

  const activeTrap: TrapDrill | undefined = filteredTraps[currentIndex] || traps[0];

  useEffect(() => {
    clearPendingTimeouts();
    if (activeTrap) {
      try {
        setCurrentBoard(new Chess(activeTrap.fen));
      } catch {
        setCurrentBoard(new Chess());
      }
      setHasAnswered(false);
      setUserGuess(null);
      setIsCorrect(null);
    }
  }, [activeTrap]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecision = (guessTrap: boolean) => {
    if (!activeTrap || hasAnswered) return;

    const correct = guessTrap === activeTrap.is_trap;
    setUserGuess(guessTrap);
    setHasAnswered(true);
    setIsCorrect(correct);
    setTotalAttempts((prev) => prev + 1);

    if (correct) {
      playSound("trap_correct");
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrectCount((prev) => prev + 1);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        localStorage.setItem("chesswise.trap_best_streak", nextStreak.toString());
      }
    } else {
      playSound("trap_failed");
      setStreak(0);
    }
  };

  const handleNextTrap = () => {
    clearPendingTimeouts();
    playSound("click");
    if (currentIndex + 1 < filteredTraps.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  // DYNAMIC ANIMATED REFUTATION PLAYBACK
  const handlePlayRefutation = () => {
    if (!activeTrap || isPlayingRefutation) return;
    clearPendingTimeouts();
    playSound("click");

    const board = new Chess(activeTrap.fen);
    setIsPlayingRefutation(true);

    // 1. Play candidate move first (Step 0)
    const uci = activeTrap.tempted_move_uci;
    let candidateRes = null;
    if (uci.length >= 4) {
      const from = uci.substring(0, 2) as Square;
      const to = uci.substring(2, 4) as Square;
      candidateRes = board.move({ from, to, promotion: "q" });
    }

    setCurrentBoard(new Chess(board.fen()));
    setRefutationStep(0);
    setCurrentMoveLabel(`${activeTrap.tempted_move_san} (Candidate Move)`);
    if (candidateRes?.captured) playSound("capture");
    else playSound("move");

    // 2. Sequentially schedule punishment line moves
    const refMoves = activeTrap.punishment_line;
    refMoves.forEach((mStr, idx) => {
      const timer = setTimeout(() => {
        try {
          const moveRes = board.move(mStr);
          setCurrentBoard(new Chess(board.fen()));
          setRefutationStep(idx + 1);
          setCurrentMoveLabel(`${mStr} (Step ${idx + 1} of ${refMoves.length})`);

          if (moveRes?.captured) playSound("capture");
          else if (board.isCheck()) playSound("check");
          else playSound("move");
        } catch {
          // ignore move errors
        }

        // If this is the final move, finish animation
        if (idx === refMoves.length - 1) {
          const finishTimer = setTimeout(() => {
            setIsPlayingRefutation(false);
          }, 800);
          timeoutsRef.current.push(finishTimer);
        }
      }, (idx + 1) * 700);

      timeoutsRef.current.push(timer);
    });
  };

  const handleResetBoard = () => {
    clearPendingTimeouts();
    playSound("click");
    if (activeTrap) {
      try {
        setCurrentBoard(new Chess(activeTrap.fen));
      } catch {
        // ignore
      }
    }
  };

  // Custom Arrows & Highlights on Board
  const customArrows: [Square, Square, string?][] = [];
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (activeTrap && activeTrap.tempted_move_uci.length >= 4 && refutationStep <= 0) {
    const from = activeTrap.tempted_move_uci.substring(0, 2) as Square;
    const to = activeTrap.tempted_move_uci.substring(2, 4) as Square;

    customArrows.push([from, to, "rgb(239, 68, 68)"]);
    customSquareStyles[from] = {
      backgroundColor: "rgba(239, 68, 68, 0.35)",
      borderRadius: "4px",
    };
    customSquareStyles[to] = {
      backgroundColor: "rgba(234, 179, 8, 0.4)",
      borderRadius: "4px",
      boxShadow: "0 0 10px rgba(234, 179, 8, 0.8)",
    };
  }

  const accuracyPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 100;

  return (
    <div className="trap-drill-container">
      {/* 1. Header with Stats Bar */}
      <div className="drill-header">
        <div className="drill-title-wrap">
          <div className="drill-badge">
            <Target size={15} className="text-danger" />
            <span>TACTICAL DANGER DRILL</span>
          </div>
          <h2>Spot the Trap: Poisoned Blunder or Safe Strike?</h2>
          <p>
            Train your intuition to detect cunning tactical traps, poisoned pieces, and deceptive sacrifices before
            committing moves.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="drill-stats-strip">
          <div className={`drill-stat-box ${streak >= 3 ? "on-fire" : ""}`}>
            <div className="stat-icon-wrap">
              <Flame size={18} className={streak >= 3 ? "text-fire pulse" : "text-amber"} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{streak}</span>
              <span className="stat-name">Streak</span>
            </div>
          </div>

          <div className="drill-stat-box">
            <div className="stat-icon-wrap">
              <Trophy size={18} className="text-gold" />
            </div>
            <div className="stat-content">
              <span className="stat-number">{bestStreak}</span>
              <span className="stat-name">Best Streak</span>
            </div>
          </div>

          <div className="drill-stat-box">
            <div className="stat-icon-wrap">
              <Zap size={18} className="text-cyan" />
            </div>
            <div className="stat-content">
              <span className="stat-number">{accuracyPct}%</span>
              <span className="stat-name">Accuracy ({correctCount}/{totalAttempts})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Drill Stage */}
      <div className="drill-stage-grid">
        {/* Left: The Board */}
        <div className="drill-board-col">
          <div className="drill-board-frame">
            <div className="board-top-turn-strip">
              <span className="side-indicator">
                {activeTrap?.side_to_move === "White" ? "♔ White" : "♚ Black"} evaluating move
              </span>
              <span className="difficulty-tag">{activeTrap?.difficulty} · {activeTrap?.theme}</span>
            </div>

            <div className="drill-chessboard-wrap">
              <Chessboard
                position={currentBoard.fen()}
                boardOrientation={activeTrap?.side_to_move === "Black" ? "black" : "white"}
                arePiecesDraggable={false}
                customArrows={customArrows}
                customSquareStyles={customSquareStyles}
                boardWidth={460}
              />
            </div>

            {/* Playback status pill */}
            {isPlayingRefutation && currentMoveLabel && (
              <div className="playback-live-pill">
                <span className="pulse-dot green" />
                <span>Animated Playback: <strong>{currentMoveLabel}</strong></span>
              </div>
            )}

            {hasAnswered && (
              <div className="board-playback-bar">
                <button
                  className="playback-btn"
                  onClick={handlePlayRefutation}
                  disabled={isPlayingRefutation}
                  title="Animate the full refutation continuation step by step on the board"
                >
                  {isPlayingRefutation ? (
                    <>
                      <Loader2 size={14} className="spin" /> Playing Move {refutationStep}...
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Animate Refutation Sequence
                    </>
                  )}
                </button>
                <button
                  className="playback-btn reset"
                  onClick={handleResetBoard}
                  title="Reset board to the initial candidate position"
                >
                  <RotateCcw size={14} /> Reset Position
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: The Trap Dossier & Interactive Decision */}
        <div className="drill-control-col">
          <div className="trap-question-card">
            <div className="trap-opening-title">
              <span className="trap-id-label">SCENARIO #{currentIndex + 1}</span>
              <h3>{activeTrap?.title}</h3>
            </div>

            {/* Candidate Move Highlight */}
            <div className="tempted-move-box">
              <span className="tempt-label">CANDIDATE MOVE UNDER INSPECTION:</span>
              <div className="tempt-san-row">
                <span className="tempt-san">{activeTrap?.tempted_move_san}</span>
                <span className="tempt-uci">({activeTrap?.tempted_move_uci})</span>
              </div>
              <p className="tempt-prompt">{activeTrap?.prompt}</p>
            </div>

            {/* Decision Buttons (Before Guess) */}
            {!hasAnswered ? (
              <div className="decision-actions-grid">
                <button
                  className="decision-btn trap-btn"
                  onClick={() => handleDecision(true)}
                >
                  <div className="btn-icon">⚠️</div>
                  <div className="btn-texts">
                    <strong>POISONED TRAP!</strong>
                    <span>Playing this move is a fatal blunder</span>
                  </div>
                </button>

                <button
                  className="decision-btn safe-btn"
                  onClick={() => handleDecision(false)}
                >
                  <div className="btn-icon">🛡️</div>
                  <div className="btn-texts">
                    <strong>SOUND & SAFE!</strong>
                    <span>Tactically justified, safe to play</span>
                  </div>
                </button>
              </div>
            ) : (
              /* Pedagogical Feedback Card (After Guess) */
              <div className={`drill-result-card ${isCorrect ? "correct" : "wrong"}`}>
                <div className={`result-icon-tag ${isCorrect ? "correct" : "wrong"}`}>
                  {isCorrect ? (
                    <>
                      <CheckCircle2 size={24} />
                      <div>
                        <strong>EXCELLENT READ!</strong>
                        <span>You correctly identified this as {activeTrap?.is_trap ? "a Poisoned Trap" : "Sound & Safe"}.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle size={24} />
                      <div>
                        <strong>TACTICAL TRAP TRIGGERED!</strong>
                        <span>Your assessment missed the underlying tactical dynamic.</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="explanation-body">
                  <div className="explanation-header">
                    <Target size={14} />
                    <span>TACTICAL DIAGNOSIS:</span>
                  </div>
                  <p className="explanation-text">{activeTrap?.trap_explanation}</p>

                  <div className="punishment-sequence">
                    <span className="seq-label">Refutation / Sound Continuation:</span>
                    <div className="moves-chip-list">
                      <span className="move-chip candidate">
                        0. {activeTrap?.tempted_move_san}
                      </span>
                      {activeTrap?.punishment_line.map((m, idx) => (
                        <span key={idx} className={`move-chip ${refutationStep === idx + 1 ? "active-step" : ""}`}>
                          {idx + 1}. {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button className="next-trap-btn" onClick={handleNextTrap}>
                  <span>Next Drill Scenario</span>
                  <Zap size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Difficulty Filter Bar */}
          <div className="difficulty-filter-bar">
            <span>Filter Category:</span>
            {["all", "beginner", "intermediate", "advanced"].map((lvl) => (
              <button
                key={lvl}
                className={`filter-pill ${filterDifficulty === lvl ? "active" : ""}`}
                onClick={() => {
                  playSound("click");
                  setFilterDifficulty(lvl);
                  setCurrentIndex(0);
                }}
              >
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
