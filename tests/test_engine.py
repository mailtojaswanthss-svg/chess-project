from pathlib import Path

import chess
import chess.engine
import pytest

from chess_trainer import engine as engine_mod
from chess_trainer.engine import StockfishEvaluator, engine_ready


class FakeSimpleEngine:
    def __init__(self):
        self.calls = 0
        self.quit_called = False
        self.die_next = False

    def analyse(self, board, limit, multipv=None):
        self.calls += 1
        if self.die_next:
            self.die_next = False
            raise chess.engine.EngineTerminatedError("engine died")
        move = next(iter(board.legal_moves))
        info = {"pv": [move], "score": chess.engine.PovScore(chess.engine.Cp(25), board.turn)}
        return [info] if multipv else info

    def quit(self):
        self.quit_called = True

    def close(self):
        pass


@pytest.fixture
def fake_popen(monkeypatch, tmp_path):
    started: list[FakeSimpleEngine] = []

    def popen(path):
        eng = FakeSimpleEngine()
        started.append(eng)
        return eng

    monkeypatch.setattr(chess.engine.SimpleEngine, "popen_uci", staticmethod(popen))
    engine_mod.shutdown_engines()
    exe = tmp_path / "stockfish"
    exe.touch()
    yield exe, started
    engine_mod.shutdown_engines()


def test_engine_process_is_reused_across_requests(fake_popen):
    exe, started = fake_popen
    for _ in range(3):
        with StockfishEvaluator(exe, depth=8, shared=True) as evaluator:
            assert evaluator.score(chess.Board()) == 25
    assert len(started) == 1
    assert started[0].calls == 3
    assert not started[0].quit_called


def test_dead_engine_is_restarted_once(fake_popen):
    exe, started = fake_popen
    with StockfishEvaluator(exe, shared=True) as evaluator:
        evaluator.score(chess.Board())
        started[0].die_next = True
        move, score = evaluator.best_move(chess.Board())
    assert score == 25
    assert len(started) == 2


def test_shutdown_quits_shared_engine(fake_popen):
    exe, started = fake_popen
    with StockfishEvaluator(exe, shared=True) as evaluator:
        evaluator.candidate_moves(chess.Board(), count=3)
    engine_mod.shutdown_engines()
    assert started[0].quit_called


def test_private_evaluator_quits_its_engine_on_exit(fake_popen):
    exe, started = fake_popen
    with StockfishEvaluator(exe) as evaluator:
        evaluator.score(chess.Board())
    assert len(started) == 1
    assert started[0].quit_called
    assert engine_mod._engines == {}


def test_missing_executable_is_a_configuration_error(tmp_path):
    with pytest.raises(engine_mod.EngineConfigurationError):
        with StockfishEvaluator(tmp_path / "nope"):
            pass
    assert engine_ready(None) is False
    assert engine_ready(tmp_path / "nope") is False


def test_script_using_evaluator_exits_promptly(tmp_path):
    """A plain script (like chess-train) must not hang at interpreter exit."""
    import shutil
    import subprocess
    import sys

    stockfish = shutil.which("stockfish") or "/usr/games/stockfish"
    if not Path(stockfish).exists():
        pytest.skip("Stockfish not installed")
    script = (
        "import chess\n"
        "from pathlib import Path\n"
        "from chess_trainer.engine import StockfishEvaluator\n"
        f"with StockfishEvaluator(Path({stockfish!r}), depth=4) as e:\n"
        "    e.score(chess.Board())\n"
    )
    backend = Path(__file__).resolve().parents[1] / "backend"
    result = subprocess.run(
        [sys.executable, "-c", script], cwd=tmp_path, timeout=20,
        env={"PYTHONPATH": str(backend), "PATH": "/usr/bin:/bin"},
    )
    assert result.returncode == 0
