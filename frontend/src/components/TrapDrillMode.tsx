import "./TrapDrillMode.css";
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
  ChevronLeft,
  ChevronRight,
  SkipBack,
  Info,
} from "lucide-react";
import type { TrapDrill } from "../types/chess";
import { playSound } from "../utils/audio";
import { FALLBACK_TRAPS } from "../data/traps";
import { MetricInfo } from "./MetricInfo";

interface TrapDrillModeProps {
  apiUrl?: string;
  onViewAnalysis?: (fen: string) => void;
}


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

  // Size the board to its column instead of a fixed width, so it never overflows
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(440);
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 160) setBoardWidth(Math.floor(el.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    if (filterDifficulty === "beginner") return t.difficulty.toLowerCase() === "beginner";
    if (filterDifficulty === "intermediate") return t.difficulty.toLowerCase() === "intermediate";
    if (filterDifficulty === "master") {
      const d = t.difficulty.toLowerCase();
      return d === "advanced" || d === "master";
    }
    return true;
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

  // STEP-BY-STEP & ANIMATED REFUTATION PLAYBACK
  const goToStep = (targetStep: number) => {
    if (!activeTrap) return;
    clearPendingTimeouts();
    playSound("click");
    try {
      const board = new Chess(activeTrap.fen);
      if (targetStep <= -1) {
        setCurrentBoard(board);
        setRefutationStep(-1);
        setCurrentMoveLabel(null);
        return;
      }

      // Step 0: Candidate move
      const uci = activeTrap.tempted_move_uci;
      if (uci.length >= 4) {
        const from = uci.substring(0, 2) as Square;
        const to = uci.substring(2, 4) as Square;
        const promotion = (uci.length > 4 ? uci[4] : "q") as "q" | "r" | "b" | "n";
        board.move({ from, to, promotion });
      }

      if (targetStep === 0) {
        setCurrentBoard(board);
        setRefutationStep(0);
        setCurrentMoveLabel(`${activeTrap.tempted_move_san} (Tempted Candidate Move)`);
        return;
      }

      const refMoves = activeTrap.punishment_line;
      const boundedStep = Math.min(targetStep, refMoves.length);
      for (let i = 0; i < boundedStep; i++) {
        board.move(refMoves[i]);
      }

      setCurrentBoard(board);
      setRefutationStep(boundedStep);
      const movePlayed = refMoves[boundedStep - 1] || "";
      setCurrentMoveLabel(`${movePlayed} (Step ${boundedStep} of ${refMoves.length})`);
    } catch {
      // fallback
    }
  };

  const handleStepBack = () => {
    if (refutationStep > -1) {
      goToStep(refutationStep - 1);
    }
  };

  const handleStepForward = () => {
    if (!activeTrap) return;
    const maxSteps = activeTrap.punishment_line.length;
    if (refutationStep < maxSteps) {
      goToStep(refutationStep + 1);
    }
  };

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
      const promotion = (uci.length > 4 ? uci[4] : "q") as "q" | "r" | "b" | "n";
      candidateRes = board.move({ from, to, promotion });
    }

    setCurrentBoard(new Chess(board.fen()));
    setRefutationStep(0);
    setCurrentMoveLabel(`${activeTrap.tempted_move_san} (Candidate Move)`);
    if (candidateRes?.captured) playSound("capture");
    else playSound("move");

    // 2. Sequentially schedule punishment line moves
    const refMoves = activeTrap.punishment_line;
    if (refMoves.length === 0) {
      setIsPlayingRefutation(false);
      return;
    }

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
    goToStep(-1);
  };

  // Custom Arrows & Highlights on Board
  const customArrows: [Square, Square, string?][] = [];
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (activeTrap && activeTrap.tempted_move_uci.length >= 4 && refutationStep <= 0) {
    const from = activeTrap.tempted_move_uci.substring(0, 2) as Square;
    const to = activeTrap.tempted_move_uci.substring(2, 4) as Square;

    customArrows.push([from, to, "rgb(229, 103, 90)"]);
    customSquareStyles[from] = {
      backgroundColor: "rgba(229, 103, 90, 0.35)",
      borderRadius: "4px",
    };
    customSquareStyles[to] = {
      backgroundColor: "rgba(232, 180, 76, 0.4)",
      borderRadius: "4px",
      boxShadow: "0 0 10px rgba(232, 180, 76, 0.8)",
    };
  }

  const accuracyPct = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : null;

  return (
    <div className="trap-drill-container">
      {/* 1. Header with Stats Bar */}
      <div className="drill-header">
        <div className="drill-title-wrap">
          <div className="drill-badge">
            <Target size={15} className="text-danger" />
            <span>Trap or safe?</span>
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
              <span className="stat-number">{accuracyPct === null ? "—" : `${accuracyPct}%`}</span>
              <span className="stat-name">
                Accuracy ({correctCount}/{totalAttempts}) <MetricInfo metric="spotterAccuracy" />
              </span>
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

            <div className="drill-chessboard-wrap" ref={boardWrapRef}>
              <Chessboard
                position={currentBoard.fen()}
                boardOrientation={activeTrap?.side_to_move === "Black" ? "black" : "white"}
                arePiecesDraggable={false}
                customArrows={customArrows}
                customSquareStyles={customSquareStyles}
                boardWidth={boardWidth}
                customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
                customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
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
              <div className="board-playback-container">
                <div className="board-playback-bar">
                  <button
                    className="playback-btn step-btn"
                    onClick={handleStepBack}
                    disabled={isPlayingRefutation || refutationStep <= -1}
                    title="Step backward one move"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    className="playback-btn play-main-btn"
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
                        <Play size={14} /> Animate All
                      </>
                    )}
                  </button>
                  <button
                    className="playback-btn step-btn"
                    onClick={handleStepForward}
                    disabled={
                      isPlayingRefutation ||
                      (activeTrap && refutationStep >= activeTrap.punishment_line.length)
                    }
                    title="Step forward one move"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                  <button
                    className="playback-btn reset"
                    onClick={handleResetBoard}
                    disabled={isPlayingRefutation}
                    title="Reset board to the initial candidate position"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                </div>

                {/* Step Refutation Mechanics Annotation */}
                <div className="step-mechanics-annotation">
                  <Info size={13} className="text-cyan" />
                  <span>
                    {refutationStep === -1 && (
                      <>Initial Position: Examine <strong>{activeTrap?.tempted_move_san}</strong> before execution.</>
                    )}
                    {refutationStep === 0 && (
                      <>Candidate Move: <strong>{activeTrap?.tempted_move_san}</strong> played. Critical flaw exposed!</>
                    )}
                    {refutationStep > 0 && activeTrap && (
                      <>
                        Refutation Step {refutationStep}/{activeTrap.punishment_line.length}:{" "}
                        <strong>{activeTrap.punishment_line[refutationStep - 1]}</strong> executed. Refutation mechanics in motion.
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: The Trap Dossier & Interactive Decision */}
        <div className="drill-control-col">
          <div className="trap-question-card">
            <div className="trap-opening-title">
              <span className="trap-id-label">Position {currentIndex + 1}</span>
              <h3>{activeTrap?.title}</h3>
            </div>

            {/* Candidate Move Highlight */}
            <div className="tempted-move-box">
              <span className="tempt-label">The move in question</span>
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
                    <strong>It’s a trap</strong>
                    <span>Playing this move is a fatal blunder</span>
                  </div>
                </button>

                <button
                  className="decision-btn safe-btn"
                  onClick={() => handleDecision(false)}
                >
                  <div className="btn-icon">🛡️</div>
                  <div className="btn-texts">
                    <strong>Safe to play</strong>
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
                      <button
                        type="button"
                        className={`move-chip candidate ${refutationStep === 0 ? "active-step" : ""}`}
                        onClick={() => goToStep(0)}
                        title="Click to jump to candidate move"
                      >
                        0. {activeTrap?.tempted_move_san}
                      </button>
                      {activeTrap?.punishment_line.map((m, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className={`move-chip ${refutationStep === idx + 1 ? "active-step" : ""}`}
                          onClick={() => goToStep(idx + 1)}
                          title={`Click to jump to punishment step ${idx + 1}: ${m}`}
                        >
                          {idx + 1}. {m}
                        </button>
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

          {/* Hardness Category Filter Pills */}
          <div className="difficulty-filter-bar">
            <span className="filter-bar-label">Difficulty</span>
            <div className="filter-pills-row">
              <button
                className={`filter-pill ${filterDifficulty === "all" ? "active" : ""}`}
                onClick={() => {
                  clearPendingTimeouts();
                  playSound("click");
                  setFilterDifficulty("all");
                  setCurrentIndex(0);
                }}
              >
                All Traps ({traps.length || 15})
              </button>
              <button
                className={`filter-pill ${filterDifficulty === "beginner" ? "active" : ""}`}
                onClick={() => {
                  clearPendingTimeouts();
                  playSound("click");
                  setFilterDifficulty("beginner");
                  setCurrentIndex(0);
                }}
              >
                🟢 Beginner — Club Traps
              </button>
              <button
                className={`filter-pill ${filterDifficulty === "intermediate" ? "active" : ""}`}
                onClick={() => {
                  clearPendingTimeouts();
                  playSound("click");
                  setFilterDifficulty("intermediate");
                  setCurrentIndex(0);
                }}
              >
                🟡 Intermediate — Tactical Punishments
              </button>
              <button
                className={`filter-pill ${filterDifficulty === "master" ? "active" : ""}`}
                onClick={() => {
                  clearPendingTimeouts();
                  playSound("click");
                  setFilterDifficulty("master");
                  setCurrentIndex(0);
                }}
              >
                🔴 Master — Positional &amp; Deep Venom
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
