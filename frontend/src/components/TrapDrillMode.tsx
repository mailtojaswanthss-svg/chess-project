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
    id: "elephant-trap",
    title: "Elephant Trap (Queen's Gambit)",
    difficulty: "Intermediate",
    theme: "Discovery & Unprotected Knight",
    side_to_move: "White",
    fen: "r1bqkb1r/pppn1ppp/5n2/3p2B1/3P4/2N5/PP2PPPP/R2QKBNR w KQkq - 0 6",
    tempted_move_san: "Nxd5",
    tempted_move_uci: "c3d5",
    is_trap: true,
    prompt: "In the QGD (1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5), Black's knight on d7 seems pinned. Can White win a pawn with 6.Nxd5?",
    trap_explanation: "POISONED TRAP! Black plays 6...Nxd5! sacrificing the Queen. After 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8, Black emerges a full minor piece ahead!",
    punishment_line: ["Nxd5", "Bxd8", "Bb4+", "Qd2", "Bxd2+", "Kxd2", "Kxd8"],
  },
  {
    id: "siberian-trap",
    title: "Siberian Trap (Morra Gambit)",
    difficulty: "Intermediate",
    theme: "Smothered Mate & Queen Deflection",
    side_to_move: "White",
    fen: "r1b1kb1r/ppqp1ppp/2n1p3/8/2B1P1n1/2N2N2/PP2QPPP/R1B2RK1 w kq - 6 9",
    tempted_move_san: "h3",
    tempted_move_uci: "h2h3",
    is_trap: true,
    prompt: "In the Smith-Morra Gambit, Black plays 8...Ng4. Can White kick the annoying knight with 9.h3?",
    trap_explanation: "POISONED TRAP! Black strikes with 9...Nd4! attacking the Queen and deflecting the f3 defender, forcing 10.Nxd4 Qh2# checkmate!",
    punishment_line: ["Nd4", "Nxd4", "Qh2#"],
  },
  {
    id: "lasker-trap",
    title: "Lasker Trap (Albin Countergambit)",
    difficulty: "Master",
    theme: "Underpromotion to Knight",
    side_to_move: "White",
    fen: "rnbqk1nr/ppp2ppp/8/4P3/1bP5/4p3/PP1B1PPP/RN1QKBNR w KQkq - 0 6",
    tempted_move_san: "Bxb4",
    tempted_move_uci: "d2b4",
    is_trap: true,
    prompt: "In the Albin Countergambit, Black plays 5...Bb4+. Should White greedily take the bishop with 6.Bxb4?",
    trap_explanation: "POISONED TRAP! Black replies 6...exf2+! 7.Ke2 fxg1=N+! (underpromoting with check so White cannot trade queens), followed by 8.Ke1 Qh4+ with a winning attack!",
    punishment_line: ["exf2+", "Ke2", "fxg1=N+", "Ke1", "Qh4+"],
  },
  {
    id: "mortimer-trap",
    title: "Mortimer Trap (Ruy Lopez)",
    difficulty: "Intermediate",
    theme: "Discovered Double Attack",
    side_to_move: "White",
    fen: "r1bqkb1r/ppppnppp/5n2/1B2p3/4P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
    tempted_move_san: "Nxe5",
    tempted_move_uci: "f3e5",
    is_trap: true,
    prompt: "In the Berlin Defense, Black plays 4...Ne7!? baiting the e5 pawn. Can White safely play 5.Nxe5?",
    trap_explanation: "POISONED TRAP! Black plays 5...c6! 6.Bc4 Qa5+! (double attack forking the king and the e5 knight) winning the piece!",
    punishment_line: ["c6", "Bc4", "Qa5+", "Nc3", "Qxe5"],
  },
  {
    id: "fishing-pole",
    title: "The Fishing Pole Trap",
    difficulty: "Intermediate",
    theme: "H-File Clearance",
    side_to_move: "White",
    fen: "r1bqk2r/pppp1pp1/2n5/1Bb1p2p/4P1n1/3P1N1P/PPP2PP1/RNBQ1RK1 w kq - 0 7",
    tempted_move_san: "hxg4",
    tempted_move_uci: "h3g4",
    is_trap: true,
    prompt: "Black plays 6...h5 baiting the knight. Can White safely capture with 7.hxg4?",
    trap_explanation: "POISONED TRAP! After 7...hxg4 8.Ng5 g3! 9.Be3 Bxe3 10.fxe3 Qxg5, Black rips open the h-file for decisive invasion!",
    punishment_line: ["hxg4", "Ng5", "g3", "Be3", "Bxe3", "fxe3", "Qxg5"],
  },
  {
    id: "halosar-trap",
    title: "Halosar Trap (Blackmar-Diemer)",
    difficulty: "Intermediate",
    theme: "Deflection & Smothered Strike",
    side_to_move: "Black",
    fen: "rn2kb1r/ppp1pppp/5n2/1N6/1q4b1/4BQ2/PPP3PP/2KR1BNR b kq - 5 8",
    tempted_move_san: "Bxf3",
    tempted_move_uci: "g4f3",
    is_trap: true,
    prompt: "White just played 8.Nb5, threatening Nxc7# checkmate! The White Queen on f3 is hanging. Can Black greedily capture 8...Bxf3?",
    trap_explanation: "POISONED TRAP! Capturing the free Queen with 8...Bxf3 allows immediate 9.Nxc7# checkmate! Black must defend c7 (e.g. 8...Na6).",
    punishment_line: ["Nxc7#"],
  },
  {
    id: "back-rank-deflection",
    title: "Corridor Back-Rank Deflection",
    difficulty: "Beginner",
    theme: "Back-Rank Mate",
    side_to_move: "White",
    fen: "3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
    tempted_move_san: "Qe7",
    tempted_move_uci: "e2e7",
    is_trap: true,
    prompt: "White plays Qe7 attacking the rook and threatening mate. But wait—is this a Poisoned Trap or Sound & Safe?",
    trap_explanation: "POISONED TRAP! White's own back rank is unprotected! Black replies 1...Rd1+! followed by 2.Qe1 Rxe1# checkmate!",
    punishment_line: ["Rd1+", "Qe1", "Rxe1#"],
  },
  {
    id: "poisoned-b2-pawn",
    title: "Poisoned b2 Pawn (Sicilian Najdorf)",
    difficulty: "Master",
    theme: "Queen Trapping",
    side_to_move: "Black",
    fen: "rnb1kb1r/1p3ppp/pq1ppn2/6B1/3NPP2/2N5/PPPQ2PP/R3KB1R b KQkq - 2 8",
    tempted_move_san: "Qxb2",
    tempted_move_uci: "b6b2",
    is_trap: true,
    prompt: "The b2 pawn appears completely hanging. Should Black play 8...Qxb2 attacking the a1 rook?",
    trap_explanation: "POISONED TRAP! Taking on b2 is notoriously sharp: White plays 9.Rb1 Qa3 10.f5 Be7 11.fxe6 fxe6, developing overwhelming initiative against the displaced Queen!",
    punishment_line: ["Rb1", "Qa3", "f5", "Be7", "fxe6", "fxe6"],
  },
  {
    id: "noahs-ark-safe",
    title: "Noah's Ark Safe Prophylaxis",
    difficulty: "Intermediate",
    theme: "Prophylaxis",
    side_to_move: "White",
    fen: "r1bqkbnr/2p2ppp/p2p4/1p6/3pP3/1B6/PPP2PPP/RNBQK2R w KQkq - 0 8",
    tempted_move_san: "c3",
    tempted_move_uci: "c2c3",
    is_trap: false,
    prompt: "From the Noah's Ark setup, instead of grabbing on d4, White plays 8.c3! Is this a Poisoned Trap or Sound & Safe?",
    trap_explanation: "SOUND & SAFE! 8.c3! is the master move: it challenges Black's center while opening a crucial escape square for the bishop on c2, defusing any trap!",
    punishment_line: ["dxc3", "Nxc3", "Nf6", "O-O", "Be7"],
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
  {
    id: "cambridge-springs-safe",
    title: "Cambridge Springs Safe Unpin",
    difficulty: "Master",
    theme: "Unpinning & Prophylaxis",
    side_to_move: "White",
    fen: "r1b1kb1r/pp1n1ppp/2p1pn2/q2p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQkq - 2 7",
    tempted_move_san: "Nd2",
    tempted_move_uci: "f3d2",
    is_trap: false,
    prompt: "Black plays 6...Qa5 in the Cambridge Springs pinning the knight. White plays 7.Nd2! Is this a Poisoned Trap or Sound & Safe?",
    trap_explanation: "SOUND & SAFE! 7.Nd2! is master-level prophylaxis, unpinning the c3 knight, safeguarding against ...Ne4, and preparing to kick the Black Queen with a3/Qc2.",
    punishment_line: ["Bb4", "Qc2", "O-O", "a3"],
  },
  {
    id: "sicilian-development-safe",
    title: "Open Sicilian Active Development",
    difficulty: "Beginner",
    theme: "Rapid Piece Development",
    side_to_move: "Black",
    fen: "rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4",
    tempted_move_san: "Nf6",
    tempted_move_uci: "g8f6",
    is_trap: false,
    prompt: "In the Open Sicilian after 4.Nxd4, Black plays 4...Nf6 developing and attacking e4. Is this a Poisoned Trap or Sound & Safe?",
    trap_explanation: "SOUND & SAFE! 4...Nf6 is universal theory, developing the knight to its natural outpost with tempo while maintaining flexible pawn structure.",
    punishment_line: ["Nc3", "a6", "Be3", "e5", "Nb3", "Be6"],
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

            <div className="drill-chessboard-wrap" ref={boardWrapRef}>
              <Chessboard
                position={currentBoard.fen()}
                boardOrientation={activeTrap?.side_to_move === "Black" ? "black" : "white"}
                arePiecesDraggable={false}
                customArrows={customArrows}
                customSquareStyles={customSquareStyles}
                boardWidth={boardWidth}
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
            <span className="filter-bar-label">Hardness Category:</span>
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
