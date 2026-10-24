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
- Threat motif names must match between `_detect_tactical_threats` (`api.py`) and the branches in `coach.py` (today: `"pinned"` vs `"pin"`).

## Skills and MCP

- Project skills live in `.claude/skills/` (see its README). Use `test-driven-development` and `systematic-debugging` for backend bugs, `react-best-practices` and `composition-patterns` for frontend work, and `verification-before-completion` before reporting anything as done.
- `.mcp.json` provides `playwright` (drive the app at http://localhost:5173) and `context7` (current docs for FastAPI, python-chess, scikit-learn, React, chess.js and react-chessboard). Check context7 before relying on memory for library APIs.
