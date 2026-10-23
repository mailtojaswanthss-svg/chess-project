<div align="center">

# ♟️ ChessWise

### An Intelligent Chess Coaching & Blunder-Risk Prediction Platform

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5%2B-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Stockfish](https://img.shields.io/badge/Engine-Stockfish%2016-teal)](https://stockfishchess.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**ChessWise** is an end-to-end chess training platform combining calibrated machine learning with engine analysis to identify, explain, and exploit blunder risks in human play. 

</div>

---

## 🌟 Key Features

- **🎯 Predictive Blunder Risk Modeling:**
  - Evaluates board positions using a trained classifier (Random Forest with probability calibration) conditioned on player rating, piece coordination, material imbalances, and tactical tension.
  - Predicts blunder probabilities and categorizes moves into clear risk bands (`low`, `moderate`, `high`, `extreme`).
- **🎮 Multiple Interactive Game Modes:**
  - **Coach Mode:** Free-play sandbox providing real-time blunder-risk feedback, evaluation updates, and tactical diagnostics.
  - **Play Stockfish:** Full gameplay against Stockfish with strength levels scaling search depth.
  - **Experimental Trap Mode:** AI opponent that searches sound moves (within a centipawn tolerance) that maximize the human opponent's predicted blunder probability.
  - **Optional Maia-2 Opponent:** Integrated neural network engine simulating human-like moves across distinct Elo rating targets.
- **📊 In-Depth PGN Game Review:**
  - Upload or paste standard PGN files for complete post-game analysis.
  - Step through moves with interactive board synchronization, highlighted origins/destinations, centipawn loss graphs, and mistake tallies.
  - Export custom practice position sets (FEN) from critical game moments.
- **🎨 Modern Dark-Themed Coaching UI:**
  - Built with React 18, Vite, TypeScript, `react-chessboard`, and `chess.js`.
  - Game archival in browser local storage, move history tracking, PGN download, and responsive layout.
- **🐳 Container & One-Click Deployment:**
  - Docker and Docker Compose configuration for both frontend and backend services.
  - Windows quick-launch scripts (`start-chesswise.bat` / `start-chesswise.ps1`) for frictionless local operation.

---

## 🛠️ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend & ML** | Python 3.11+, FastAPI, Uvicorn, `python-chess`, `scikit-learn`, `joblib`, `NumPy`, `Pydantic` |
| **Chess Engines** | Stockfish 16+ (UCI protocol), Maia-2 (PyTorch human-aligned model) |
| **Frontend** | React 18, TypeScript, Vite, `react-chessboard`, `chess.js`, Lucide React |
| **DevOps & Tooling**| Docker, Docker Compose, Pytest, Pytest-Cov |

---

## 📂 Project Structure

```text
Chess project/
├── .github/                     # CI/CD workflows and repository metadata
├── data/                        # Datasets (ignored in Git; tracked via .gitkeep)
│   ├── raw/                     # Downloaded Lichess PGN archives
│   └── processed/               # Extracted tabular feature sets
├── frontend/                    # Interactive web dashboard (React + Vite + TypeScript)
│   ├── public/                  # Static assets and sounds
│   ├── src/                     # React components, chess hooks, board logic
│   ├── package.json             # Frontend dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── vite.config.ts           # Vite build configuration
├── models/                      # ML model artifacts (metadata tracked; large binaries ignored)
│   ├── blunder_model.metrics.json # Evaluation benchmarks and threshold configuration
│   └── .gitkeep
├── maia2_models/                # Storage for optional Maia-2 weights
├── scripts/                     # Utility scripts and report generators
│   └── generate_report.py       # Metrics and validation report compiler
├── src/                         # Core Python package
│   └── chess_trainer/           # Application modules
│       ├── analysis.py          # PGN game parsing and risk categorizations
│       ├── api.py               # FastAPI application endpoints
│       ├── cli.py               # CLI utilities (chess-train, chess-download)
│       ├── config.py            # Pydantic environment settings
│       ├── dataset.py           # Feature extraction & dataset generation
│       ├── engine.py            # Stockfish UCI wrapper and centipawn scoring
│       ├── features.py          # Domain-specific chess feature extraction
│       ├── ingest.py            # Lichess API downloader and deduplication
│       ├── maia.py              # Maia-2 engine adapter
│       └── model.py             # BlunderModel training and inference logic
├── tests/                       # Automated test suite (Pytest)
├── tools/                       # Local binaries (e.g. Stockfish executable)
├── .env.example                 # Template environment variables
├── .gitignore                   # Multi-tier Git exclusion rules
├── docker-compose.yml           # Multi-container orchestration
├── Dockerfile                   # Backend Docker containerization
├── LICENSE                      # MIT License
├── pyproject.toml               # Python project configuration & packaging
├── README.md                    # Project documentation
├── requirements.txt             # Core Python dependencies
├── requirements-dev.txt         # Development & testing dependencies
├── start-chesswise.bat          # One-click Windows startup batch script
└── stop-chesswise.bat           # One-click shutdown script
```

---

## 🚀 Getting Started

### Prerequisites

1. **Python 3.11+** installed on your system.
2. **Node.js (v18+) & npm** for the frontend.
3. **Stockfish Engine:** Download the Stockfish executable for your operating system from [official Stockfish releases](https://stockfishchess.org/download/).

---

### Step 1: Clone & Configure

```bash
git clone https://github.com/<your-username>/chess-project.git
cd chess-project

# Create your local environment configuration
cp .env.example .env
```

Edit `.env` to point `STOCKFISH_PATH` to your local Stockfish executable:
```env
STOCKFISH_PATH=C:/path/to/stockfish/stockfish-windows-x86-64-avx2.exe
MODEL_PATH=models/blunder_model.joblib
BLUNDER_LOSS_CENTIPAWNS=100
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### Step 2: Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies in editable mode
pip install -e ".[dev]"
# Or using requirements:
pip install -r requirements-dev.txt
```

---

### Step 3: Frontend Setup

```bash
cd frontend
npm install
cd ..
```

---

## 💻 Running the Application

### Option A: One-Click Windows Launcher
Double-click `start-chesswise.bat` (or execute `.\start-chesswise.ps1` in PowerShell). This launches both the FastAPI backend (port 8000) and the Vite frontend (port 5173) and opens the web application in your default browser.

To gracefully stop both services, execute `stop-chesswise.bat`.

---

### Option B: Manual Local Startup

**Terminal 1 (Backend):**
```bash
.\.venv\Scripts\Activate.ps1
uvicorn chess_trainer.api:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Visit **`http://127.0.0.1:5173`** in your browser.

---

### Option C: Docker Compose

```bash
docker compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`

---

## 🧠 Training & Data Pipeline

You can collect games from public Lichess players and train the model from scratch:

```bash
# 1. Download games from Lichess users:
chess-download "username1 username2" --output data/raw/training_games.pgn --max-games 200

# 2. Extract features and train the model:
chess-train data/raw/training_games.pgn --output models/blunder_model.joblib --stockfish-path $env:STOCKFISH_PATH --depth 8
```

The training pipeline outputs comprehensive evaluation diagnostics including:
- **Baseline Comparisons:** Majority class baseline & Logistic Regression baseline.
- **Metrics:** Precision, Recall, F1-Score, ROC-AUC (game-bootstrap 95% CI), PR-AUC, and Top-Decile Lift.
- **Probability Calibration:** Expected Calibration Error (ECE) and Brier Skill score.

---

## 🧪 Testing

Execute the automated test suite with coverage:

```bash
pytest tests/ -v
```

---

## 📡 REST API Reference

The backend provides OpenAPI interactive documentation at `http://127.0.0.1:8000/docs`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, model status, and benchmark metrics |
| `POST` | `/predict` | Predict blunder probability for a given FEN and rating |
| `POST` | `/move` | Calculate best Stockfish move at specified strength |
| `POST` | `/trap-move` | Generate sound candidate move maximizing opponent blunder risk |
| `POST` | `/maia-move` | Human-like engine move via Maia-2 model |
| `POST` | `/analyze-game` | Batch analysis of full PGN games with move-by-move metrics |

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🤝 Acknowledgments

- [Stockfish Engine](https://stockfishchess.org/) — World-class open-source chess engine.
- [python-chess](https://python-chess.readthedocs.io/) — Pure Python chess library with UCI support.
- [Lichess.org](https://lichess.org/) — Open chess database and public API.
- [Chess Programming Wiki](https://www.chessprogramming.org/) — Conceptual foundation for computer chess and evaluation.
