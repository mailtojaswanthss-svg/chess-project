import chess
import numpy as np
import pytest
from fastapi.testclient import TestClient

from chess_trainer import api
from chess_trainer.api import app
from chess_trainer.config import settings
from chess_trainer.model import BlunderModel


class FakeClassifier:
    def __init__(self, probability: float = 0.2):
        self.probability = probability

    def predict_proba(self, features):
        return np.array([[1.0 - self.probability, self.probability]])


class FakeEvaluator:
    """Stands in for Stockfish: always prefers e4, then d4, then Nf3."""

    def __init__(self, path, depth=12):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return None

    def score(self, board):
        return 0

    def best_move(self, board):
        return next(iter(board.legal_moves)), 0

    def candidate_moves(self, board, count=5):
        preferred = [chess.Move.from_uci(uci) for uci in ("e2e4", "d2d4", "g1f3")]
        moves = [m for m in preferred if m in board.legal_moves] or list(board.legal_moves)
        return [(move, 30 - 10 * index) for index, move in enumerate(moves[:count])]


@pytest.fixture
def no_backends(monkeypatch, tmp_path):
    """No trained model and no Stockfish, as on a fresh clone."""
    monkeypatch.setattr(settings, "model_path", tmp_path / "missing.joblib")
    monkeypatch.setattr(settings, "stockfish_path", None)
    monkeypatch.setattr(api, "_model_instance", None)


def _install_fake_backends(monkeypatch, tmp_path, probability):
    model_file = tmp_path / "model.joblib"
    model_file.touch()
    engine_file = tmp_path / "stockfish"
    engine_file.touch()
    monkeypatch.setattr(settings, "model_path", model_file)
    monkeypatch.setattr(settings, "stockfish_path", engine_file)
    monkeypatch.setattr(api, "get_blunder_model", lambda: BlunderModel(FakeClassifier(probability)))
    monkeypatch.setattr(api, "StockfishEvaluator", FakeEvaluator)


@pytest.fixture
def fake_backends(monkeypatch, tmp_path):
    _install_fake_backends(monkeypatch, tmp_path, probability=0.2)


@pytest.fixture
def risky_fake_backends(monkeypatch, tmp_path):
    _install_fake_backends(monkeypatch, tmp_path, probability=0.9)


def test_health_endpoint():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_rejects_invalid_fen():
    response = TestClient(app).post("/predict", json={"fen": "not fen", "rating": 1200})
    assert response.status_code == 422


def test_move_rejects_invalid_fen():
    response = TestClient(app).post("/move", json={"fen": "not fen", "strength": 8})
    assert response.status_code == 422


def test_trap_move_rejects_invalid_fen():
    response = TestClient(app).post("/trap-move", json={"fen": "not fen", "rating": 1200})
    assert response.status_code == 422


def test_maia_move_rejects_invalid_fen():
    response = TestClient(app).post("/maia-move", json={"fen": "not fen", "rating": 1200})
    assert response.status_code == 422


def test_game_analysis_rejects_empty_pgn():
    response = TestClient(app).post("/analyze-game", json={"pgn_text": "", "rating": 1200})
    assert response.status_code == 422


def test_territory_control_endpoint():
    client = TestClient(app)
    response = client.post(
        "/territory-control",
        json={"fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "squares" in data
    assert "center_control" in data
    assert "total_influence" in data
    assert data["squares"]["e4"]["dominant"] == "w"


def test_blunder_dna_endpoint():
    client = TestClient(app)
    response = client.post("/blunder-dna", json={})
    assert response.status_code == 200
    data = response.json()
    assert "dimensions" in data
    assert "archetype" in data
    assert "pins" in data["dimensions"]
    assert "resilience_score" in data


def test_trap_puzzles_endpoints():
    client = TestClient(app)
    response = client.get("/trap-puzzles")
    assert response.status_code == 200
    puzzles = response.json()
    assert len(puzzles) >= 10
    first = puzzles[0]
    assert "id" in first
    assert "tempted_move_san" in first
    assert "is_trap" in first

    single_resp = client.get(f"/trap-puzzles/{first['id']}")
    assert single_resp.status_code == 200
    assert single_resp.json()["id"] == first["id"]


def test_blunder_dna_with_multi_game_pgn():
    client = TestClient(app)
    pgn_text = """[Event "Test 1"]
1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *

[Event "Test 2"]
1. d4 d5 2. c4 e6 *
"""
    response = client.post("/blunder-dna", json={"pgn_text": pgn_text})
    assert response.status_code == 200
    data = response.json()
    assert data["games_analyzed"] == 2
    assert "dimensions" in data
    assert "archetype" in data
    assert "resilience_score" in data


def test_analyze_game_returns_caps_and_badges(fake_backends):
    client = TestClient(app)
    pgn_text = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 *"
    response = client.post("/analyze-game", json={"pgn_text": pgn_text, "rating": 1200})
    assert response.status_code == 200
    data = response.json()
    assert "caps_accuracy" in data
    assert "white" in data["caps_accuracy"]
    assert "black" in data["caps_accuracy"]
    assert "performance_rating" in data
    assert "badge_counts" in data
    assert "white" in data["badge_counts"]
    assert "moves" in data
    assert len(data["moves"]) > 0
    first_move = data["moves"][0]
    assert "classification" in first_move
    assert "badge_symbol" in first_move


def test_tactical_analysis_endpoints(fake_backends):
    client = TestClient(app)
    # Standard starting board
    response = client.post(
        "/tactical-analysis",
        json={"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "rating": 1200},
    )
    assert response.status_code == 200
    data = response.json()
    assert "candidate_moves" in data
    assert "threats" in data
    assert "win_chances" in data
    assert "coach_explanation" in data
    assert len(data["candidate_moves"]) > 0

    # Game over position (Scholar's mate final position)
    mate_fen = "r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"
    mate_resp = client.post("/tactical-analysis", json={"fen": mate_fen, "rating": 1200})
    assert mate_resp.status_code == 200
    mate_data = mate_resp.json()
    assert "Checkmate" in mate_data["coach_explanation"]
    assert mate_data["overall_blunder_probability"] == 0.0

    # Invalid FEN
    invalid_resp = client.post("/tactical-analysis", json={"fen": "invalid_fen_string", "rating": 1200})
    assert invalid_resp.status_code == 422


def test_territory_control_rejects_invalid_fen():
    client = TestClient(app)
    response = client.post("/territory-control", json={"fen": "invalid_fen"})
    assert response.status_code == 422


def test_trap_puzzle_not_found():
    client = TestClient(app)
    response = client.get("/trap-puzzles/non_existent_trap_id_12345")
    assert response.status_code == 404


def test_tactical_analysis_terminal_checkmate_evaluation():
    client = TestClient(app)
    # Scholar's mate final position where White checkmates Black: White won (+9999)
    mate_fen = "r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4"
    resp = client.post("/tactical-analysis", json={"fen": mate_fen, "rating": 1200})
    assert resp.status_code == 200
    data = resp.json()
    assert data["evaluation_centipawns"] == 9999
    assert data["win_chances"]["white"] == 1.0


def test_tactical_analysis_pin_threat_accuracy():
    client = TestClient(app)
    # Black knight on c6 pinned to king by White bishop on b5
    pin_fen = "r1bqkbnr/ppp2ppp/2n5/1B1pp3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4"
    resp = client.post("/tactical-analysis", json={"fen": pin_fen, "rating": 1200})
    assert resp.status_code == 200
    data = resp.json()
    threats = data["threats"]
    pinned_threats = [t for t in threats if t["motif"] == "pinned"]
    assert len(pinned_threats) > 0
    # Should identify Bishop as the pinner piece
    assert "Bishop" in pinned_threats[0]["description"]




def test_coach_advice_endpoint(fake_backends):
    client = TestClient(app)
    fen = "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 5"
    resp = client.post(
        "/coach-advice",
        json={"fen": fen, "rating": 1400, "archetype": "Overloaded Defender"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "headline" in data
    assert "concept" in data
    assert "explanation" in data
    assert "threat_summary" in data
    assert "recommended_move" in data
    assert isinstance(data["tactical_tags"], list)


def test_coach_advice_rejects_invalid_fen():
    client = TestClient(app)
    resp = client.post("/coach-advice", json={"fen": "invalid_fen_string", "rating": 1200})
    assert resp.status_code == 422


def test_coach_advice_works_without_model_or_engine(no_backends):
    resp = TestClient(app).post("/coach-advice", json={"fen": chess.STARTING_FEN, "rating": 1200})
    assert resp.status_code == 200
    assert resp.json()["headline"]


def test_coach_advice_recommends_engine_top_move(fake_backends):
    resp = TestClient(app).post("/coach-advice", json={"fen": chess.STARTING_FEN, "rating": 1200})
    assert resp.status_code == 200
    assert resp.json()["recommended_move"].startswith("e4")


def test_coach_advice_uses_model_blunder_probability(risky_fake_backends):
    resp = TestClient(app).post("/coach-advice", json={"fen": chess.STARTING_FEN, "rating": 1200})
    assert resp.status_code == 200
    assert "High Blunder Danger" in resp.json()["headline"]


def test_coach_advice_explains_detected_pin(no_backends):
    # Black knight on c6 is pinned to the king by the bishop on b5
    pin_fen = "r1bqkbnr/ppp2ppp/2n5/1B1pp3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4"
    resp = TestClient(app).post("/coach-advice", json={"fen": pin_fen, "rating": 1200})
    assert resp.status_code == 200
    assert "pin" in resp.json()["tactical_tags"]


def test_tactical_analysis_reports_missing_backends_instead_of_guessing(no_backends):
    resp = TestClient(app).post("/tactical-analysis", json={"fen": chess.STARTING_FEN, "rating": 1200})
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_source"] == "unavailable"
    assert data["eval_source"] == "unavailable"
    assert data["overall_blunder_probability"] is None
    assert data["risk_band"] is None
    assert data["win_chances"] is None
    assert data["evaluation_centipawns"] is None
    assert data["candidate_moves"] == []


def test_tactical_analysis_with_backends_reports_sources(fake_backends):
    data = TestClient(app).post(
        "/tactical-analysis", json={"fen": chess.STARTING_FEN, "rating": 1200}
    ).json()
    assert data["risk_source"] == "model"
    assert data["eval_source"] == "engine"
    assert data["overall_blunder_probability"] == pytest.approx(0.2)
    # FakeEvaluator scores e4/d4/Nf3 at 30/20/10 cp: White's view at the start
    assert data["evaluation_centipawns"] == 30
    assert [c["classification"] for c in data["candidate_moves"]] == ["best", "good", "good"]
    assert all(c["blunder_probability"] == pytest.approx(0.2) for c in data["candidate_moves"])


def test_tactical_analysis_stalemate_is_a_certain_draw():
    stalemate_fen = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"
    data = TestClient(app).post("/tactical-analysis", json={"fen": stalemate_fen, "rating": 1200}).json()
    assert data["win_chances"] == {"white": 0.0, "draw": 1.0, "black": 0.0}
    assert data["evaluation_centipawns"] == 0


def test_classify_loss_thresholds():
    assert [api._classify_loss(x) for x in (0, 35, 36, 90, 91, 200, 201)] == [
        "best", "good", "inaccuracy", "inaccuracy", "mistake", "mistake", "blunder"
    ]


def test_position_analysis_logs_engine_failure(monkeypatch, tmp_path, caplog):
    engine_file = tmp_path / "stockfish"
    engine_file.touch()
    monkeypatch.setattr(settings, "model_path", tmp_path / "missing.joblib")
    monkeypatch.setattr(settings, "stockfish_path", engine_file)

    class BrokenEvaluator(FakeEvaluator):
        def __enter__(self):
            raise api.EngineConfigurationError("boom")

    monkeypatch.setattr(api, "StockfishEvaluator", BrokenEvaluator)
    with caplog.at_level("WARNING"):
        result = api._analyze_position(chess.Board(), 1200)
    assert result.eval_centipawns is None
    assert "without engine candidates" in caplog.text


def test_health_reports_engine_and_maia(no_backends):
    data = TestClient(app).get("/health").json()
    assert data["engine_ready"] is False
    assert isinstance(data["maia_available"], bool)


def test_blunder_dna_without_games_is_flagged_as_sample():
    data = TestClient(app).post("/blunder-dna", json={}).json()
    assert data["is_sample"] is True
    assert data["positions_analyzed"] == 0


def test_blunder_dna_counts_only_the_players_side():
    # 1.e4 e5 2.Qh5 Nc6 3.Qxe5+: after 2.Qh5 Black's e5 pawn is loose; White's pieces never are
    pgn = "1. e4 e5 2. Qh5 Nc6 *"
    as_white = TestClient(app).post("/blunder-dna", json={"games": [{"pgn": pgn, "player_color": "w"}]}).json()
    as_black = TestClient(app).post("/blunder-dna", json={"games": [{"pgn": pgn, "player_color": "b"}]}).json()
    assert as_white["is_sample"] is False
    assert as_white["positions_analyzed"] == 2
    assert as_black["positions_analyzed"] == 2
    assert as_white["dimensions"]["hanging_pieces"] == 0
    assert as_black["dimensions"]["hanging_pieces"] == 50


def test_blunder_dna_dimensions_are_plain_rates():
    data = TestClient(app).post(
        "/blunder-dna", json={"games": [{"pgn": "1. d4 d5 *", "player_color": "w"}]}
    ).json()
    # One quiet White position: nothing loose, pinned or overloaded, and no 10% floor
    assert data["dimensions"]["hanging_pieces"] == 0
    assert data["dimensions"]["pins"] == 0
    assert data["resilience_score"] <= 100


def test_blunder_dna_rejects_too_many_fens():
    resp = TestClient(app).post("/blunder-dna", json={"fens": [chess.STARTING_FEN] * 201})
    assert resp.status_code == 422
