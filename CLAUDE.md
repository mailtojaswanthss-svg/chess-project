# ChessWise AI

FastAPI backend (`backend/chess_trainer/`) plus a React 18 / TypeScript / Vite frontend (`frontend/src/`). The backend combines python-chess rules, Stockfish evaluation, a calibrated Random Forest blunder model (`model.py`) and a coach (`coach.py`: Gemini when `GEMINI_API_KEY` is set, deterministic templates otherwise).

## Commands

Run from the repo root unless noted.

- Backend tests: `python -m pytest -q` (`pyproject.toml` puts `backend/` on the path; tests live in `tests/`)
- Coach evals: `cd backend && python -m evals.run_evals` (writes `eval_report.json`)
- API: `uvicorn chess_trainer.api:app --reload --app-dir backend`
- Frontend: `cd frontend && npm ci && npm run dev` (port 5173); typecheck and build with `npm run build`
- Train the model: `chess-train <pgn> --stockfish-path <path>`

## Environment

- `STOCKFISH_PATH` and `MODEL_PATH` come from `.env` (see `.env.example`). `ml/models/*.joblib` is gitignored, so a fresh clone has no model.
- `tests/test_api.py::test_analyze_game_returns_caps_and_badges` and `::test_coach_advice_endpoint` return 503 without a local model or Stockfish. Report them as environment failures; don't paper over them.
- The frontend has no test runner or linter. `npm run build` (`tsc -b` + Vite) is the check.

## Conventions

- Validate every FEN and move sequence with python-chess before committing puzzle, trap or benchmark data (see `.gemini/rules/`).
- Load models once per process through module-level singletons (`get_blunder_model()`); never inside a request handler.
- Don't swallow exceptions silently. The coach path has several `except Exception: pass` blocks that hide real bugs; log or narrow any you touch.
- `/tactical-analysis` and `/coach-advice` in `api.py` duplicate the same analysis pipeline. Change both, or better, extract a shared helper.
- Never invent a number when a backend piece is missing. Analysis endpoints return `null` plus `risk_source` / `eval_source: "unavailable"`; the UI shows "—" with a reason (`components/MetricInfo.tsx`).
- Every % or score in the UI gets a `MetricInfo` ⓘ. Its copy lives in `frontend/src/utils/metricCopy.ts` and must match the backend formula. `winChancesFromEval` there mirrors `_calculate_win_chances` in `api.py`.
- Stockfish runs as one shared process per path (`engine.get_engine`), with each search behind a lock. Don't call `popen_uci` in a request.
- Threat motif names must match between `_detect_tactical_threats` (`api.py`) and the branches in `coach.py` (the coach accepts both `"pinned"` and `"pin"`).

## Frontend structure

- `src/styles/`: `tokens.css` (colour, type, spacing and motion tokens), `base.css`, `layout.css` (`.app-shell`, `.workspace`, and the `.card`, `.btn`, `.pill`, `.segmented`, `.meter` and `.data-table` primitives), `motion.css` (shared keyframes, plus the reduced-motion kill switch). `styles.css` only imports them, and `main.tsx` must import it before `App` so component sheets win the cascade.
- Every component imports its own colocated `<Name>.css`. Use tokens (`var(--accent)`, `var(--card-pad)` and so on) rather than hex values or one-off sizes.
- Grid containers need `grid-template-columns: minmax(0, 1fr)`. Implicit `auto` tracks grow to their widest child and cause sideways scrolling on phones.
- Arena layout: `components/arena/` (`ArenaView` takes slot props; the sidebar cards are `OutlookCard`, `CoachCard`, `ThreatRadarCard`). Review lives in `components/review/`.
- Candidate-move scores from the API are from the side to move's point of view. Convert them to White's before showing an eval.
- Entrance animations use `animation-fill-mode: backwards`, never `both`/`forwards`, when they animate `transform`. A transform that persists on an ancestor of a board becomes the containing block for `position: fixed` children and offsets react-chessboard's drag ghost from the cursor.
- Theme is "Modern slate" in light and dark: light values on `:root` in `styles/tokens.css`, dark under `prefers-color-scheme` (guarded by `:not([data-theme="light"])`) and again under `[data-theme="dark"]`. `utils/useAppearance.ts` stores the choice and the board colour set (`data-board` = green/walnut/ocean); `index.html` applies both before first paint. Never hard-code a colour that only works on one theme: use tokens, `rgb(var(--fg-rgb) / a)` for tints, and `color-mix(in srgb, var(--accent) N%, transparent)` for accent tints. Boards use `var(--board-dark/light)`. Move-quality badge colours in `utils/chessUtils.ts` deliberately follow the usual chess-site convention.
- Type: Bricolage Grotesque for headings (`--font-display`), Figtree for body, JetBrains Mono only for notation and evals. Labels are sentence case (no `text-transform: uppercase`).
- Play layout: the board column holds only the board and player bars (Standard fits the window height, Large fills the width); everything else is in the game panel (`ArenaView` `panelHead` / `sidebar` / `controls`), whose height follows the board via `contain: size`.
- Each arena mode (`PlayMode`) keeps its own game in `sessionsRef` in `App.tsx`; switching modes parks one and restores the other. A rated game's rating is locked until it ends or a new game starts. Trap puzzles (`utils/useTrapPuzzles.ts`) skip engine analysis so the answer isn't shown.

## Skills and MCP

- Project skills live in `.claude/skills/` (see its README). Use `test-driven-development` and `systematic-debugging` for backend bugs, `react-best-practices` and `composition-patterns` for frontend work, and `verification-before-completion` before reporting anything as done.
- `.mcp.json` provides `playwright` (drive the app at http://localhost:5173) and `context7` (current docs for FastAPI, python-chess, scikit-learn, React, chess.js and react-chessboard). Check context7 before relying on memory for library APIs.
