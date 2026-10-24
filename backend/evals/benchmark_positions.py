"""Canonical Tactical Benchmark Dataset for Chess Coach Evals.

10 curated positions with verified ground truth:
- FEN
- Name
- Ground truth tactical motif
- Ground truth best move (SAN & UCI)
- Ground truth expected concept
"""

from typing import List, Dict, Any

BENCHMARK_POSITIONS: List[Dict[str, Any]] = [
    {
        "id": "bench_01_legals_mate",
        "name": "Legal's Mate Trap",
        "fen": "r1bqkb1r/pppp1ppp/2n5/4P3/2B1n3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 5",
        "ground_truth_motif": "hanging",
        "ground_truth_move_san": "d5",
        "ground_truth_move_uci": "d7d5",
        "expected_concept": "Hanging Material Alert",
        "difficulty": "medium",
    },
    {
        "id": "bench_02_back_rank",
        "name": "Back-Rank Corridor Infiltration",
        "fen": "3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
        "ground_truth_motif": "back_rank",
        "ground_truth_move_san": "h3",
        "ground_truth_move_uci": "h2h3",
        "expected_concept": "Back-Rank",
        "difficulty": "easy",
    },
    {
        "id": "bench_03_pin_queen",
        "name": "Absolute Pin on Queen",
        "fen": "r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10",
        "ground_truth_motif": "pin",
        "ground_truth_move_san": "Qd2",
        "ground_truth_move_uci": "d1d2",
        "expected_concept": "Pin",
        "difficulty": "medium",
    },
    {
        "id": "bench_04_knight_fork",
        "name": "Knight Fork Threat on c7",
        "fen": "r1bqk2r/pp1p1ppp/2n1pn2/2b5/2PN4/2N3P1/PP2PP1P/R1BQKB1R w KQkq - 1 7",
        "ground_truth_motif": "fork",
        "ground_truth_move_san": "Ndb5",
        "ground_truth_move_uci": "d4b5",
        "expected_concept": "Tactical Tension",
        "difficulty": "medium",
    },
    {
        "id": "bench_05_in_check",
        "name": "Immediate Check Defense",
        "fen": "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 0 5",
        "ground_truth_motif": "hanging",
        "ground_truth_move_san": "Nf6",
        "ground_truth_move_uci": "e4f6",
        "expected_concept": "Hanging Material",
        "difficulty": "easy",
    },
    {
        "id": "bench_06_opera_pin",
        "name": "Morphy Opera House Pin",
        "fen": "4kb1r/p2nqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 b k - 1 14",
        "ground_truth_motif": "pin",
        "ground_truth_move_san": "Qe6",
        "ground_truth_move_uci": "e7e6",
        "expected_concept": "Pin",
        "difficulty": "hard",
    },
    {
        "id": "bench_07_hanging_rook",
        "name": "Undefended Rook on Open File",
        "fen": "r4rk1/ppp2ppp/2n5/3q4/3P4/5N2/PP1Q1PPP/R3R1K1 b - - 0 14",
        "ground_truth_motif": "hanging",
        "ground_truth_move_san": "Rfe8",
        "ground_truth_move_uci": "f8e8",
        "expected_concept": "Piece Coordination",
        "difficulty": "medium",
    },
    {
        "id": "bench_08_smothered_check",
        "name": "Smothered Mate Sequence Anchor",
        "fen": "6k1/5ppp/8/8/8/8/1Q4PP/6K1 w - - 0 1",
        "ground_truth_motif": "back_rank",
        "ground_truth_move_san": "Qb8#",
        "ground_truth_move_uci": "b2b8",
        "expected_concept": "Back-Rank",
        "difficulty": "easy",
    },
    {
        "id": "bench_09_checkmate_in_one",
        "name": "Direct King Threat",
        "fen": "r1bqk2r/ppppbppp/2n5/4p3/2B1P1n1/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 5",
        "ground_truth_motif": "hanging",
        "ground_truth_move_san": "d4",
        "ground_truth_move_uci": "d2d4",
        "expected_concept": "Center Outposts",
        "difficulty": "medium",
    },
    {
        "id": "bench_10_endgame_outpost",
        "name": "Endgame Central Outpost",
        "fen": "8/5pk1/4p1p1/3pP2p/3P3P/5KP1/5P2/8 w - - 1 40",
        "ground_truth_motif": "center-control",
        "ground_truth_move_san": "Ke3",
        "ground_truth_move_uci": "f3e3",
        "expected_concept": "Positional Harmony",
        "difficulty": "medium",
    },
]
