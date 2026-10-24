import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Piece } from "react-chessboard/dist/chessboard/types";
import {
  RotateCcw,
  Undo2,
  FlipHorizontal2,
  Copy,
  Download,
  AlertCircle,
  Loader2,
  Check,
  Lightbulb,
  Maximize2,
  Layers,
  Target,
  Dna,
} from "lucide-react";

import type {
  Analysis,
  AppTab,
  BotMove,
  GameReport,
  ModelHealth,
  MovePair,
  PlayMode,
  SavedGame,
  TacticalAnalysis,
  CoachExplanation,
} from "./types/chess";
import { Header } from "./components/Header";
import { EvaluationBar } from "./components/EvaluationBar";
import { BlunderRiskMeter } from "./components/BlunderRiskMeter";
import { MoveHistory } from "./components/MoveHistory";
import { GameOverModal } from "./components/GameOverModal";
import { GameReview } from "./components/GameReview";
import { SettingsModal } from "./components/SettingsModal";
import { TrapDrillMode } from "./components/TrapDrillMode";
import { BlunderDnaProfiler } from "./components/BlunderDnaProfiler";
import { BoardHud } from "./components/BoardHud";
import { CandidateMovesCard } from "./components/CandidateMovesCard";
import { ChessAcademy } from "./components/ChessAcademy";
import { SettingsTab } from "./components/SettingsTab";
import {
  gameOutcome,
  getKingSquare,
  detectOpening,
  getCapturedPieces,
  computeLocalTerritory,
  classifyMove,
  getMoveBadgeInfo,
} from "./utils/chessUtils";
import { playSound, setSoundEnabled } from "./utils/audio";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const SAVED_GAMES_KEY = "chesswise.completed-games";
const STARTING_FEN = new Chess().fen();
const ratingOptions = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2400, 2800];

export default function App() {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [fenHistory, setFenHistory] = useState<string[]>([STARTING_FEN]);
  const [rating, setRating] = useState<number>(1200);
  const [playMode, setPlayMode] = useState<PlayMode>("free_lab");
  const [activeTab, setActiveTab] = useState<AppTab>("arena");
  const [isReviewingGame, setIsReviewingGame] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [boardSize, setBoardSize] = useState<"compact" | "standard" | "large">(() => {
    return (localStorage.getItem("chesswise.board-size") as "compact" | "standard" | "large") || "standard";
  });
  const [showTerritoryHeatmap, setShowTerritoryHeatmap] = useState<boolean>(false);
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
      const rect = el.getBoundingClientRect();
      if (rect.width > 200) {
        setBoardWidth(Math.floor(rect.width));
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(updateDimensions);
    ro.observe(el);
    return () => ro.disconnect();
  }, [boardSize, activeTab]);

  // Derived Board Telemetry
  const history = game.history({ verbose: true });
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
      ? `Tricky Bot`
      : playMode === "human_sparring"
      ? `Maia-2 (${rating} Elo)`
      : "Free Lab (Sandbox)";

  // Synchronize saved games with localStorage
  useEffect(() => {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(savedGames));
  }, [savedGames]);

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

        if (data.overall_blunder_probability >= 0.65) {
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
    void analyzePosition(game);
  }, [analyzePosition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Request Engine Opponent Move (Stockfish / Trap / Maia)
  const requestBotMove = useCallback(
    async (position: Chess) => {
      if (playMode === "free_lab") return;
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
      setHintArrow([[from, to, "rgba(74, 222, 128, 0.9)"]]);
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
    [completedGameSummary, isBotThinking, game, playMode, requestBotMove, analyzePosition]
  );

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
    playSound("move");
    showToast("New game initialized");
    void analyzePosition(next);
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
      showToast("Game review loaded with CAPS accuracy");
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
      return [[from, to, "rgb(56, 189, 248)"]];
    }
    return hintArrow;
  }, [hoveredCandidateMove, hintArrow]);

  // Square Highlights: Territory Heatmap + Last move + King in check glow + Threat radar + Click-to-move options + Review badge
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 0. Territory Influence & Control Heatmap Overlay
    if (showTerritoryHeatmap && territoryControl) {
      Object.entries(territoryControl.squares).forEach(([sq, data]) => {
        if (data.dominant === "w") {
          styles[sq] = {
            backgroundColor: `rgba(6, 182, 212, ${0.16 + data.intensity * 0.22})`,
            boxShadow: "inset 0 0 0 1px rgba(6, 182, 212, 0.35)",
            transition: "background-color 0.2s ease",
          };
        } else if (data.dominant === "b") {
          styles[sq] = {
            backgroundColor: `rgba(239, 68, 68, ${0.16 + data.intensity * 0.22})`,
            boxShadow: "inset 0 0 0 1px rgba(239, 68, 68, 0.35)",
            transition: "background-color 0.2s ease",
          };
        } else if (data.dominant === "contested") {
          styles[sq] = {
            backgroundColor: "rgba(234, 179, 8, 0.22)",
            boxShadow: "inset 0 0 0 1px rgba(234, 179, 8, 0.35)",
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

    // 3. Hovered tactical threat square highlight
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

  return (
    <div className="app-shell">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        modelHealth={modelHealth}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        isFlipped={isFlipped}
        onFlipBoard={handleFlipBoard}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-pill" role="status">
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Backend Disconnection Banner */}
      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button className="banner-close" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Game Over Banner with Takeback & Review */}
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

      {/* Subheader Toolbar: Mode Selector & Context-Aware Dynamic Elo */}
      {activeTab === "arena" && !isReviewingGame && (
        <div className="play-toolbar">
          <div className="mode-segmented-control" role="group" aria-label="Game Mode">
            <button
              className={`mode-btn ${playMode === "free_lab" ? "active" : ""}`}
              onClick={() => {
                setPlayMode("free_lab");
                setSelectedSquare(null);
                setOptionSquares({});
                playSound("click");
              }}
              title="Free Lab Sandbox: Explore lines with instant Grandmaster & Stockfish analysis"
            >
              <span>🧪 Free Lab</span>
            </button>
            <button
              className={`mode-btn ${playMode === "max_engine" ? "active" : ""}`}
              onClick={() => {
                setPlayMode("max_engine");
                setSelectedSquare(null);
                setOptionSquares({});
                playSound("click");
              }}
              title="Stockfish 16 Max Engine: Play against maximum engine strength (800 - 2800+ Elo)"
            >
              <span>⚡ Max Engine</span>
            </button>
            <button
              className={`mode-btn ${playMode === "human_sparring" ? "active" : ""}`}
              onClick={() => {
                setPlayMode("human_sparring");
                if (![1100, 1300, 1500, 1700, 1900].includes(rating)) {
                  setRating(1500);
                }
                setSelectedSquare(null);
                setOptionSquares({});
                playSound("click");
              }}
              title="Human Sparring (Maia-2): Authentic human decision psychology"
            >
              <span>🧠 Human Sparring</span>
            </button>
            <button
              className={`mode-btn ${playMode === "tricky_bot" ? "active" : ""}`}
              onClick={() => {
                setPlayMode("tricky_bot");
                setSelectedSquare(null);
                setOptionSquares({});
                playSound("click");
              }}
              title="Tricky Bot: Deploys aggressive opening traps and poisonous tactics"
            >
              <span>🪤 Tricky Bot</span>
            </button>
          </div>

          {/* Dynamic Context-Aware Elo Selector */}
          <div className="dynamic-elo-selector-wrap">
            {playMode === "human_sparring" && (
              <div className="maia-elo-control">
                <span className="rating-label">MAIA-2 ELO:</span>
                <div className="maia-pills-row">
                  {[1100, 1300, 1500, 1700, 1900].map((r) => (
                    <button
                      key={r}
                      className={`elo-pill ${rating === r ? "active" : ""}`}
                      onClick={() => {
                        setRating(r);
                        playSound("click");
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {playMode === "max_engine" && (
              <div className="stockfish-elo-control">
                <div className="stockfish-label-row">
                  <span className="rating-label">STOCKFISH ELO:</span>
                  <span className="stockfish-rating-badge">
                    {rating >= 2800 ? "2800+ Max GM" : `${rating} Elo`}
                  </span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="2800"
                  step="200"
                  value={rating}
                  onChange={(e) => {
                    const nextRating = Number(e.target.value);
                    setRating(nextRating);
                  }}
                  className="stockfish-rating-slider"
                  title="Adjust Stockfish Engine Strength"
                />
              </div>
            )}

            {(playMode === "free_lab" || playMode === "tricky_bot") && (
              <div className="objective-mode-pill" title="This mode operates on objective tactical analysis">
                <span className="status-dot neutral" />
                <span>Objective Mode — Elo N/A</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="main-content">
        {activeTab === "arena" && !isReviewingGame && (
          <div className="play-workspace">
            {/* Left Board Column */}
            <div className={`board-column board-size-${boardSize}`}>
              {/* Board HUD Strip */}
              <BoardHud
                sideToMove={sideToMove}
                fen={game.fen()}
                moveCount={history.length}
                riskScore={
                  analysis?.blunder_probability ??
                  tacticalAnalysis?.overall_blunder_probability ??
                  0
                }
                isCheck={isCheck}
              />

              {/* Top Opponent Player Bar */}
              <div className="player-strip opponent-strip">
                <div className="player-meta-left">
                  <div className={`player-avatar ${isOpponentTurn ? "turn-active" : ""}`}>
                    {playMode === "max_engine" ? "⚡" : playMode === "tricky_bot" ? "🪤" : playMode === "human_sparring" ? "🧠" : "🧪"}
                  </div>
                  <div className="player-labels">
                    <div className="player-name-row">
                      <span className="player-name">{opponentName}</span>
                      <span className="player-color-tag">{opponentColor === "w" ? "♔ White" : "♚ Black"}</span>
                      {isOpponentTurn && !completedGameSummary && (
                        <span className="thinking-tag">
                          <span className="pulse-dot" />
                          {isBotThinking ? "Thinking..." : "To move"}
                        </span>
                      )}
                    </div>
                    <div className="player-captured-row">
                      {opponentCaptured.map((sym, i) => (
                        <span key={i} className="captured-piece-sym">{sym}</span>
                      ))}
                      {opponentScoreLead > 0 && (
                        <span className="material-lead-tag">+{opponentScoreLead}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="board-top-extras">
                  <span className="opening-pill" title="Detected Opening Book">
                    📖 {openingName}
                  </span>
                  {isCheck && sideToMove === opponentColor && (
                    <span className="check-alert-tag">CHECK!</span>
                  )}
                </div>
              </div>

              {/* Territory Control & Center Influence Bar (Milestone 2) */}
              {showTerritoryHeatmap && territoryControl && (
                <div className="territory-influence-panel">
                  <div className="center-dominance-row">
                    <span className="dom-badge white">♔ {territoryControl.center_control.white_percent}% White</span>
                    <span className="dom-title">Central Outposts (e4 / d4 / e5 / d5)</span>
                    <span className="dom-badge black">♚ {territoryControl.center_control.black_percent}% Black</span>
                  </div>
                  <div className="dominance-split-meter">
                    <div
                      className="split-segment white"
                      style={{ width: `${territoryControl.center_control.white_percent}%` }}
                      title={`White center control: ${territoryControl.center_control.white_percent}%`}
                    />
                    <div
                      className="split-segment black"
                      style={{ width: `${territoryControl.center_control.black_percent}%` }}
                      title={`Black center control: ${territoryControl.center_control.black_percent}%`}
                    />
                  </div>
                  <div className="influence-totals-row">
                    <span><strong>♔ {territoryControl.total_influence.white_squares}</strong> Sq White</span>
                    <span className="text-amber"><strong>{territoryControl.total_influence.contested_squares}</strong> Contested</span>
                    <span><strong>♚ {territoryControl.total_influence.black_squares}</strong> Sq Black</span>
                  </div>

                  {/* Educational Outpost Legend */}
                  <div className="heatmap-legend-row">
                    <div className="legend-chip cyan">
                      <span className="legend-dot cyan" />
                      <span>Cyan: White Outpost</span>
                    </div>
                    <div className="legend-chip ruby">
                      <span className="legend-dot ruby" />
                      <span>Ruby: Black Outpost</span>
                    </div>
                    <div className="legend-chip amber">
                      <span className="legend-dot amber" />
                      <span>Amber: Contested Hotspot</span>
                    </div>
                  </div>
                  <p className="heatmap-pedagogical-hint">
                    Central squares and outpost anchors dictate tactical initiative. Deeply embedded outposts restrict enemy candidate moves.
                  </p>
                </div>
              )}

              {/* Chessboard and Vertical Evaluation Bar Container */}
              <div className="board-wrapper">
                <EvaluationBar
                  evaluationCentipawns={engineEvaluation}
                  isFlipped={isFlipped}
                />
                <div className="board-inner" ref={boardContainerRef}>
                  <Chessboard
                    position={game.fen()}
                    boardWidth={boardWidth}
                    onPieceDrop={onPieceDrop}
                    onPieceDragBegin={onPieceDragBegin}
                    onPieceDragEnd={onPieceDragEnd}
                    onSquareClick={onSquareClick}
                    isDraggablePiece={isDraggablePiece}
                    boardOrientation={isFlipped ? "black" : "white"}
                    customSquareStyles={customSquareStyles}
                    customArrows={activeArrows}
                    customDropSquareStyle={{
                      boxShadow: "inset 0 0 1px 4px rgba(255, 255, 255, 0.75)",
                    }}
                    customBoardStyle={{
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                    }}
                    customDarkSquareStyle={{ backgroundColor: "#769656" }}
                    customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
                    snapToCursor={false}
                    autoPromoteToQueen={true}
                    dropOffBoardAction="snapback"
                    animationDuration={150}
                  />
                </div>
              </div>

              {/* Bottom You (Player) Strip */}
              <div className="player-strip player-self-strip">
                <div className="player-meta-left">
                  <div className={`player-avatar ${isPlayerTurn ? "turn-active" : ""}`}>
                    {playerColor === "w" ? "♔" : "♚"}
                  </div>
                  <div className="player-labels">
                    <div className="player-name-row">
                      <span className="player-name">You</span>
                      <span className="player-color-tag">{playerColor === "w" ? "White" : "Black"}</span>
                      {isPlayerTurn && !completedGameSummary && (
                        <span className="your-turn-pill">
                          <span className="pulse-dot green" /> Your Turn
                        </span>
                      )}
                      {isCheck && sideToMove === playerColor && (
                        <span className="check-alert-tag">IN CHECK!</span>
                      )}
                    </div>
                    <div className="player-captured-row">
                      {playerCaptured.map((sym, i) => (
                        <span key={i} className="captured-piece-sym">{sym}</span>
                      ))}
                      {playerScoreLead > 0 && (
                        <span className="material-lead-tag">+{playerScoreLead}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Board Size Toggle */}
                <button
                  className="board-size-toggle-btn"
                  onClick={handleToggleBoardSize}
                  title={`Board Size: ${boardSize.toUpperCase()} (Click to toggle)`}
                >
                  <Maximize2 size={13} />
                  <span>{boardSize.toUpperCase()}</span>
                </button>
              </div>

              {/* Board Control Action Toolbar */}
              <div className="board-actions-bar">
                <button
                  className="action-btn"
                  onClick={handleUndo}
                  disabled={(game.history().length === 0 && fenHistory.length <= 1) || isBotThinking}
                  title="Undo last move (takes back both bot & player moves in bot mode)"
                >
                  <Undo2 size={15} />
                  <span>Undo</span>
                </button>
                <button
                  className={`action-btn ${showTerritoryHeatmap ? "active" : ""}`}
                  onClick={() => {
                    playSound("click");
                    setShowTerritoryHeatmap((prev) => !prev);
                    showToast(
                      showTerritoryHeatmap
                        ? "Square Control Heatmap hidden"
                        : "Square Control & Outposts active"
                    );
                  }}
                  title="Toggle Dynamic Board Territory Heatmap & Center Dominance"
                >
                  <Layers size={15} />
                  <span>
                    {showTerritoryHeatmap
                      ? "Outposts Heatmap On"
                      : "Show Square Control & Outposts (Heatmap)"}
                  </span>
                </button>
                <button
                  className="action-btn hint-btn"
                  onClick={handleRequestHint}
                  disabled={completedGameSummary !== null || isBotThinking || isFetchingHint}
                  title="Ask Coach/Stockfish for the best move recommendation"
                >
                  <Lightbulb size={15} />
                  <span>{isFetchingHint ? "Thinking..." : "Hint"}</span>
                </button>
                <button
                  className="action-btn"
                  onClick={handleFlipBoard}
                  title="Flip board perspective"
                >
                  <FlipHorizontal2 size={15} />
                  <span>Flip</span>
                </button>
                <button
                  className="action-btn"
                  onClick={handleCopyFen}
                  title="Copy current FEN notation"
                >
                  <Copy size={15} />
                  <span>Copy FEN</span>
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleDownloadPgn()}
                  disabled={game.history().length === 0}
                  title="Download game in PGN format"
                >
                  <Download size={15} />
                  <span>PGN</span>
                </button>
                <button
                  className="action-btn new-game-btn"
                  onClick={handleNewGame}
                  title="Reset board to starting position"
                >
                  <RotateCcw size={15} />
                  <span>New Game</span>
                </button>
              </div>
            </div>

            {/* Right Insight Column */}
            <div className="insight-column">
              <CandidateMovesCard
                candidateMoves={tacticalAnalysis?.candidate_moves || []}
                onHoverCandidateMove={setHoveredCandidateMove}
                hoveredUci={hoveredCandidateMove}
              />
              <BlunderRiskMeter
                analysis={analysis}
                tacticalAnalysis={tacticalAnalysis}
                isAnalyzing={isAnalyzing}
                sideToMove={sideToMove}
                isCheck={isCheck}
                moveCount={history.length}
                lastMoveSan={lastMove?.san}
                rating={rating}
                outcome={completedGameSummary}
                coachAdvice={coachAdvice}
                onFetchCoachAdvice={handleFetchCoachAdvice}
                isFetchingCoachAdvice={isFetchingCoachAdvice}
                onHoverCandidateMove={setHoveredCandidateMove}
                onHoverThreatSquare={setHoveredThreatSquare}
              />
              <MoveHistory movePairs={movePairs} />
            </div>
          </div>
        )}

        {/* Game Review Overlay within Arena */}
        {activeTab === "arena" && isReviewingGame && gameReport && (
          <div className="review-workspace">
            <div className="review-top-nav">
              <button
                className="secondary-btn btn-sm"
                onClick={() => {
                  playSound("click");
                  setIsReviewingGame(false);
                }}
                title="Return to the live Tactical Arena board"
              >
                ← Return to Tactical Arena
              </button>
              <span className="review-banner-title">CAPS ACCURACY &amp; MOVE-BY-MOVE REVIEW</span>
            </div>
            <div className="review-main-grid">
              <div className="review-board-wrap">
                <div className="board-wrapper">
                  <EvaluationBar
                    evaluationCentipawns={null}
                    isFlipped={isFlipped}
                  />
                  <div className="board-inner">
                    <Chessboard
                      position={reviewGame.fen()}
                      boardWidth={boardWidth}
                      boardOrientation={isFlipped ? "black" : "white"}
                      customSquareStyles={reviewSquareStyles}
                      customBoardStyle={{
                        borderRadius: "8px",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                      }}
                      customDarkSquareStyle={{ backgroundColor: "#769656" }}
                      customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
                      arePiecesDraggable={false}
                    />
                  </div>
                </div>
              </div>
              <div className="review-panel-wrap">
                <GameReview
                  gameReport={gameReport}
                  selectedPly={selectedReviewPly}
                  onSelectPly={handleSelectReviewPly}
                  onUploadPgn={handleUploadPgn}
                  isUploading={isUploading}
                  onDownloadPracticePositions={handleDownloadPracticeFens}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Trap Dojo */}
        {activeTab === "trap_dojo" && (
          <TrapDrillMode apiUrl={API_URL} />
        )}

        {/* Tab 3: Personal Blunder DNA Behavioral Profiler */}
        {activeTab === "blunder_dna" && (
          <BlunderDnaProfiler
            savedGames={savedGames}
            apiUrl={API_URL}
            onNavigateAcademy={(leakKey) => {
              if (leakKey === "pins") setAcademyPillar("middlegame");
              else if (leakKey === "hanging_pieces") setAcademyPillar("opening");
              else if (leakKey === "overloaded_defenders") setAcademyPillar("defense");
              else if (leakKey === "back_rank") setAcademyPillar("defense");
              else if (leakKey === "time_scramble") setAcademyPillar("endgame");
              else if (leakKey === "pawn_structure") setAcademyPillar("opening");
              else setAcademyPillar("all");
              setActiveTab("academy");
            }}
          />
        )}

        {/* Tab 4: Chess Academy */}
        {activeTab === "academy" && (
          <ChessAcademy
            initialPillar={academyPillar}
            onPracticePosition={(fen, title) => {
              moveRequestIdRef.current++;
              analysisRequestIdRef.current++;
              const loaded = new Chess();
              try {
                loaded.load(fen);
                setGame(loaded);
                setFenHistory([loaded.fen()]);
                setPlayMode("free_lab");
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
                setIsFlipped(loaded.turn() === "b");
                setActiveTab("arena");
                showToast(`Loaded "${title}" in Free Lab`);
                void analyzePosition(loaded);
              } catch {
                showToast("Could not load academy position");
              }
            }}
          />
        )}

        {/* Tab 5: Settings & Archive */}
        {activeTab === "settings" && (
          <SettingsTab
            soundEnabled={soundActive}
            onToggleSound={handleToggleSound}
            boardSize={boardSize}
            onChangeBoardSize={(sz) => {
              setBoardSize(sz);
              localStorage.setItem("chesswise.board-size", sz);
              showToast(`Board scale: ${sz.charAt(0).toUpperCase() + sz.slice(1)}`);
            }}
            savedGames={savedGames}
            onLoadGame={(g) => {
              moveRequestIdRef.current++;
              analysisRequestIdRef.current++;
              const loaded = new Chess();
              try {
                loaded.loadPgn(g.pgn);
                setGame(loaded);
                setFenHistory([loaded.fen()]);
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
                showToast("Match loaded into Tactical Arena");
                void analyzePosition(loaded);
              } catch {
                showToast("Could not parse saved match PGN");
              }
            }}
            onReviewGame={(g) => handleReviewPgn(g.pgn)}
            onDownloadPgn={(g) => handleDownloadPgn(g.pgn)}
            onDeleteGame={(id) => {
              setSavedGames((prev) => prev.filter((g) => g.id !== id));
              showToast("Match removed from archive");
            }}
            onClearAllGames={() => {
              if (window.confirm("Are you sure you want to clear your local match history?")) {
                setSavedGames([]);
                showToast("Archive cleared");
              }
            }}
            modelHealth={modelHealth}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        savedGamesCount={savedGames.length}
        onClearSavedGames={() => {
          setSavedGames([]);
          showToast("Local game history cleared");
        }}
      />
    </div>
  );
}
