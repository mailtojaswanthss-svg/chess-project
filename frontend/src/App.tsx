import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Chess, type Move, type Square } from "chess.js";
import type { Piece } from "react-chessboard/dist/chessboard/types";
import { AlertCircle, Check } from "lucide-react";

import type {
  Analysis,
  AppTab,
  BotMove,
  GameReport,
  ModelHealth,
  MovePair,
  PlayMode,
  ThreatItem,
  SavedGame,
  TacticalAnalysis,
  CoachExplanation,
} from "./types/chess";
import { Header } from "./components/Header";
import { MoveHistory } from "./components/MoveHistory";
import { GameOverModal } from "./components/GameOverModal";
import { SettingsModal } from "./components/SettingsModal";
import { TrapDrillMode } from "./components/TrapDrillMode";
import { BlunderDnaProfiler } from "./components/BlunderDnaProfiler";
import { BoardHud } from "./components/BoardHud";
import { CandidateMovesCard } from "./components/CandidateMovesCard";
import { ChessAcademy } from "./components/ChessAcademy";
import { SettingsTab } from "./components/SettingsTab";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ArenaView } from "./components/arena/ArenaView";
import { ArenaBoard } from "./components/arena/ArenaBoard";
import { PlayToolbar, MAIA_RATINGS } from "./components/arena/PlayToolbar";
import { PlayerStrip } from "./components/arena/PlayerStrip";
import { OverlayControls, type OverlayState } from "./components/arena/OverlayControls";
import { InfluencePanel } from "./components/arena/InfluencePanel";
import { BoardControls } from "./components/arena/BoardControls";
import { OutlookCard } from "./components/arena/OutlookCard";
import { CoachCard } from "./components/arena/CoachCard";
import { ThreatRadarCard } from "./components/arena/ThreatRadarCard";
import { ReviewWorkspace } from "./components/review/ReviewWorkspace";
import { HomeView } from "./components/home/HomeView";
import { PuzzleCard, type PuzzleStatus } from "./components/arena/PuzzleCard";
import { useTrapPuzzles, puzzleStartPosition, puzzleSolveLength, puzzleSolverColor } from "./utils/useTrapPuzzles";
import { useAppearance } from "./utils/useAppearance";
import { useScrollReveal } from "./utils/useScrollReveal";
import {
  gameOutcome,
  getKingSquare,
  detectOpening,
  getCapturedPieces,
  computeLocalTerritory,
  classifyMove,
  getMoveBadgeInfo,
  riskFor,
} from "./utils/chessUtils";
import { playSound, setSoundEnabled } from "./utils/audio";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const SAVED_GAMES_KEY = "chesswise.completed-games";
// Set once the Home intro has been seen; later visits open straight on Play
const SEEN_HOME_KEY = "chesswise.seen-home";
const STARTING_FEN = new Chess().fen();
const NO_THREATS: ThreatItem[] = [];

export default function App() {
  const appearance = useAppearance();
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [fenHistory, setFenHistory] = useState<string[]>([STARTING_FEN]);
  const [rating, setRating] = useState<number>(1200);
  const [playMode, setPlayMode] = useState<PlayMode>("free_lab");
  const playModeRef = useRef<PlayMode>("free_lab");
  playModeRef.current = playMode;
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    try {
      return localStorage.getItem(SEEN_HOME_KEY) ? "arena" : "home";
    } catch {
      return "arena";
    }
  });
  const [isReviewingGame, setIsReviewingGame] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [boardSize, setBoardSize] = useState<"compact" | "standard" | "large">(() => {
    return (localStorage.getItem("chesswise.board-size") as "compact" | "standard" | "large") || "standard";
  });
  const [overlays, setOverlays] = useState<OverlayState>({ influence: false, threats: false, arrows: true });
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const showTerritoryHeatmap = overlays.influence;
  const territoryControl = useMemo(() => computeLocalTerritory(game), [game]);

  const handleToggleBoardSize = () => {
    const next = boardSize === "standard" ? "large" : boardSize === "large" ? "compact" : "standard";
    setBoardSize(next);
    localStorage.setItem("chesswise.board-size", next);
    showToast(`Board size: ${next.charAt(0).toUpperCase() + next.slice(1)}`);
  };

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Coach hint state
  const [hintArrow, setHintArrow] = useState<[Square, Square, string?][]>([]);
  const [isFetchingHint, setIsFetchingHint] = useState<boolean>(false);

  // Coaching & Engine telemetry
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tacticalAnalysis, setTacticalAnalysis] = useState<TacticalAnalysis | null>(null);
  const [hoveredCandidateMove, setHoveredCandidateMove] = useState<string | null>(null);
  const [hoveredThreatSquare, setHoveredThreatSquare] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [engineEvaluation, setEngineEvaluation] = useState<number | null>(null);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Grandmaster AI Coach (LLM / Agentic Guidance)
  const [coachAdvice, setCoachAdvice] = useState<CoachExplanation | null>(null);
  const [isFetchingCoachAdvice, setIsFetchingCoachAdvice] = useState<boolean>(false);
  const [academyPillar, setAcademyPillar] = useState<string>("all");

  // In-flight request guards to prevent asynchronous race condition overwrites
  const moveRequestIdRef = useRef<number>(0);
  const analysisRequestIdRef = useRef<number>(0);

  // Game completion state
  const [completedGameSummary, setCompletedGameSummary] = useState<SavedGame | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_GAMES_KEY) ?? "[]") as SavedGame[];
    } catch {
      return [];
    }
  });

  // Each mode keeps its own game; switching modes parks the current one here
  type ModeSession = {
    game: Chess;
    fenHistory: string[];
    completed: SavedGame | null;
    isFlipped: boolean;
    rating: number;
    evaluation: number | null;
  };
  const sessionsRef = useRef<Partial<Record<PlayMode, ModeSession>>>({});
  const resumeBotRef = useRef<boolean>(false);

  // Trap puzzles (arena mode)
  const puzzles = useTrapPuzzles(API_URL);
  const [puzzleIndex, setPuzzleIndex] = useState<number>(0);
  const [puzzleStep, setPuzzleStep] = useState<number>(0);
  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("solving");
  const [puzzleSolved, setPuzzleSolved] = useState<Set<string>>(() => new Set());
  const puzzleTimerRef = useRef<number[]>([]);
  const activePuzzle = puzzles.length ? puzzles[puzzleIndex % puzzles.length] : undefined;

  // Review & Model Health
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [selectedReviewPly, setSelectedReviewPly] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Dedicated Review Game Instance (preserves active live match state)
  const [reviewGame, setReviewGame] = useState<Chess>(() => new Chess());

  // Pixel-accurate board measurement for silky-smooth drag and drop
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(498);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;

    const updateDimensions = () => {
      // clientWidth excludes the frame border; subtract the frame's 3px padding on each side
      const width = el.clientWidth - 6;
      if (width > 160) {
        setBoardWidth(Math.floor(width));
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardSize, activeTab, isReviewingGame, gameReport]);

  // Derived Board Telemetry
  const history = useMemo(() => game.history({ verbose: true }), [game]);
  const sideToMove = game.turn();
  const isCheck = game.isCheck();
  const kingSquare = isCheck ? getKingSquare(game, sideToMove) : null;
  const lastMove = history[history.length - 1];
  const openingName = useMemo(() => {
    return detectOpening(history.map((m) => m.san));
  }, [history]);

  // Move Pairs for history display
  const movePairs = useMemo<MovePair[]>(() => {
    const pairs: MovePair[] = [];
    history.forEach((m, idx) => {
      const pairNum = Math.floor(idx / 2) + 1;
      if (idx % 2 === 0) {
        pairs.push({ number: pairNum, white: m });
      } else {
        const lastPair = pairs[pairs.length - 1];
        if (lastPair) lastPair.black = m;
      }
    });
    return pairs;
  }, [history]);

  // Captured pieces and player framing telemetry
  const capturedInfo = useMemo(() => getCapturedPieces(game), [game]);
  const opponentColor = isFlipped ? "w" : "b";
  const playerColor = isFlipped ? "b" : "w";
  const isOpponentTurn = sideToMove === opponentColor;
  const isPlayerTurn = sideToMove === playerColor;

  const opponentCaptured = isFlipped ? capturedInfo.capturedByWhite : capturedInfo.capturedByBlack;
  const playerCaptured = isFlipped ? capturedInfo.capturedByBlack : capturedInfo.capturedByWhite;

  const opponentScoreLead = opponentColor === "w" ? capturedInfo.materialDiff : -capturedInfo.materialDiff;
  const playerScoreLead = playerColor === "w" ? capturedInfo.materialDiff : -capturedInfo.materialDiff;

  const opponentName =
    playMode === "max_engine"
      ? `Stockfish 16 (${rating} Elo)`
      : playMode === "tricky_bot"
      ? `The Trapper (${rating})`
      : playMode === "human_sparring"
      ? `Maia-2 (${rating} Elo)`
      : playMode === "trap_puzzle"
      ? "Trap puzzle opponent"
      : "Free play";

  // Synchronize saved games with localStorage
  useEffect(() => {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(savedGames));
  }, [savedGames]);

  // Once the Home intro has been shown, later visits open straight on Play
  useEffect(() => {
    if (activeTab !== "home") return;
    try {
      localStorage.setItem(SEEN_HOME_KEY, "1");
    } catch {
      // Storage can be unavailable (private mode); the intro just shows again next time
    }
  }, [activeTab]);

  // A new tab starts at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

  // Hold every looping animation still while the tab is hidden
  useEffect(() => {
    const sync = () => document.body.classList.toggle("paused", document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Fetch backend health & model metrics
  const checkHealth = useCallback(() => {
    fetch(`${API_URL}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Health check failed"))))
      .then((data: ModelHealth) => {
        setModelHealth(data);
        setError(null);
      })
      .catch(() => {
        setModelHealth(null);
      });
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Toggle audio
  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    showToast(next ? "Audio cues enabled" : "Audio muted");
  };

  // Request Blunder Risk & Tactical Analysis
  const analyzePosition = useCallback(
    async (position: Chess) => {
      const reqId = ++analysisRequestIdRef.current;
      setIsAnalyzing(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/tactical-analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fen: position.fen(), rating }),
        });
        if (reqId !== analysisRequestIdRef.current) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? "The coach could not analyze this position.");
        }
        const data = (await res.json()) as TacticalAnalysis;
        if (reqId !== analysisRequestIdRef.current) return;
        setTacticalAnalysis(data);
        setAnalysis({
          blunder_probability: data.overall_blunder_probability,
          rating,
          fen: data.fen,
          risk_band: data.risk_band,
          model_samples: null,
          side_to_move: position.turn(),
        });
        setEngineEvaluation(data.evaluation_centipawns);

        if ((data.overall_blunder_probability ?? 0) >= 0.65) {
          playSound("blunder");
        }
      } catch (err) {
        if (reqId !== analysisRequestIdRef.current) return;
        // Graceful fallback to /predict if tactical endpoint encounters an error
        try {
          const fallbackRes = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen: position.fen(), rating }),
          });
          if (reqId !== analysisRequestIdRef.current) return;
          if (fallbackRes.ok) {
            const fallbackData = (await fallbackRes.json()) as Analysis;
            setAnalysis(fallbackData);
            return;
          }
        } catch {
          // Ignore secondary fallback error
        }
        if (reqId === analysisRequestIdRef.current) {
          setError(err instanceof Error ? err.message : "Could not connect to coach API.");
        }
      } finally {
        if (reqId === analysisRequestIdRef.current) {
          setIsAnalyzing(false);
        }
      }
    },
    [rating]
  );

  // Analyse on mount and again whenever the rating changes, so requests never carry a stale rating
  useEffect(() => {
    if (playModeRef.current === "trap_puzzle") return;
    const timer = window.setTimeout(() => void analyzePosition(game), 200);
    return () => window.clearTimeout(timer);
  }, [analyzePosition]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearPuzzleTimers = () => {
    puzzleTimerRef.current.forEach((t) => window.clearTimeout(t));
    puzzleTimerRef.current = [];
  };

  // Put a puzzle on the board: the opponent's tempting move is already played
  const loadPuzzle = (index: number) => {
    if (!puzzles.length) return;
    clearPuzzleTimers();
    const puzzle = puzzles[((index % puzzles.length) + puzzles.length) % puzzles.length];
    const start = puzzleStartPosition(puzzle);
    moveRequestIdRef.current++;
    analysisRequestIdRef.current++;
    setPuzzleIndex(puzzles.indexOf(puzzle));
    setPuzzleStep(0);
    setPuzzleStatus("solving");
    setGame(start);
    setFenHistory([puzzle.fen, start.fen()]);
    setIsFlipped(puzzleSolverColor(puzzle) === "b");
    setCompletedGameSummary(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintArrow([]);
    setTacticalAnalysis(null);
    setAnalysis(null);
    setEngineEvaluation(null);
    setError(null);
  };

  const handleSelectMode = (mode: PlayMode) => {
    if (mode === playMode) return;
    playSound("click");
    clearPuzzleTimers();
    moveRequestIdRef.current++;
    analysisRequestIdRef.current++;
    setIsBotThinking(false);
    setIsAnalyzing(false);

    // Park the current game, then bring back the target mode's game (or start one)
    sessionsRef.current[playMode] = {
      game,
      fenHistory,
      completed: completedGameSummary,
      isFlipped,
      rating,
      evaluation: engineEvaluation,
    };
    setPlayMode(mode);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintArrow([]);
    setHoveredCandidateMove(null);
    setHoveredThreatSquare(null);
    setCoachAdvice(null);
    setTacticalAnalysis(null);
    setAnalysis(null);
    setError(null);

    if (mode === "trap_puzzle") {
      const saved = sessionsRef.current.trap_puzzle;
      if (saved) {
        setGame(saved.game);
        setFenHistory(saved.fenHistory);
        setIsFlipped(saved.isFlipped);
        setEngineEvaluation(null);
        setCompletedGameSummary(null);
      } else {
        loadPuzzle(puzzleIndex);
      }
      return;
    }

    const saved = sessionsRef.current[mode];
    const nextRating = saved?.rating ?? (mode === "human_sparring" && !MAIA_RATINGS.includes(rating) ? 1500 : rating);
    const nextGame = saved?.game ?? new Chess();
    setGame(nextGame);
    setFenHistory(saved?.fenHistory ?? [STARTING_FEN]);
    setCompletedGameSummary(saved?.completed ?? null);
    setIsFlipped(saved?.isFlipped ?? false);
    setEngineEvaluation(saved?.evaluation ?? null);
    setRating(nextRating);
    // If the bot was to move when this game was parked, let it move once the mode is active
    resumeBotRef.current = Boolean(saved) && !saved?.completed;
    if (nextRating === rating) void analyzePosition(nextGame);
  };

  // A rated game locks its rating until it ends or a new game starts
  const ratedModes: PlayMode[] = ["max_engine", "human_sparring", "tricky_bot"];
  const ratingLocked = ratedModes.includes(playMode) && game.history().length > 0 && !completedGameSummary;
  const handleSetRating = (r: number) => {
    if (ratingLocked) {
      showToast("Rating is locked for this game. Start a new game to change it.");
      return;
    }
    setRating(r);
    playSound("click");
  };

  const handleToggleOverlay = (key: keyof OverlayState) => {
    playSound("click");
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Request Engine Opponent Move (Stockfish / Trap / Maia)
  const requestBotMove = useCallback(
    async (position: Chess) => {
      if (playMode === "free_lab" || playMode === "trap_puzzle") return;
      const reqId = ++moveRequestIdRef.current;
      setIsBotThinking(true);
      setError(null);
      try {
        const endpoint =
          playMode === "tricky_bot" ? "/trap-move" : playMode === "human_sparring" ? "/maia-move" : "/move";
        const requestBody =
          playMode === "tricky_bot"
            ? { fen: position.fen(), rating, tolerance_centipawns: 50 }
            : playMode === "human_sparring"
            ? { fen: position.fen(), rating }
            : { fen: position.fen(), strength: Math.max(1, Math.min(20, Math.round(rating / 140))) };

        const res = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (reqId !== moveRequestIdRef.current) return;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail ?? "Bot engine could not find a move.");
        const botMove = body as BotMove;

        if (reqId !== moveRequestIdRef.current) return;
        setEngineEvaluation(botMove.evaluation_centipawns);

        // Clone with full PGN history
        const next = new Chess();
        try {
          next.loadPgn(position.pgn());
        } catch {
          next.load(position.fen());
        }

        const moveRes = next.move(botMove.uci);
        if (!moveRes) return;
        if (reqId !== moveRequestIdRef.current) return;

        setGame(next);
        setFenHistory((prev) => [...prev, next.fen()]);

        // Sound effect for bot move
        if (moveRes.captured) playSound("capture");
        else if (next.isCheck()) playSound("check");
        else playSound("move");

        const outcome = gameOutcome(next);
        if (outcome) {
          handleGameOver(next, outcome);
        } else {
          void analyzePosition(next);
        }
      } catch (err) {
        if (reqId === moveRequestIdRef.current) {
          setError(err instanceof Error ? err.message : "Engine calculation failed.");
        }
      } finally {
        if (reqId === moveRequestIdRef.current) {
          setIsBotThinking(false);
        }
      }
    },
    [playMode, rating, analyzePosition]
  );

  // Handle Game Completion
  const handleGameOver = (position: Chess, outcome: { result: string; reason: string }) => {
    playSound("game_end");
    const isWhiteWin = outcome.result.toLowerCase().includes("white wins");
    const isBlackWin = outcome.result.toLowerCase().includes("black wins");
    if (isWhiteWin) setEngineEvaluation(9999);
    else if (isBlackWin) setEngineEvaluation(-9999);
    else setEngineEvaluation(0);

    const newSavedGame: SavedGame = {
      id: `${Date.now()}`,
      completedAt: new Date().toISOString(),
      result: outcome.result,
      reason: outcome.reason,
      moves: position.history(),
      pgn: position.pgn(),
      mode: playMode,
      rating,
    };
    setSavedGames((prev) => [newSavedGame, ...prev].slice(0, 20));
    setCompletedGameSummary(newSavedGame);
  };

  // Request Coach Recommended Move Hint from Stockfish
  const handleRequestHint = async () => {
    if (completedGameSummary || isBotThinking || isFetchingHint) return;
    setIsFetchingHint(true);
    try {
      const res = await fetch(`${API_URL}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: game.fen(), strength: 10 }),
      });
      if (!res.ok) throw new Error("Could not compute hint");
      const botMove = (await res.json()) as BotMove;
      const from = botMove.uci.slice(0, 2) as Square;
      const to = botMove.uci.slice(2, 4) as Square;
      setHintArrow([[from, to, "rgba(255, 205, 86, 0.95)"]]);
      showToast(`Coach Hint: ${botMove.san}`);
    } catch {
      showToast("Hint unavailable for this position");
    } finally {
      setIsFetchingHint(false);
    }
  };

  // Request Grandmaster AI Coach Advice
  const handleFetchCoachAdvice = async () => {
    if (isFetchingCoachAdvice || completedGameSummary) return;
    setIsFetchingCoachAdvice(true);
    try {
      const res = await fetch(`${API_URL}/coach-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: game.fen(),
          rating,
          opening_name: openingName,
        }),
      });
      if (!res.ok) throw new Error("Could not fetch coach advice");
      const data = (await res.json()) as CoachExplanation;
      setCoachAdvice(data);
      playSound("click");
      showToast(`GM Coach: ${data.concept}`);
    } catch {
      showToast("Coach advice unavailable");
    } finally {
      setIsFetchingCoachAdvice(false);
    }
  };

  // Execute Move cleanly preserving full PGN history
  const executeMove = useCallback(
    (sourceSquare: Square, targetSquare: Square): boolean => {
      if (completedGameSummary || isBotThinking) return false;

      // Clone with full PGN history
      const next = new Chess();
      try {
        next.loadPgn(game.pgn());
      } catch {
        next.load(game.fen());
      }

      let move: Move | null = null;
      try {
        move = next.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
      } catch {
        return false;
      }

      if (!move) return false;

      if (playMode === "trap_puzzle") {
        if (!activePuzzle || puzzleStatus === "solved" || puzzleStatus === "revealed") return false;
        const line = activePuzzle.punishment_line;
        const expected = line[puzzleStep];
        if (move.san !== expected && !next.isCheckmate()) {
          setPuzzleStatus("wrong");
          playSound("blunder");
          setSelectedSquare(null);
          setOptionSquares({});
          return false;
        }
        setGame(next);
        setFenHistory((prev) => [...prev, next.fen()]);
        setSelectedSquare(null);
        setOptionSquares({});
        setHintArrow([]);
        playSound(move.captured ? "capture" : next.isCheck() ? "check" : "move");
        const done = puzzleStep + 1;
        if (done >= puzzleSolveLength(activePuzzle) || next.isCheckmate()) {
          setPuzzleStep(done);
          setPuzzleStatus("solved");
          setPuzzleSolved((prev) => new Set(prev).add(activePuzzle.id));
          playSound("game_end");
          return true;
        }
        // Correct: the opponent replies with the next move of the line
        setPuzzleStep(done);
        setPuzzleStatus("correct");
        const timer = window.setTimeout(() => {
          const replyBoard = new Chess();
          replyBoard.loadPgn(next.pgn());
          const reply = replyBoard.move(line[done]);
          setGame(replyBoard);
          setFenHistory((prev) => [...prev, replyBoard.fen()]);
          setPuzzleStep(done + 1);
          setPuzzleStatus("solving");
          playSound(reply?.captured ? "capture" : replyBoard.isCheck() ? "check" : "move");
        }, 550);
        puzzleTimerRef.current.push(timer);
        return true;
      }

      setGame(next);
      setFenHistory((prev) => [...prev, next.fen()]);
      setSelectedSquare(null);
      setOptionSquares({});
      setHintArrow([]);
      setCoachAdvice(null);

      // Audio cue
      if (move.captured) playSound("capture");
      else if (next.isCheck()) playSound("check");
      else playSound("move");

      const outcome = gameOutcome(next);
      if (outcome) {
        handleGameOver(next, outcome);
      } else if (playMode !== "free_lab") {
        void requestBotMove(next);
      } else {
        void analyzePosition(next);
      }

      return true;
    },
    [completedGameSummary, isBotThinking, game, playMode, requestBotMove, analyzePosition, activePuzzle, puzzleStep, puzzleStatus]
  );

  // Resume a parked bot game whose bot was to move
  useEffect(() => {
    if (!resumeBotRef.current) return;
    resumeBotRef.current = false;
    if (!ratedModes.includes(playMode) || completedGameSummary || gameOutcome(game)) return;
    const userColor = isFlipped ? "b" : "w";
    if (game.turn() !== userColor) void requestBotMove(game);
  }, [playMode, game, requestBotMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePuzzleHint = () => {
    if (!activePuzzle) return;
    const expected = activePuzzle.punishment_line[puzzleStep];
    const probe = new Chess(game.fen());
    try {
      const m = probe.move(expected);
      setOptionSquares({ [m.from]: { boxShadow: "inset 0 0 0 4px rgba(238, 238, 210, 0.95)", background: "rgba(238, 238, 210, 0.35)" } });
      showToast("Hint: move the highlighted piece");
    } catch {
      showToast("No hint for this position");
    }
  };

  // Play the rest of the line on the board, one move at a time
  const handlePuzzleReveal = () => {
    if (!activePuzzle) return;
    clearPuzzleTimers();
    setPuzzleStatus("revealed");
    const line = activePuzzle.punishment_line;
    let board = new Chess();
    board.loadPgn(game.pgn());
    for (let i = puzzleStep; i < puzzleSolveLength(activePuzzle); i++) {
      const timer = window.setTimeout(() => {
        const nextBoard = new Chess();
        nextBoard.loadPgn(board.pgn());
        nextBoard.move(line[i]);
        board = nextBoard;
        setGame(nextBoard);
        setFenHistory((prev) => [...prev, nextBoard.fen()]);
        setPuzzleStep(i + 1);
        playSound("move");
      }, 650 * (i - puzzleStep + 1));
      puzzleTimerRef.current.push(timer);
    }
  };

  // react-chessboard drag and drop drop handler
  const onPieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    return executeMove(sourceSquare, targetSquare);
  };

  // Immediate legal move highlights when user begins dragging
  const onPieceDragBegin = (_piece: Piece, sourceSquare: Square) => {
    if (completedGameSummary || isBotThinking) return;
    setSelectedSquare(sourceSquare);
    getMoveOptions(sourceSquare);
  };

  const onPieceDragEnd = () => {
    setSelectedSquare(null);
    setOptionSquares({});
  };

  // Draggable piece guard: Disallow dragging on opponent turn or when bot calculates
  const isDraggablePiece = ({ piece }: { piece: Piece }): boolean => {
    if (completedGameSummary || isBotThinking) return false;
    if (playMode === "free_lab") {
      return piece.startsWith(game.turn());
    }
    const userColor = isFlipped ? "b" : "w";
    return game.turn() === userColor && piece.startsWith(userColor);
  };

  // Click-to-move legal moves calculator
  const getMoveOptions = (square: Square): boolean => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      const isCapture = Boolean(game.get(move.to));
      newSquares[move.to] = {
        background: isCapture
          ? "radial-gradient(circle, transparent 54%, rgba(0, 0, 0, 0.3) 55%, rgba(0, 0, 0, 0.3) 76%, transparent 77%)"
          : "radial-gradient(circle, rgba(0, 0, 0, 0.28) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });
    newSquares[square] = {
      backgroundColor: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  };

  // Square Click Handler for click-to-move
  const onSquareClick = (square: Square) => {
    if (completedGameSummary || isBotThinking) return;

    const pieceOnSquare = game.get(square);
    const userColor = playMode === "free_lab" ? game.turn() : isFlipped ? "b" : "w";

    // 1. If no square currently selected:
    if (!selectedSquare) {
      if (pieceOnSquare && pieceOnSquare.color === userColor && game.turn() === userColor) {
        setSelectedSquare(square);
        getMoveOptions(square);
      }
      return;
    }

    // 2. If clicking another own piece, switch selection:
    if (pieceOnSquare && pieceOnSquare.color === userColor && game.turn() === userColor) {
      setSelectedSquare(square);
      getMoveOptions(square);
      return;
    }

    // 3. Otherwise execute move from selected to target square:
    const success = executeMove(selectedSquare, square);
    if (!success) {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  // BULLETPROOF SMART UNDO
  const handleUndo = () => {
    if (isBotThinking) return;

    // Load fresh instance with current PGN
    const next = new Chess();
    try {
      next.loadPgn(game.pgn());
    } catch {
      next.load(game.fen());
    }

    const historyLen = next.history().length;
    if (historyLen === 0 && fenHistory.length <= 1) return;

    // In bot mode: undo 2 plies if both player and bot have moved; in free lab mode: 1 ply
    const pliesToUndo = playMode !== "free_lab" && historyLen >= 2 ? 2 : 1;

    let actuallyUndone = 0;
    for (let i = 0; i < pliesToUndo; i++) {
      if (next.undo()) {
        actuallyUndone++;
      }
    }

    // Safety fallback with fenHistory stack if chess.js had no PGN history
    let restoredBoard = next;
    if (actuallyUndone === 0 && fenHistory.length > 1) {
      const targetIdx = Math.max(0, fenHistory.length - 1 - pliesToUndo);
      const targetFen = fenHistory[targetIdx];
      restoredBoard = new Chess(targetFen);
      actuallyUndone = pliesToUndo;
    }

    if (actuallyUndone === 0) return;

    moveRequestIdRef.current++;
    analysisRequestIdRef.current++;

    // Update state
    setGame(restoredBoard);
    setFenHistory((prev) => prev.slice(0, Math.max(1, prev.length - actuallyUndone)));
    setSelectedSquare(null);
    setOptionSquares({});
    setHintArrow([]);
    setHoveredCandidateMove(null);
    setHoveredThreatSquare(null);
    setCompletedGameSummary(null);
    setAnalysis(null);
    setTacticalAnalysis(null);
    setCoachAdvice(null);
    setEngineEvaluation(null);
    setError(null);
    playSound("move");
    showToast(actuallyUndone === 2 ? "Took back turn (2 moves)" : "Move undone");
    void analyzePosition(restoredBoard);
  };

  // Reset / New Game
  const handleNewGame = () => {
    moveRequestIdRef.current++;
    analysisRequestIdRef.current++;
    const next = new Chess();
    setGame(next);
    setFenHistory([STARTING_FEN]);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintArrow([]);
    setHoveredCandidateMove(null);
    setHoveredThreatSquare(null);
    setCompletedGameSummary(null);
    setSelectedReviewPly(null);
    setAnalysis(null);
    setTacticalAnalysis(null);
    setCoachAdvice(null);
    setEngineEvaluation(null);
    setError(null);
    setIsBotThinking(false);
    playSound("move");
    if (playMode === "trap_puzzle") {
      loadPuzzle(puzzleIndex);
      showToast("Puzzle reset");
      return;
    }
    showToast("New game");
    // Playing Black against a bot: the bot opens
    if (ratedModes.includes(playMode) && isFlipped) {
      void requestBotMove(next);
    } else {
      void analyzePosition(next);
    }
  };

  // Copy FEN
  const handleCopyFen = () => {
    navigator.clipboard.writeText(game.fen());
    showToast("FEN copied to clipboard");
  };

  // Download PGN
  const handleDownloadPgn = (targetPgn?: string) => {
    const pgnData = targetPgn ?? game.pgn();
    const blob = new Blob([pgnData || "No moves played."], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chesswise-game-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("PGN downloaded");
  };

  // Upload PGN in Review Tab
  const handleUploadPgn = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const pgnText = await file.text();
      const res = await fetch(`${API_URL}/analyze-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn_text: pgnText, rating }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail ?? "Could not analyze uploaded PGN.");
      const report = body as GameReport;
      setGameReport(report);
      setIsReviewingGame(true);
      if (report.moves.length > 0) {
        selectReviewPly(report, report.moves[0].ply);
      }
      showToast("Game PGN successfully analyzed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze PGN file.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Handle Board Perspective Flip (triggers bot first move if Black plays bot from start)
  const handleFlipBoard = useCallback(() => {
    setIsFlipped((prev) => {
      const nextFlipped = !prev;
      if (
        nextFlipped &&
        playMode !== "free_lab" &&
        game.history().length === 0 &&
        game.turn() === "w" &&
        !isBotThinking
      ) {
        showToast("Bot plays White (1st move)");
        void requestBotMove(game);
      }
      return nextFlipped;
    });
  }, [playMode, game, isBotThinking, requestBotMove]);

  // Jump to move in Review
  const selectReviewPly = (report: GameReport, ply: number) => {
    if (ply === 0) {
      setSelectedReviewPly(0);
      const startFen = report.moves[0]?.fen ?? STARTING_FEN;
      setReviewGame(new Chess(startFen));
      playSound("move");
      return;
    }
    const moveItem = report.moves.find((m) => m.ply === ply);
    if (!moveItem) return;
    setSelectedReviewPly(ply);
    const revBoard = new Chess(moveItem.fen);
    try {
      revBoard.move(moveItem.uci);
    } catch {
      // fallback
    }
    setReviewGame(revBoard);
    playSound("move");
  };

  const handleSelectReviewPly = (ply: number) => {
    if (gameReport) selectReviewPly(gameReport, ply);
  };

  // Export Blunder practice FENs
  const handleDownloadPracticeFens = () => {
    if (!gameReport) return;
    const lines = gameReport.moves
      .filter((m) => m.is_blunder || m.risk_band === "high")
      .map(
        (m) =>
          `# Move ${m.move_number}${m.ply % 2 === 1 ? "." : "..."} ${m.san} (${m.player}) - Loss: ${
            m.evaluation_loss_centipawns
          }cp\n${m.fen}`
      );
    const content = lines.join("\n\n") || "No critical blunder positions identified.";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chesswise-blunder-practice-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Practice positions exported");
  };

  // Switch to review tab with current game
  const handleReviewCurrentGame = async () => {
    const currentPgn = game.pgn();
    if (!currentPgn || game.history().length === 0) {
      showToast("No moves to review yet");
      return;
    }
    await handleReviewPgn(currentPgn);
  };

  // Load and analyze any PGN into Game Review
  const handleReviewPgn = async (pgn: string) => {
    if (!pgn) return;
    setIsReviewingGame(true);
    setActiveTab("arena");
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/analyze-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn_text: pgn, rating }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail ?? "Could not review game.");
      const report = body as GameReport;
      setGameReport(report);
      if (report.moves.length > 0) {
        selectReviewPly(report, report.moves[0].ply);
      }
      showToast("Game review ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing game.");
    } finally {
      setIsUploading(false);
    }
  };

  // Dynamic Tactical Arrows: Hovered candidate move preview or coach hint arrow
  const activeArrows = useMemo((): [Square, Square, string?][] => {
    if (hoveredCandidateMove && hoveredCandidateMove.length >= 4) {
      const from = hoveredCandidateMove.slice(0, 2) as Square;
      const to = hoveredCandidateMove.slice(2, 4) as Square;
      return [[from, to, "rgb(255, 150, 40)"]];
    }
    return overlays.arrows ? hintArrow : [];
  }, [hoveredCandidateMove, hintArrow, overlays.arrows]);

  const threats = tacticalAnalysis?.threats ?? NO_THREATS;

  // Square Highlights: Territory Heatmap + Last move + King in check glow + Threat radar + Click-to-move options + Review badge
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 0. Territory Influence & Control Heatmap Overlay
    if (showTerritoryHeatmap && territoryControl) {
      Object.entries(territoryControl.squares).forEach(([sq, data]) => {
        if (data.dominant === "w") {
          styles[sq] = {
            backgroundColor: `rgba(255, 205, 86, ${0.22 + data.intensity * 0.3})`,
            boxShadow: "inset 0 0 0 2px rgba(255, 205, 86, 0.55)",
            transition: "background-color 0.2s ease",
          };
        } else if (data.dominant === "b") {
          styles[sq] = {
            backgroundColor: `rgba(196, 48, 72, ${0.22 + data.intensity * 0.3})`,
            boxShadow: "inset 0 0 0 2px rgba(196, 48, 72, 0.55)",
            transition: "background-color 0.2s ease",
          };
        } else if (data.dominant === "contested") {
          styles[sq] = {
            backgroundColor: "rgba(146, 110, 230, 0.3)",
            boxShadow: "inset 0 0 0 2px rgba(146, 110, 230, 0.55)",
            transition: "background-color 0.2s ease",
          };
        }
      });
    }

    // 1. King in Check highlight
    if (isCheck && kingSquare) {
      styles[kingSquare] = {
        background: "radial-gradient(circle, rgba(239, 68, 68, 0.88) 0%, rgba(220, 38, 38, 0.35) 65%, transparent 100%)",
        borderRadius: "6px",
      };
    }

    // 2. Last move (from & to) highlight
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: "rgba(255, 255, 0, 0.28)",
      };
      styles[lastMove.to] = {
        backgroundColor: "rgba(255, 255, 0, 0.42)",
      };
    }

    // 3. Threat overlay: ring every flagged piece
    if (overlays.threats) {
      threats.forEach((t) => {
        styles[t.square] = {
          ...styles[t.square],
          boxShadow: "inset 0 0 0 3px rgba(245, 158, 11, 0.95)",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
        };
      });
    }

    // 4. Hovered tactical threat square highlight
    if (hoveredThreatSquare) {
      styles[hoveredThreatSquare] = {
        background: "radial-gradient(circle, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.4) 65%, transparent 100%)",
        boxShadow: "inset 0 0 0 3px #ef4444",
        borderRadius: "4px",
      };
    }

    // 4. Click-to-move options & selected square
    Object.assign(styles, optionSquares);

    return styles;
  }, [
    showTerritoryHeatmap,
    territoryControl,
    isCheck,
    kingSquare,
    lastMove,
    hoveredThreatSquare,
    optionSquares,
    overlays.threats,
    threats,
  ]);

  // Review Board Square Highlights (from / to square of reviewed move + badge glow)
  const reviewSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (gameReport && selectedReviewPly !== null) {
      const revMove = gameReport.moves.find((m) => m.ply === selectedReviewPly);
      if (revMove && revMove.uci.length >= 4) {
        const fromSq = revMove.uci.slice(0, 2);
        const toSq = revMove.uci.slice(2, 4);
        const cls = revMove.classification ?? classifyMove(revMove.evaluation_loss_centipawns, revMove.ply);
        const badge = getMoveBadgeInfo(cls);
        styles[fromSq] = {
          backgroundColor: "rgba(255, 255, 0, 0.22)",
        };
        styles[toSq] = {
          backgroundColor: "rgba(255, 255, 0, 0.38)",
          boxShadow: `0 0 16px ${badge.color}, inset 0 0 0 3px ${badge.color}`,
          borderRadius: "6px",
        };
      }
    }
    return styles;
  }, [gameReport, selectedReviewPly]);

  // Shared reset used whenever a position is loaded into the arena from another tab
  const loadIntoArena = (loaded: Chess, toast: string, options: { freeLab?: boolean } = {}) => {
    moveRequestIdRef.current++;
    analysisRequestIdRef.current++;
    setGame(loaded);
    setFenHistory([loaded.fen()]);
    if (options.freeLab) {
      setPlayMode("free_lab");
      setIsFlipped(loaded.turn() === "b");
    }
    setIsReviewingGame(false);
    setCompletedGameSummary(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintArrow([]);
    setCoachAdvice(null);
    setHoveredCandidateMove(null);
    setHoveredThreatSquare(null);
    setSelectedReviewPly(null);
    setError(null);
    setActiveTab("arena");
    showToast(toast);
    void analyzePosition(loaded);
  };

  const handlePracticePosition = (fen: string, title: string) => {
    const loaded = new Chess();
    try {
      loaded.load(fen);
    } catch {
      showToast("Could not load academy position");
      return;
    }
    loadIntoArena(loaded, `Loaded "${title}" on the analysis board`, { freeLab: true });
  };

  const handleLoadSavedGame = (saved: SavedGame) => {
    const loaded = new Chess();
    try {
      loaded.loadPgn(saved.pgn);
    } catch {
      showToast("Could not parse saved match PGN");
      return;
    }
    loadIntoArena(loaded, "Match loaded into the arena");
  };

  const handleNavigateAcademy = (leakKey?: string) => {
    const pillarByLeak: Record<string, string> = {
      pins: "middlegame",
      hanging_pieces: "opening",
      overloaded_defenders: "defense",
      back_rank: "defense",
      time_scramble: "endgame",
      pawn_structure: "opening",
    };
    setAcademyPillar((leakKey && pillarByLeak[leakKey]) || "all");
    setActiveTab("academy");
  };

  const clearArchive = () => {
    setSavedGames([]);
    setConfirmClear(false);
    showToast("Archive cleared");
  };

  const riskScore = analysis?.blunder_probability ?? tacticalAnalysis?.overall_blunder_probability ?? null;
  const riskUnavailable = tacticalAnalysis?.risk_source === "unavailable" && riskScore === null;
  const evalUnavailable = tacticalAnalysis?.eval_source === "unavailable";
  const isLive = !completedGameSummary;
  const opponentAvatar =
    playMode === "max_engine" ? "⚡" : playMode === "tricky_bot" ? "🪤" : playMode === "human_sparring" ? "🧠" : "🧪";
  const viewKey = activeTab === "arena" && isReviewingGame ? "review" : activeTab;
  useScrollReveal(viewKey);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="ambient" aria-hidden="true">
        <span className="ambient__grain" />
      </div>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        modelHealth={modelHealth}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        isFlipped={isFlipped}
        onFlipBoard={handleFlipBoard}
        onOpenSettings={() => setShowSettings(true)}
        isDark={appearance.isDark}
        onToggleTheme={() => appearance.setTheme(appearance.isDark ? "light" : "dark")}
      />

      {toastMessage && (
        <div key={toastMessage} className="toast" role="status">
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {completedGameSummary && (
        <GameOverModal
          gameSummary={completedGameSummary}
          onUndo={handleUndo}
          onNewGame={handleNewGame}
          onReviewGame={handleReviewCurrentGame}
          onDownloadPgn={() => handleDownloadPgn(completedGameSummary.pgn)}
          onDismiss={() => setCompletedGameSummary(null)}
        />
      )}

      <main id="main" tabIndex={-1} className="main-content">
        <div key={viewKey} className="view-enter">
          {activeTab === "home" && (
            <HomeView
              onStart={(mode) => {
                if (mode) handleSelectMode(mode);
                setActiveTab("arena");
              }}
              onOpenTraps={() => {
                handleSelectMode("trap_puzzle");
                setActiveTab("arena");
              }}
            />
          )}
          {activeTab === "arena" && !isReviewingGame && (
            <div className="view arena-page">
              <ArenaView
                boardSize={boardSize}
                panelHead={
                  <>
                    <PlayToolbar
                      playMode={playMode}
                      rating={rating}
                      ratingLocked={ratingLocked}
                      onSelectMode={handleSelectMode}
                      onSetRating={handleSetRating}
                    />
                    <BoardHud
                      sideToMove={sideToMove}
                      fen={game.fen()}
                      moveCount={history.length}
                      riskScore={playMode === "trap_puzzle" ? null : riskScore}
                      riskUnavailable={playMode !== "trap_puzzle" && riskUnavailable}
                      isCheck={isCheck}
                      isAnalyzing={isAnalyzing}
                    >
                      <OverlayControls overlays={overlays} onToggle={handleToggleOverlay} />
                    </BoardHud>
                    {showTerritoryHeatmap && territoryControl && <InfluencePanel territory={territoryControl} />}
                  </>
                }
                topStrip={
                  <PlayerStrip
                    avatar={opponentAvatar}
                    name={opponentName}
                    color={opponentColor}
                    isTurn={isOpponentTurn && isLive}
                    turnLabel={playMode === "free_lab" ? "To move" : isBotThinking ? "Thinking" : "To move"}
                    isThinking={isBotThinking}
                    inCheck={isCheck && sideToMove === opponentColor}
                    captured={opponentCaptured}
                    materialLead={opponentScoreLead}
                    trailing={
                      <span className="pill opening-pill" title="Detected opening">
                        📖 {openingName}
                      </span>
                    }
                  />
                }
                board={
                  <ArenaBoard
                    fen={game.fen()}
                    boardWidth={boardWidth}
                    boardRef={boardContainerRef}
                    isFlipped={isFlipped}
                    evaluationCentipawns={engineEvaluation}
                    evalUnavailable={evalUnavailable && engineEvaluation === null}
                    turn={isLive ? sideToMove : undefined}
                    isCheck={isCheck}
                    squareStyles={customSquareStyles}
                    arrows={activeArrows}
                    interactive={{ onPieceDrop, onPieceDragBegin, onPieceDragEnd, onSquareClick, isDraggablePiece }}
                  />
                }
                bottomStrip={
                  <PlayerStrip
                    avatar={playerColor === "w" ? "♔" : "♚"}
                    name="You"
                    color={playerColor}
                    isTurn={isPlayerTurn && isLive}
                    turnLabel="Your turn"
                    inCheck={isCheck && sideToMove === playerColor}
                    captured={playerCaptured}
                    materialLead={playerScoreLead}
                  />
                }
                controls={
                  <BoardControls
                    canUndo={playMode !== "trap_puzzle" && !(history.length === 0 && fenHistory.length <= 1) && !isBotThinking}
                    canHint={isLive && !isBotThinking && !isFetchingHint}
                    isFetchingHint={isFetchingHint}
                    hasMoves={history.length > 0}
                    boardSize={boardSize}
                    onUndo={handleUndo}
                    onHint={playMode === "trap_puzzle" ? handlePuzzleHint : handleRequestHint}
                    onFlip={handleFlipBoard}
                    onCopyFen={handleCopyFen}
                    onDownloadPgn={() => handleDownloadPgn()}
                    onToggleBoardSize={handleToggleBoardSize}
                    onNewGame={handleNewGame}
                    newGameLabel={playMode === "trap_puzzle" ? "Restart" : "New game"}
                  />
                }
                sidebar={playMode === "trap_puzzle" ? [
                  <PuzzleCard
                    key="puzzle"
                    puzzle={activePuzzle}
                    index={puzzleIndex}
                    total={puzzles.length}
                    step={puzzleStep}
                    solveLength={activePuzzle ? puzzleSolveLength(activePuzzle) : 0}
                    status={puzzleStatus}
                    solvedCount={puzzleSolved.size}
                    onHint={handlePuzzleHint}
                    onReveal={handlePuzzleReveal}
                    onRetry={() => loadPuzzle(puzzleIndex)}
                    onPrev={() => loadPuzzle(puzzleIndex - 1)}
                    onNext={() => loadPuzzle(puzzleIndex + 1)}
                  />,
                  <MoveHistory key="history" movePairs={movePairs} />,
                ] : [
                  <OutlookCard
                    key="outlook"
                    winChances={tacticalAnalysis?.win_chances}
                    evalUnavailable={evalUnavailable}
                    isCheck={isCheck}
                    moveCount={history.length}
                    riskScore={riskScore}
                    lastMoveSan={lastMove?.san}
                    outcome={completedGameSummary}
                  />,
                  <CandidateMovesCard
                    key="candidates"
                    candidateMoves={tacticalAnalysis?.candidate_moves ?? []}
                    sideToMove={(tacticalAnalysis?.side_to_move ?? "White") === "White" ? "w" : "b"}
                    isLoading={isAnalyzing}
                    engineUnavailable={evalUnavailable}
                    onHoverCandidateMove={setHoveredCandidateMove}
                    hoveredUci={hoveredCandidateMove}
                  />,
                  <CoachCard
                    key="coach"
                    coachAdvice={coachAdvice}
                    fallbackText={tacticalAnalysis?.coach_explanation ?? (riskScore !== null ? riskFor(riskScore).description : "Play a move to get coaching on the position.")}
                    onFetchCoachAdvice={handleFetchCoachAdvice}
                    isFetchingCoachAdvice={isFetchingCoachAdvice}
                    disabled={!isLive}
                  />,
                  <ThreatRadarCard
                    key="threats"
                    threats={threats}
                    sideToMove={sideToMove}
                    onHoverThreatSquare={setHoveredThreatSquare}
                  />,
                  <MoveHistory key="history" movePairs={movePairs} />,
                ]}
              />
            </div>
          )}

          {activeTab === "arena" && isReviewingGame && gameReport && (
            <ReviewWorkspace
              gameReport={gameReport}
              reviewFen={reviewGame.fen()}
              boardWidth={boardWidth}
              boardRef={boardContainerRef}
              boardSize={boardSize}
              isFlipped={isFlipped}
              squareStyles={reviewSquareStyles}
              selectedPly={selectedReviewPly}
              isUploading={isUploading}
              onSelectPly={handleSelectReviewPly}
              onUploadPgn={handleUploadPgn}
              onDownloadPracticePositions={handleDownloadPracticeFens}
              onExit={() => {
                playSound("click");
                setIsReviewingGame(false);
              }}
            />
          )}

          {activeTab === "trap_dojo" && <TrapDrillMode apiUrl={API_URL} />}

          {activeTab === "blunder_dna" && (
            <BlunderDnaProfiler
              savedGames={savedGames}
              apiUrl={API_URL}
              onNavigateAcademy={handleNavigateAcademy}
              onPracticePuzzles={() => {
                setActiveTab("arena");
                setIsReviewingGame(false);
                handleSelectMode("trap_puzzle");
              }}
            />
          )}

          {activeTab === "academy" && (
            <ChessAcademy initialPillar={academyPillar} onPracticePosition={handlePracticePosition} />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              soundEnabled={soundActive}
              onToggleSound={handleToggleSound}
              boardSize={boardSize}
              onChangeBoardSize={(sz) => {
                setBoardSize(sz);
                localStorage.setItem("chesswise.board-size", sz);
                showToast(`Board size: ${sz}`);
              }}
              savedGames={savedGames}
              onLoadGame={handleLoadSavedGame}
              onReviewGame={(g) => handleReviewPgn(g.pgn)}
              onDownloadPgn={(g) => handleDownloadPgn(g.pgn)}
              onDeleteGame={(id) => {
                setSavedGames((prev) => prev.filter((g) => g.id !== id));
                showToast("Match removed from archive");
              }}
              onClearAllGames={() => setConfirmClear(true)}
              modelHealth={modelHealth}
              theme={appearance.theme}
              onChangeTheme={appearance.setTheme}
              boardTheme={appearance.board}
              onChangeBoardTheme={appearance.setBoard}
            />
          )}
        </div>
      </main>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        savedGamesCount={savedGames.length}
        onClearSavedGames={() => {
          setShowSettings(false);
          setConfirmClear(true);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear the whole archive?"
        message={`This permanently deletes all ${savedGames.length} saved matches from this browser. It can't be undone.`}
        confirmLabel="Delete all matches"
        onConfirm={clearArchive}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
