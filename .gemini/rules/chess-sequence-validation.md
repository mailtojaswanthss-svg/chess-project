# Chess Sequence Validation

When authoring or curating chess puzzles, opening traps, or refutation sequences:
- All FENs must be validated with `chess.Board(fen)`.
- Candidate moves and subsequent refutation lines must be validated sequentially with `board.push_san()` or `board.push(move)` to guarantee turn alternation and legality.
- Never include the candidate move inside the `punishment_line` array when the candidate move is already pushed first.
