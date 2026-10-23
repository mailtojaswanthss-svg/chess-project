from __future__ import annotations

import chess


class MaiaConfigurationError(RuntimeError):
    """Raised when the optional Maia-2 dependency or model is unavailable."""


class MaiaEngine:
    def choose_move(self, board: chess.Board, rating: int) -> chess.Move:
        try:
            from maia2 import inference, model
        except ImportError as exc:
            raise MaiaConfigurationError(
                "Maia-2 is optional and is not installed. Install it with "
                "`pip install maia2` in a Python 3.10-3.12 environment, then restart the API."
            ) from exc
        try:
            maia_model = model.from_pretrained(type="rapid", device="auto")
            prepared = inference.prepare()
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
