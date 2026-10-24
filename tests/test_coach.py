import logging

import chess
import httpx

from chess_trainer import coach
from chess_trainer.coach import build_tactical_context, generate_agentic_coach_advice


def test_gemini_key_sent_in_header_and_fallback_logged(monkeypatch, caplog):
    calls = []

    def fake_post(url, json=None, headers=None, timeout=None):
        calls.append((url, headers or {}))
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx, "post", fake_post)
    monkeypatch.delenv("GEMINI_MODEL_ID", raising=False)
    ctx = build_tactical_context(board=chess.Board())

    with caplog.at_level(logging.WARNING, logger=coach.__name__):
        advice = generate_agentic_coach_advice(ctx, api_key="secret-test-key")

    assert advice.engine_source == "Context-Engineered Grandmaster Agent"
    assert calls
    for url, headers in calls:
        assert "secret-test-key" not in url
        assert headers.get("x-goog-api-key") == "secret-test-key"
    assert "falling back" in caplog.text.lower()
    assert "secret-test-key" not in caplog.text
