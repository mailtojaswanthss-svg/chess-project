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
