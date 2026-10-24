from fastapi.testclient import TestClient

from chess_trainer.api import app


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


def test_analyze_game_returns_caps_and_badges():
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


def test_tactical_analysis_endpoints():
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




def test_coach_advice_endpoint():
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
