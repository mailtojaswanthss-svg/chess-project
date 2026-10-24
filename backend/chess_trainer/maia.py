from __future__ import annotations

import threading

import chess


class MaiaConfigurationError(RuntimeError):
    """Raised when the optional Maia-2 dependency or model is unavailable."""


# Maia's network is loaded once per process, on the first Maia move.
_maia_cache: tuple[object, object] | None = None
_maia_lock = threading.Lock()


def _load_maia() -> tuple[object, object]:
    global _maia_cache
    with _maia_lock:
        if _maia_cache is None:
            from maia2 import inference, model

            _maia_cache = (model.from_pretrained(type="rapid", device="auto"), inference.prepare())
        return _maia_cache


def maia_installed() -> bool:
    try:
        import maia2  # noqa: F401
    except ImportError:
        return False
    return True


class MaiaEngine:
    def choose_move(self, board: chess.Board, rating: int) -> chess.Move:
        try:
            from maia2 import inference
        except ImportError as exc:
            raise MaiaConfigurationError(
                "Maia-2 is optional and is not installed. Install it with "
                "`pip install maia2` in a Python 3.10-3.12 environment, then restart the API."
            ) from exc
        try:
            maia_model, prepared = _load_maia()
            move_probabilities, _ = inference.inference_each(
                maia_model, prepared, board.fen(), rating, rating
            )
            legal_moves = {move.uci(): move for move in board.legal_moves}
            candidates = [
                (legal_moves[uci], probability)
                for uci, probability in move_probabilities.items()
                if uci in legal_moves
            ]
            if not candidates:
                raise MaiaConfigurationError("Maia-2 returned no legal move for this position")
            return max(candidates, key=lambda item: item[1])[0]
        except MaiaConfigurationError:
            raise
        except Exception as exc:
            raise MaiaConfigurationError(f"Maia-2 inference failed: {exc}") from exc
