# Chesswise â€” Work Update

## 1. Project overview

This project is a chess training application called **Chesswise**.

The main idea is:

1. Collect real chess games from Lichess.
2. Use Stockfish to identify moves that lose too much chess evaluation.
3. Use those examples to train a machine-learning model.
4. Let a user interact with a chessboard.
5. Predict the chance that a player may blunder in the current position.
6. Present the prediction in a simple, friendly coaching interface.

The current project is a working **backend + machine-learning + interactive frontend prototype**.

It is not yet the complete long-term product. Maia-2 gameplay, trap mode, complete-game coach reports, user accounts, and production deployment are future stages.

---

## 2. What has been completed

The following parts are currently implemented:

- Python project setup
- Virtual environment
- FastAPI backend
- Stockfish integration
- Lichess PGN downloading
- PGN parsing
- Chess position feature extraction
- Stockfish-based blunder labeling
- Random forest machine-learning model
- Model saving and loading
- Model metadata
- Multi-user Lichess data collection
- Duplicate-game removal
- Dataset manifest generation
- Health API endpoint
- Prediction API endpoint
- CORS support for the frontend
- React/Vite/TypeScript frontend
- Interactive chessboard
- Legal drag-and-drop moves
- Move history
- Undo and reset controls
- Rating selection
- Blunder-risk display
- Low, medium, and high risk states
- Loading and error states
- Responsive layout
- Automated backend tests
- Successful frontend production build
- README setup documentation
- Previous/next navigation through every move in a PGN review
- Selected-review details showing predicted risk and engine evaluation loss
- Game-ending detection for checkmate and draw conditions
- Local browser storage for completed games, including moves and PGN
- Automatic board reset after a completed game
- Full move-by-move PGN review with selected-move board highlighting
- Downloadable PGN files for locally saved completed games
- Post-game completion summary with result, takeaway, and next-game action
- Logistic-regression baseline and Brier calibration score in training reports
- Model validation metrics exposed through the health endpoint
- Stockfish opponent `/move` endpoint with bounded strength
- Frontend training-mode switch for coach-only play or automatic Stockfish replies
- Experimental trap mode using sound Stockfish candidates and predicted next-position risk
- Optional Maia-2 adapter with explicit dependency/setup errors
- Calibration error (ECE) in model metrics
- Docker backend image with system Stockfish
- Review coach report with downloadable high-risk practice positions
- Visible validation accuracy and training-sample status in the frontend
- Docker Compose stack for the API and production frontend
- Expanded verified dataset: 1,038 public games and 90,177 labeled positions
- Expanded uncalibrated model retained as a comparison artifact: 78.0% validation accuracy and 0.680 ROC-AUC
- Isolated Python 3.11 Maia environment with `maia2` and CPU PyTorch installed
- Final audit completed: live app, expanded model, Stockfish, trap mode, tests, and frontend build verified
- Calibrated classifier, cross-validated F1 decision threshold, hanging-piece feature, opponent mobility, and major-piece balance added
- PR-AUC, top-decile lift, Brier skill versus the base rate, and grouped game-bootstrap confidence intervals are written to models\\blunder_model.metrics.json and loaded into the active model metadata. The old 0.348 threshold was removed; the product presents risk as a ranking rather than a hard classifier.

---

## 3. Technology used

### Backend language

The backend uses **Python**.

Python was selected because it has strong libraries for:

- Chess programming
- Machine learning
- Data processing
- API development

### Python libraries

#### `python-chess`

Used for:

- Reading PGN files
- Representing chess boards
- Generating legal moves
- Converting positions to FEN
- Reading move history
- Applying moves to a board

#### `chess.engine`

Used through `python-chess` to communicate with Stockfish using the UCI chess-engine protocol.

#### Stockfish

Stockfish is a strong chess engine.

It is used as the labeling authority during training:

- Evaluate the position before a played move.
- Apply the played move.
- Evaluate the resulting position.
- Compare the two evaluations.
- Mark the move as a blunder if the evaluation loss passes the selected threshold.

The current threshold is:

```text
100 centipawns
```

One hundred centipawns is approximately one pawn of evaluation loss.

#### `scikit-learn`

Used for:

- Random forest classification
- Accuracy calculation
- ROC-AUC calculation
- Train/test evaluation

#### `joblib`

Used to save and load the trained machine-learning model.

#### FastAPI

Used to create the backend HTTP API.

#### Uvicorn

Used to run the FastAPI application locally.

### Frontend libraries

#### React

Used to build the interactive user interface from reusable components.

#### Vite

Used as the frontend development server and production build tool.

#### TypeScript

Used to add type safety to the frontend.

#### `chess.js`

Used in the browser for:

- Legal move validation
- Board state management
- Move history
- FEN generation

#### `react-chessboard`

Used to render the interactive chessboard.

#### `lucide-react`

Used for interface icons such as:

- Analyze
- Undo
- Reset
- Settings
- Activity
- Connection status

---

## 4. Project structure

Important project files:

```text
D:\Chess project
â”‚
â”œâ”€â”€ README.md
â”œâ”€â”€ WORK_UPDATE.md
â”œâ”€â”€ pyproject.toml
â”œâ”€â”€ .env
â”œâ”€â”€ .env.example
â”‚
â”œâ”€â”€ src
â”‚   â””â”€â”€ chess_trainer
â”‚       â”œâ”€â”€ __init__.py
â”‚       â”œâ”€â”€ api.py
â”‚       â”œâ”€â”€ cli.py
â”‚       â”œâ”€â”€ config.py
â”‚       â”œâ”€â”€ dataset.py
â”‚       â”œâ”€â”€ engine.py
â”‚       â”œâ”€â”€ features.py
â”‚       â”œâ”€â”€ ingest.py
â”‚       â””â”€â”€ model.py
â”‚
â”œâ”€â”€ tests
â”‚   â”œâ”€â”€ test_api.py
â”‚   â”œâ”€â”€ test_features.py
â”‚   â”œâ”€â”€ test_ingest.py
â”‚   â””â”€â”€ test_model.py
â”‚
â”œâ”€â”€ frontend
â”‚   â”œâ”€â”€ package.json
â”‚   â”œâ”€â”€ index.html
â”‚   â”œâ”€â”€ vite.config.ts
â”‚   â”œâ”€â”€ tsconfig.json
â”‚   â””â”€â”€ src
â”‚       â”œâ”€â”€ App.tsx
â”‚       â”œâ”€â”€ main.tsx
â”‚       â”œâ”€â”€ styles.css
â”‚       â””â”€â”€ vite-env.d.ts
â”‚
â”œâ”€â”€ data
â”‚   â””â”€â”€ raw
â”‚       â”œâ”€â”€ games.pgn
â”‚       â”œâ”€â”€ josecalvo.pgn
â”‚       â”œâ”€â”€ multi_user_games.pgn
â”‚       â””â”€â”€ multi_user_games.manifest.json
â”‚
â”œâ”€â”€ models
â”‚   â””â”€â”€ blunder_model.joblib
â”‚
â””â”€â”€ tools
    â””â”€â”€ stockfish
```

The `.venv` directory contains the local Python environment and is not part of the application source.

---

## 5. Step-by-step: how the data pipeline works

### Step 1: Download games from Lichess

The project can download games belonging to public Lichess usernames.

The command is:

```powershell
chess-download "josecalvo Jazz716" `
  --output data/raw/multi_user_games.pgn `
  --max-games 100
```

The command:

1. Splits the usernames.
2. Requests public PGN data from the Lichess API.
3. Reads the returned games.
4. Parses each game with `python-chess`.
5. Creates a fingerprint for each game.
6. Removes duplicate games.
7. Writes one combined PGN file.
8. Writes a JSON manifest containing download results.

### Step 2: Current downloaded data

The current usernames and results were:

```text
josecalvo: 37 games
Jazz716: 1 game
```

The combined file is:

```text
data/raw/multi_user_games.pgn
```

The manifest is:

```text
data/raw/multi_user_games.manifest.json
```

The combined dataset contains:

```text
38 games
1,975 labeled positions
```

The game count and position count are different because one game contains many individual moves, and each move produces one training example.

### Step 3: Read every game

For every game, the program starts with the initial chess position.

For every mainline move:

1. Save the board position before the move.
2. Extract features from that position.
3. Ask Stockfish to evaluate the position.
4. Apply the played move.
5. Ask Stockfish to evaluate the new position.
6. Calculate the evaluation loss.
7. Convert that loss into a label:
   - `0` means not a blunder according to the threshold.
   - `1` means a blunder according to the threshold.
8. Move to the next position.

### Step 4: Extract features

The current model uses numeric features such as:

- Player rating
- Side to move
- Material balance
- Number of legal moves
- Whether the side to move is in check
- Castling-right availability
- Halfmove clock
- White pawn count
- Black pawn count
- White king safety attackers
- Black king safety attackers

These features are deliberately simple and explainable.

They are not intended to replace a strong chess engine. They provide the random forest with information about the position and the player's approximate rating.

### Step 5: Label the move using Stockfish

A move loses evaluation when the position becomes worse for the player who moved.

For example:

```text
Evaluation before move: +0.20 from the player's perspective
Evaluation after move:  -1.10 from the player's perspective
Loss:                    1.30 pawns
```

Since the loss is greater than the 1.00-pawn threshold, the move is labeled as a blunder.

The engine depth can be selected when training. The latest model was trained with:

```text
Stockfish depth: 8
```

Higher depth can provide stronger labels but takes longer.

---

## 6. Step-by-step: how the machine-learning model works

### Step 1: Split the data by game

The program uses a game-level split instead of randomly splitting individual positions.

This is important because positions from the same game are related. If positions from one game appeared in both training and validation, the validation score could look better than the model's real generalization ability.

### Step 2: Train the random forest

The model uses `RandomForestClassifier`.

A random forest:

1. Builds many decision trees.
2. Gives each tree slightly different training samples/features.
3. Combines their predictions.
4. Produces a probability for the blunder class.

The model uses:

- 200 trees
- Balanced class weights
- Fixed random seed
- A minimum leaf size of 2

The balanced class weight is useful because blunders are less common than non-blunders.

### Step 3: Save the model

The model is saved to:

```text
models/blunder_model.joblib
```

The saved model includes:

- The random forest classifier
- Feature schema
- Training sample metadata

The API checks the feature schema before using a model.

### Step 4: Evaluate the model

The training command reports:

- Validation sample count
- Positive blunder rate
- Accuracy
- Majority-class baseline
- ROC-AUC

The current result is:

```text
Training samples: 1,542
Validation samples: 433
Validation positive rate: 22.6%
Accuracy: 65.1%
Majority baseline: 77.4%
ROC-AUC: 0.599
```

### What this result means

The pipeline works technically, but the model is not yet a reliable coach.

The majority baseline predicts the most common class every time. Because most positions are not labeled as blunders, that simple baseline gets 77.4% accuracy.

The random forest gets 65.1% accuracy, which is lower.

The ROC-AUC of about 0.599 is only slightly better than random ranking. This means the current model needs:

- More diverse games
- Better feature design
- Better evaluation
- More careful calibration
- Possibly a different model

The application should present its output as an assistive estimate, not as a guaranteed truth.

---

## 7. Backend API

The backend is implemented in:

```text
src/chess_trainer/api.py
```

### Health endpoint

Request:

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "model_loaded": true,
  "model_train_samples": 1542
}
```

This lets the frontend know:

- Whether the backend is alive.
- Whether a model exists.
- How many training samples were used.

### Prediction endpoint

Request:

```http
POST /predict
```

Example body:

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "rating": 1200
}
```

Example response:

```json
{
  "blunder_probability": 0.003708598450064859,
  "rating": 1200,
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "risk_band": "low",
  "model_samples": 1542
}
```

### Risk bands

The API maps the probability to a simple band:

```text
0.00â€“0.34  low
0.35â€“0.64  medium
0.65â€“1.00  high
```

These boundaries are product-level presentation thresholds. They are not yet calibrated psychological or statistical guarantees.

### CORS

CORS is enabled for:

```text
http://localhost:5173
http://127.0.0.1:5173
```

This allows the Vite frontend to call the FastAPI backend during local development.

---

## 8. Frontend

The frontend is in:

```text
frontend/
```

The main component is:

```text
frontend/src/App.tsx
```

### Current user flow

1. The user opens the Chesswise page.
2. The starting chess position appears.
3. The user chooses a playing rating.
4. The user drags a piece to make a legal move.
5. `chess.js` validates the move.
6. The board updates.
7. The frontend converts the board to FEN.
8. The frontend sends the FEN and rating to `/predict`.
9. The backend returns a probability and risk band.
10. The frontend updates the risk card.

### Current interface sections

#### Header

Shows:

- Chesswise branding
- Coach online state
- Settings icon
- User avatar placeholder

#### Hero section

Explains the purpose of the tool in a friendly way:

```text
Make your next move with confidence.
```

It also tells the user that the result is an assistive estimate, not a verdict.

#### Chessboard

The board supports:

- Piece dragging
- Legal move validation
- Board state updates
- Responsive sizing

#### Board controls

Available controls:

- Undo move
- Reset board
- Analyze position

#### Risk card

Shows:

- Risk percentage
- Low/medium/high label
- Colored progress bar
- Plain-language coaching message

#### Playing-level selector

The user can choose:

```text
800, 1000, 1200, 1400, 1600, 1800, 2000
```

The selected rating is sent to the backend as context.

#### Move history

Shows the moves made in the current browser session.

#### Model status

Shows that the model is ready and includes the training sample count when a prediction has been returned.

### Visual design

The current interface uses:

- Dark navy background
- Sage green primary accent
- Warm cream and muted green chessboard colors
- Rounded cards
- Calm coaching language
- Responsive layout
- Accessible text contrast

The Figma workspace was connected and inspected as visual reference. The working source of truth remains the repository frontend.

---

## 9. How to run the project

### Start the backend

Open PowerShell:

```powershell
cd "D:\Chess project"
.\.venv\Scripts\Activate.ps1
uvicorn chess_trainer.api:app --reload
```

The backend runs at:

```text
http://127.0.0.1:8000
```

### Start the frontend

Open a second PowerShell window:

```powershell
cd "D:\Chess project\frontend"
npm run dev
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

### Run backend tests

```powershell
cd "D:\Chess project"
.\.venv\Scripts\python.exe -m pytest -q
```

Current result:

```text
6 passed
```

### Build the frontend

```powershell
cd "D:\Chess project\frontend"
npm run build
```

Current result:

```text
vite build successful
```

---

## 10. What is not completed yet

These features are not implemented:

- Maia-2 opponent
- Human-versus-AI game mode
- Trap mode
- Complete-game upload and analysis
- Coach report after a game
- Similar practice positions
- Move-by-move evaluation timeline
- FEN import control
- Board orientation control
- User authentication
- Database storage
- Cloud deployment
- Production monitoring
- Calibrated probability guarantees
- A large, representative training dataset

---

## 11. Recommended next steps

### Priority 1: Collect more varied games

The current data comes from only two usernames. A better dataset should include:

- Many public users
- Multiple rating ranges
- Rapid and classical games
- Different opening choices
- More positions from both winning and losing games

Example:

```powershell
chess-download "user1 user2 user3 user4 user5" `
  --output data/raw/multi_user_games.pgn `
  --max-games 100
```

Then retrain:

```powershell
chess-train data/raw/multi_user_games.pgn `
  --output models/blunder_model.joblib `
  --stockfish-path $env:STOCKFISH_PATH `
  --depth 8
```

### Priority 2: Improve evaluation

Add:

- Precision
- Recall
- F1 score
- Confusion matrix
- Precision-recall curve
- Probability calibration
- Cross-validation by game
- Cross-validation by user
- Feature importance report

### Priority 3: Improve the model

Potential improvements:

- More meaningful tactical and positional features
- Opening phase/middlegame/endgame features
- Checks, captures, and threats
- King safety features
- Piece activity
- Pawn structure
- Material imbalance
- Gradient boosting comparison
- Logistic regression baseline
- Calibration methods

### Priority 4: Improve the frontend

Add:

- FEN import
- Board orientation
- Last-move highlighting
- Better position navigation
- Move evaluation timeline
- â€œWhy is this risky?â€ explanation
- Model metrics panel
- Session save/load
- More polished mobile behavior

### Priority 5: Build complete-game coaching

The user could upload a PGN and receive:

1. A list of high-risk positions.
2. The moves that were played.
3. Stockfish loss for each move.
4. Predicted risk before each move.
5. Missed opportunities.
6. Practice positions grouped by theme.

### Priority 6: Add Maia-2 later

Maia-2 gameplay should be added only after the analysis foundation is stable.

The later gameplay stage can provide:

- Human-like opponent
- Chosen opponent rating
- Playable game
- Move history
- Post-game risk analysis

Trap mode should come after both the predictor and gameplay flow are reliable.

---

## 12. Final status at the end of this work session

The project currently has:

```text
Working backend:              Yes
Stockfish integration:        Yes
Training pipeline:            Yes
Multi-user downloader:        Yes
Trained model:                Yes
Prediction API:               Yes
Interactive frontend:         Yes
Frontend/backend connection:  Yes
Backend tests:                6 passing
Frontend production build:    Passing
Figma workspace reference:    Connected
```

The most important limitation is model quality. The application is ready for continued development, but its predictions should currently be treated as an experimental training signal rather than a trustworthy chess verdict.

Work is paused here. Continue from this document in the next session.

---

## 13. Next-phase progress update

The next implementation phase has now started and the following additions are complete:

- Added `POST /analyze-game` for local PGN text analysis.
- Added move-level results containing FEN, SAN, UCI, predicted risk, risk band, Stockfish loss, and blunder label.
- Added game-level counts for confirmed blunders and high-risk moments.
- Added a frontend local PGN chooser under **Game review**.
- Added precision, recall, and F1 reporting to model training.
- Stored richer evaluation metadata inside newly trained models.
- Added a focused PGN analysis unit test and endpoint validation test.
- Refreshed the model using the combined public-user dataset.

The refreshed model reported:

```text
Validation samples: 433
Positive rate: 22.6%
Accuracy: 65.1%
Majority baseline: 77.4%
ROC-AUC: 0.599
Precision: 0.288
Recall: 0.367
F1: 0.323
```

The complete-game workflow is still intentionally local and synchronous. A later iteration should add progress handling, move navigation/highlighting, calibration, and a larger/more diverse dataset before Maia-2 or trap mode.

## 14. Current continuation session

The local servers are currently running:

```text
Backend:  http://127.0.0.1:8000
Frontend: http://127.0.0.1:5173
```

The frontend now lets a user select a local PGN and click through predicted non-low-risk moments. Selecting a moment loads its FEN onto the board and requests the regular position analysis for that position.

I also reviewed public, legal technical resources about Stockfish and centipawns:

- [Chess Programming Wiki â€” Stockfish](https://www.chessprogramming.org/Stockfish)
- [Chess Programming Wiki â€” Centipawns](https://www.chessprogramming.org/Centipawns)

An attempt was made to collect more public Lichess accounts, but the remote export service reset the connections during this session. No fake or duplicated games were added, and the model was not falsely reported as improved. The existing 1,975-position dataset and its model remain the verified training baseline until new downloads succeed.

