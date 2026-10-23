import { useEffect, useMemo, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Activity,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FlipHorizontal2,
  Gauge,
  Info,
  Loader2,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Undo2,
  Wifi,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
const STARTING_FEN = new Chess().fen();

type Analysis = {
  blunder_probability: number;
  rating: number;
  fen: string;
  risk_band: "low" | "medium" | "high";
  model_samples: number | null;
};

type PlayMode = "coach" | "stockfish" | "trap" | "maia";
type AppTab = "play" | "review" | "games" | "about";

type BotMove = {
  fen: string;
  uci: string;
  san: string;
  evaluation_centipawns: number;
  predicted_blunder_probability?: number;
  evaluation_loss_centipawns?: number;
};

type ModelHealth = {
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
  };
};

type GameReport = {
  headers: Record<string, string>;
  moves: Array<{
    ply: number;
    move_number: number;
    player: "White" | "Black";
    san: string;
    uci: string;
    fen: string;
    probability: number;
    risk_band: "low" | "medium" | "high";
    evaluation_loss_centipawns: number;
    is_blunder: boolean;
  }>;
  blunder_count: number;
  high_risk_count: number;
};

type SavedGame = {
  id: string;
  completedAt: string;
  result: string;
  reason: string;
  moves: string[];
  pgn: string;
};

const ratingOptions = [800, 1000, 1200, 1400, 1600, 1800, 2000];
const SAVED_GAMES_KEY = "chesswise.completed-games";

function riskFor(probability: number) {
  if (probability >= 0.65) {
    return { label: "Top 10% riskiest", tone: "high" };
  }
  if (probability >= 0.35) {
    return { label: "Top 30% riskiest", tone: "medium" };
  }
  return { label: "Normal range", tone: "low" };
}

function gameOutcome(position: Chess) {
  if (position.isCheckmate()) {
    return {
      result: position.turn() === "w" ? "Black wins" : "White wins",
      reason: "Checkmate",
    };
  }
  if (position.isStalemate()) return { result: "Draw", reason: "Stalemate" };
  if (position.isThreefoldRepetition()) return { result: "Draw", reason: "Threefold repetition" };
  if (position.isInsufficientMaterial()) return { result: "Draw", reason: "Insufficient material" };
  if (position.isDrawByFiftyMoves()) return { result: "Draw", reason: "50-move rule" };
  if (position.isDraw()) return { result: "Draw", reason: "Automatic draw" };
  return null;
}

function App() {
  const [game, setGame] = useState(() => new Chess());
  const [rating, setRating] = useState(1200);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedReviewPly, setSelectedReviewPly] = useState<number | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_GAMES_KEY) ?? "[]") as SavedGame[];
    } catch {
      return [];
    }
  });
  const [completedGameSummary, setCompletedGameSummary] = useState<SavedGame | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("coach");
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("about");
  const [isFlipped, setIsFlipped] = useState(false);
  const [engineEvaluation, setEngineEvaluation] = useState<number | null>(null);

  const history = game.history({ verbose: true });
  const risk = riskFor(analysis?.blunder_probability ?? 0);
  const displayProbability = analysis ? Math.round(analysis.blunder_probability * 100) : null;
  const riskReasons = useMemo(() => {
    if (!analysis) return [];
    const reasons: string[] = [];
    if (game.isCheck()) reasons.push("King is in check");
    if (game.moves().length <= 12) reasons.push("Limited legal moves");
    if (history.length && history[history.length - 1].captured) reasons.push("Recent exchange changed the balance");
    if (!reasons.length) reasons.push("Review checks, captures, and opponent threats");
    return reasons.slice(0, 3);
  }, [analysis, game, history]);
  const selectedReviewMove = gameReport?.moves.find((move) => move.ply === selectedReviewPly) ?? null;
  const selectedReviewIndex = selectedReviewMove ? gameReport?.moves.indexOf(selectedReviewMove) ?? -1 : -1;
  const currentOutcome = gameOutcome(game);
  const highlightedSquares = useMemo(() => {
    const move = selectedReviewMove;
    if (!move) {
      const lastMove = history[history.length - 1];
      return lastMove ? {
        [lastMove.from]: { backgroundColor: "rgba(182, 228, 123, .28)" },
        [lastMove.to]: { backgroundColor: "rgba(182, 228, 123, .42)" },
      } : {};
    }
    return {
      [move.uci.slice(0, 2)]: { backgroundColor: "rgba(239, 189, 91, .28)" },
      [move.uci.slice(2, 4)]: { backgroundColor: "rgba(239, 189, 91, .46)" },
    };
  }, [history, selectedReviewMove]);

  useEffect(() => {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(savedGames));
  }, [savedGames]);

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((response) => response.ok ? response.json() as Promise<ModelHealth> : Promise.reject(new Error("Health check failed")))
      .then(setModelHealth)
      .catch(() => setModelHealth(null));
  }, []);
  const movePairs = useMemo(() => {
    const pairs: { number: number; white?: Move; black?: Move }[] = [];
    history.forEach((move, index) => {
      const pair = pairs[pairs.length - 1];
      if (index % 2 === 0 || !pair || pair.black) {
        pairs.push({ number: Math.floor(index / 2) + 1, white: move });
      } else {
        pair.black = move;
      }
    });
    return pairs;
  }, [history]);

  async function analyze(position: Chess = game) {
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: position.fen(), rating }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? "The coach could not analyze this position.");
      }
      setAnalysis((await response.json()) as Analysis);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not connect to the coach.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function onDrop(sourceSquare: Square, targetSquare: Square) {
    const next = new Chess(game.fen());
    try {
      next.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
    } catch {
      return false;
    }
    setGame(next);
    if (gameOutcome(next)) {
      finishGame(next);
    } else if (playMode === "stockfish") {
      void requestEngineMove(next);
    } else {
      void analyze(next);
    }
    return true;
  }

  function finishGame(position: Chess) {
    const outcome = gameOutcome(position);
    if (!outcome) return;
    const completedGame: SavedGame = {
      id: `${Date.now()}`,
      completedAt: new Date().toISOString(),
      result: outcome.result,
      reason: outcome.reason,
      moves: position.history(),
      pgn: position.pgn(),
    };
    setSavedGames((games) => [completedGame, ...games].slice(0, 10));
    setCompletedGameSummary(completedGame);
    setAnalysis(null);
    setEngineEvaluation(null);
    setIsBotThinking(false);
    setTimeout(() => setGame(new Chess()), 900);
  }

  async function requestEngineMove(position: Chess) {
    setIsBotThinking(true);
    setError(null);
    try {
      const endpoint = playMode === "trap" ? "/trap-move" : playMode === "maia" ? "/maia-move" : "/move";
      const requestBody = playMode === "trap"
        ? { fen: position.fen(), rating, tolerance_centipawns: 50 }
        : playMode === "maia"
          ? { fen: position.fen(), rating }
          : { fen: position.fen(), strength: Math.round(rating / 200) };
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "Stockfish could not find a move.");
      const botMove = body as BotMove;
      setEngineEvaluation(botMove.evaluation_centipawns);
      const next = new Chess(position.fen());
      next.move(botMove.uci);
      setGame(next);
      if (gameOutcome(next)) finishGame(next);
      else void analyze(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not ask Stockfish for a move.");
    } finally {
      setIsBotThinking(false);
    }
  }

  function undo() {
    const next = new Chess(game.fen());
    if (!next.undo()) return;
    setGame(next);
    setSelectedReviewPly(null);
    setAnalysis(null);
    setEngineEvaluation(null);
    setCompletedGameSummary(null);
    void analyze(next);
  }

  function reset() {
    const next = new Chess();
    setGame(next);
    setSelectedReviewPly(null);
    setAnalysis(null);
    setEngineEvaluation(null);
    setCompletedGameSummary(null);
    void analyze(next);
  }

  function newGame() {
    setGame(new Chess());
    setSelectedReviewPly(null);
    setAnalysis(null);
    setEngineEvaluation(null);
    setCompletedGameSummary(null);
    setError(null);
  }

  function deleteSavedGame(id: string) {
    setSavedGames((games) => games.filter((savedGame) => savedGame.id !== id));
  }

  function clearSavedGames() {
    setSavedGames([]);
  }

  function downloadSavedGame(savedGame: SavedGame) {
    const blob = new Blob([savedGame.pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chesswise-${savedGame.result.toLowerCase().replace(/ /g, "-")}-${savedGame.id}.pgn`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPracticePositions(report: GameReport) {
    const positions = report.moves
      .filter((move) => move.is_blunder || move.risk_band !== "low")
      .slice(0, 12)
      .map((move) => `Move ${move.move_number}${move.ply % 2 === 1 ? "." : "..."} ${move.san}\nFEN: ${move.fen}\nRisk: ${Math.round(move.probability * 100)}%\n`);
    const blob = new Blob([positions.join("\n") || "No high-risk practice positions found."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chesswise-practice-positions.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function coachingTakeaway(savedGame: SavedGame) {
    if (savedGame.reason === "Checkmate") {
      return "Review the final three moves first. Look for checks, captures, and threats before committing to a move.";
    }
    if (savedGame.reason === "Stalemate") {
      return "Before making a quiet move, check whether your opponent has any legal moves left.";
    }
    if (savedGame.result === "Draw") {
      return "Use this game to practice creating a plan when there is no immediate tactical opportunity.";
    }
    return "Replay the game slowly and compare each move with the coach risk estimate.";
  }

  async function analyzeUploadedGame(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/analyze-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn_text: await file.text(), rating }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? "The game could not be analyzed.");
      setGameReport(body as GameReport);
      setSelectedReviewPly(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not analyze that PGN.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }

  }

  function showReviewPosition(ply: number) {
    if (!gameReport) return;
    const selected = gameReport.moves.find((move) => move.ply === ply);
    if (!selected) return;
    setSelectedReviewPly(ply);
    const selectedGame = new Chess(selected.fen);
    setGame(selectedGame);
    void analyze(selectedGame);
  }

  function moveThroughReview(direction: -1 | 1) {
    if (!gameReport || selectedReviewIndex < 0) return;
    const nextMove = gameReport.moves[selectedReviewIndex + direction];
    if (nextMove) showReviewPosition(nextMove.ply);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Gauge size={19} strokeWidth={2.5} /></div>
          <div>
            <strong>chesswise</strong>
            <span>Risk coach</span>
          </div>
        </div>
        <nav className="main-tabs" aria-label="Main navigation">
          {([
            ["play", "Play"],
            ["review", "Review"],
            ["games", "Games"],
            ["about", "About model"],
          ] as [AppTab, string][]).map(([tab, label]) => (
            <button key={tab} className={activeTab === tab ? "main-tab active" : "main-tab"} onClick={() => setActiveTab(tab)}>{label}</button>
          ))}
        </nav>
        <div className="topbar-actions">
          <div className="engine-dots" title="Stockfish ready · Maia-2 weights not installed"><span className="engine-dot ready" /><span className="engine-dot unavailable" /></div>
          <div className="online-pill"><span className="online-dot" /> Coach online</div>
          <button className="icon-button" aria-label="Settings" onClick={() => setShowSettings((visible) => !visible)}><Settings2 size={18} /></button>
          <div className="avatar">J</div>
        </div>
      </header>
      {showSettings && (
        <section className="settings-panel">
          <div>
            <strong>Coach settings</strong>
            <span>Completed games are stored only in this browser.</span>
          </div>
          <button className="secondary-button" onClick={clearSavedGames} disabled={!savedGames.length}>Clear saved games</button>
        </section>
      )}
      {completedGameSummary && (
        <section className="completion-panel">
          <div className="completion-icon">✓</div>
          <div className="completion-content">
            <div className="card-heading"><span>GAME COMPLETE</span><span className="small-muted">{completedGameSummary.reason}</span></div>
            <h2>{completedGameSummary.result}</h2>
            <p>{completedGameSummary.moves.length} moves played. Your game was saved locally.</p>
            <div className="completion-takeaway"><strong>Coach takeaway</strong><span>{coachingTakeaway(completedGameSummary)}</span></div>
            <div className="completion-actions">
              <button className="secondary-button" onClick={() => downloadSavedGame(completedGameSummary)}>Download PGN</button>
              <button className="primary-button" onClick={() => setCompletedGameSummary(null)}>Start another game</button>
            </div>
          </div>
        </section>
      )}

      <section className="workspace">
        <div className="board-column">
          <div className="board-meta">
            <span className="side-label"><span className="black-piece">♟</span> {playMode === "coach" ? "Coach practice" : `${playMode === "maia" ? "Maia-2" : playMode === "trap" ? "Trap mode" : "Stockfish"} · ${rating}`}</span>
            <span className="turn-count">Move {Math.floor(history.length / 2) + 1}</span>
          </div>
          <div className="board-frame">
            <Chessboard
              key={game.fen()}
              position={game.fen()}
              boardOrientation={isFlipped ? "black" : "white"}
              onPieceDrop={onDrop}
              customSquareStyles={highlightedSquares}
              boardWidth={Math.min(640, 580)}
              customDarkSquareStyle={{ backgroundColor: "#587b69" }}
              customLightSquareStyle={{ backgroundColor: "#e8ead9" }}
              customBoardStyle={{ borderRadius: "12px", overflow: "hidden", boxShadow: "0 28px 60px rgba(0,0,0,.24)" }}
              arePiecesDraggable={!isBotThinking}
            />
          </div>
          <div className="board-actions">
            <button className="secondary-button" onClick={undo} disabled={!history.length}><Undo2 size={16} /> Undo move</button>
            <button className="secondary-button" onClick={() => setIsFlipped((value) => !value)}><FlipHorizontal2 size={16} /> Flip board</button>
            <button className="secondary-button" onClick={newGame}><RotateCcw size={16} /> New game</button>
            <button className="primary-button" onClick={() => void analyze()} disabled={isAnalyzing || isBotThinking}>
              {isAnalyzing ? <Loader2 className="spin" size={16} /> : <Activity size={16} />} {isAnalyzing ? "Reading..." : isBotThinking ? "Engine thinking..." : "Analyze position"}
            </button>
          </div>
          <div className="board-status">
            <div>
              <span className="board-status-label">CURRENT POSITION</span>
              <strong>{currentOutcome ? currentOutcome.result : `${game.turn() === "w" ? "White" : "Black"} to move`}</strong>
            </div>
            <span>{history.length ? `Last move: ${history[history.length - 1].san}` : "Start from the opening position"}</span>
          </div>
        </div>

        <aside className="insight-column">
          {activeTab === "about" && (
            <div className="about-panel tab-panel">
              <div className="card-heading"><span>ABOUT THE MODEL</span><Info size={15} /></div>
              <h2>Risk ranking, not a verdict.</h2>
              <p>Chesswise ranks positions for review using Stockfish-labeled games. It does not promise that a percentage is a guaranteed human blunder probability.</p>
              <div className="metric-grid">
                <div><strong>{modelHealth?.model_metrics?.pr_auc?.toFixed(3) ?? "Unavailable"}</strong><span>PR-AUC</span></div>
                <div><strong>{modelHealth?.model_metrics?.top_decile_lift ? `${modelHealth.model_metrics.top_decile_lift.toFixed(2)}×` : "Unavailable"}</strong><span>Top-10% lift</span></div>
                <div><strong>{modelHealth?.model_metrics?.roc_auc?.toFixed(3) ?? "Unavailable"}</strong><span>ROC-AUC</span></div>
                <div><strong>{modelHealth?.model_train_samples?.toLocaleString() ?? "Unavailable"}</strong><span>Training rows</span></div>
              </div>
              <p className="about-note">Labels use Stockfish depth 8 and a 100 cp engine-mistake threshold. The current evaluation is player-held-out, but the source games are concentrated in four requested accounts.</p>
              <a className="report-link" href="/CHESSWISE_PROJECT_REPORT_FINAL.docx" download><Download size={15} /> Download project report</a>
            </div>
          )}
          {activeTab === "play" && (<>
          <div className={`risk-card ${analysis ? risk.tone : "idle"}`}>
            <div className="card-heading"><span>POSITION RISK</span><span className="assistive-badge"><ShieldCheck size={13} /> Assistive estimate</span></div>
            <div className="risk-number">{displayProbability === null ? "—" : `${displayProbability}%`}</div>
            <div className="risk-label">{analysis ? risk.label : "Ready to analyze"}</div>
            <div className="risk-track"><span style={{ width: `${displayProbability ?? 0}%` }} /></div>
            {analysis ? <ul className="risk-reasons">{riskReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>Make a move or analyze the current position.</p>}
            {engineEvaluation !== null && <div className="eval-bar-wrap"><div className="eval-bar-label"><span>Stockfish evaluation</span><strong>{engineEvaluation > 0 ? "+" : ""}{(engineEvaluation / 100).toFixed(2)}</strong></div><div className="eval-bar"><span style={{ width: `${Math.max(8, Math.min(92, 50 + engineEvaluation / 10))}%` }} /></div></div>}
            <small className="risk-footnote">Not a verdict · compare with checks, captures, and threats.</small>
          </div>

          <div className="control-card">
            <div className="card-heading"><span>TRAINING MODE</span><span className="small-muted">Choose how to play</span></div>
            <div className="mode-buttons">
              <button className={playMode === "coach" ? "mode-button selected" : "mode-button"} onClick={() => setPlayMode("coach")}>Coach only</button>
                      <button className={playMode === "stockfish" ? "mode-button selected" : "mode-button"} onClick={() => setPlayMode("stockfish")}>Stockfish</button>
                      <button className={playMode === "trap" ? "mode-button selected" : "mode-button"} onClick={() => setPlayMode("trap")}>Trap</button>
                      <button className={playMode === "maia" ? "mode-button selected" : "mode-button"} onClick={() => setPlayMode("maia")} disabled title="Maia-2 weights are not installed in this environment">Maia-2 <small>unavailable</small></button>
                    </div>
                    <p className="mode-help">{playMode === "stockfish" ? "Stockfish replies automatically at a bounded search strength." : playMode === "trap" ? "Sound engine moves that seek challenging next positions." : "Make moves freely and rank the current position for review."}</p>
          </div>

          <div className="control-card">
            <div className="card-heading"><span>YOUR PLAYING LEVEL</span><span className="small-muted">Risk context + engine strength</span></div>
            <div className="select-wrap">
              <select value={rating} onChange={(event) => { setRating(Number(event.target.value)); setAnalysis(null); }}>
                {ratingOptions.map((value) => <option key={value} value={value}>{value} rating</option>)}
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
          </>)}

          {activeTab === "play" && <div className="history-card">
            <div className="card-heading"><span>MOVE HISTORY</span><span className="small-muted">{history.length} moves</span></div>
            <div className="move-list">
              {movePairs.length === 0 && <div className="empty-history">Your moves will appear here.</div>}
              {movePairs.map((pair) => (
                <div className="move-row" key={pair.number}>
                  <span className="move-number">{pair.number}.</span>
                  <span>{pair.white?.san}</span>
                  <span>{pair.black?.san ?? "…"}</span>
                </div>
              ))}
            </div>
          </div>}

          {activeTab === "review" && <div className="control-card game-review-card">
            <div className="card-heading"><span>GAME REVIEW</span><span className="small-muted">Local PGN</span></div>
            <label className="upload-button">
              <input type="file" accept=".pgn,text/plain" onChange={analyzeUploadedGame} disabled={isUploading} />
              {isUploading ? "Analyzing game…" : "Choose a PGN to review"}
            </label>
            {gameReport && (
              <div className="review-summary">
                <strong>{gameReport.headers.White ?? "White"} vs {gameReport.headers.Black ?? "Black"}</strong>
                <span>{gameReport.moves.length} plies · {gameReport.blunder_count} confirmed engine blunders</span>
                <span>{gameReport.high_risk_count} high-risk moments predicted · each card names the player</span>
                <div className="review-navigator">
                  <button
                    className="secondary-button"
                    onClick={() => moveThroughReview(-1)}
                    disabled={selectedReviewIndex <= 0}
                    aria-label="Previous reviewed move"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span>
                    {selectedReviewMove ? `${selectedReviewMove.player} · move ${selectedReviewMove.move_number}${selectedReviewMove.ply % 2 === 1 ? "." : "…"} ${selectedReviewMove.san}` : "Choose a moment below"}
                  </span>
                  <button
                    className="secondary-button"
                    onClick={() => moveThroughReview(1)}
                    disabled={selectedReviewIndex < 0 || selectedReviewIndex >= gameReport.moves.length - 1}
                    aria-label="Next reviewed move"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
                {selectedReviewMove && (
                  <div className="review-detail">
                    <span>{selectedReviewMove.player}'s move · {selectedReviewMove.is_blunder ? "Confirmed engine blunder" : `${Math.round(selectedReviewMove.probability * 100)}% predicted risk`}</span>
                    <small>{selectedReviewMove.evaluation_loss_centipawns} cp evaluation loss · position before {selectedReviewMove.player}'s move</small>
                  </div>
                )}
                <div className="review-moments">
                  {gameReport.moves.map((move) => (
                    <button
                      className={`moment-button ${move.risk_band} ${move.is_blunder ? "confirmed" : ""} ${selectedReviewPly === move.ply ? "selected" : ""}`}
                      key={move.ply}
                      onClick={() => showReviewPosition(move.ply)}
                    >
                      <span>{move.move_number}{move.ply % 2 === 1 ? "." : "…"} {move.player[0]} · {move.san}</span>
                      <small>{move.is_blunder ? "Blunder" : `${Math.round(move.probability * 100)}% risk`}</small>
                    </button>
                  ))}
                </div>
                <div className="review-report">
                  <strong>Coach report</strong>
                  <span>{gameReport.moves.filter((move) => move.is_blunder).length} confirmed mistakes · {gameReport.moves.filter((move) => move.risk_band !== "low").length} moments worth practicing</span>
                  <button className="secondary-button" onClick={() => downloadPracticePositions(gameReport)}>Download practice positions</button>
                </div>
              </div>
            )}
          </div>}

          {activeTab === "games" && <div className="control-card saved-games-card">
            <div className="card-heading"><span>SAVED GAMES</span><span className="small-muted">{savedGames.length}/10</span></div>
            {savedGames.length === 0 && <div className="empty-history">Completed games will appear here.</div>}
            <div className="saved-game-list">
              {savedGames.map((savedGame) => (
                <div className="saved-game" key={savedGame.id}>
                  <div><strong>{savedGame.result}</strong><span>{savedGame.reason} · {savedGame.moves.length} moves</span><small>{new Date(savedGame.completedAt).toLocaleString()}</small></div>
                  <div className="saved-game-actions">
                    <button className="icon-button" onClick={() => downloadSavedGame(savedGame)} aria-label={`Download ${savedGame.result} game`}>↓</button>
                    <button className="icon-button" onClick={() => deleteSavedGame(savedGame.id)} aria-label={`Delete ${savedGame.result} game`}>×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>}

          {error && <div className="error-banner"><Wifi size={16} /><span>{error}</span></div>}
          {activeTab === "about" && <div className="model-status"><span className="status-check">✓</span><span><b>Coach model ready</b><small>Player-held-out ranking diagnostics · {modelHealth?.model_train_samples?.toLocaleString() ?? "—"} training samples</small></span></div>}
        </aside>
      </section>
      <footer><span>Chesswise v0.1</span><span>Built for thoughtful practice <span className="heart">♥</span></span></footer>
    </main>
  );
}

export default App;
