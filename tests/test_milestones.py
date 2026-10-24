import chess
from chess_trainer.territory import compute_territory_control
from chess_trainer.profiler import compute_blunder_dna, classify_archetype, BlunderDnaDimensions
from chess_trainer.traps import get_all_traps, get_trap_by_id
from chess_trainer.analysis import _classify_move


def test_territory_starting_position():
    board = chess.Board()
    territory = compute_territory_control(board)
    assert territory.fen == board.fen()
    assert len(territory.squares) == 64
    assert territory.center_control.white_percent == 50
    assert territory.center_control.black_percent == 50
    # On start position, White has pawns on row 2, Black on row 7
    assert territory.squares["e2"].dominant == "w"
    assert territory.squares["e7"].dominant == "b"


def test_territory_center_dominance():
    # 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4
    board = chess.Board("r1bqkbnr/pppp1ppp/2n5/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4")
    territory = compute_territory_control(board)
    assert territory.squares["d4"].dominant == "w"
    assert territory.center_control.white_percent > 50


def test_territory_edge_case_bare_kings():
    board = chess.Board("8/8/8/4k3/8/4K3/8/8 w - - 0 1")
    territory = compute_territory_control(board)
    assert len(territory.squares) == 64
    assert territory.squares["e3"].dominant == "w"
    assert territory.squares["e5"].dominant == "b"


def test_blunder_dna_empty_input():
    report = compute_blunder_dna()
    assert report.resilience_score > 0
    assert report.archetype.name is not None
    assert len(report.critical_advice) > 0


def test_blunder_dna_multi_game_pgn():
    pgn_data = """[Event "Match 1"]
1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 *

[Event "Match 2"]
1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O *
"""
    report = compute_blunder_dna(pgn_texts=[pgn_data])
    assert report.games_analyzed == 2
    assert report.resilience_score >= 10
    assert report.archetype.name is not None


def test_blunder_dna_archetypes_classification():
    # Swashbuckler: hanging pieces dominate
    dims_swash = BlunderDnaDimensions(
        pins=30, hanging_pieces=85, overloaded_defenders=40, back_rank=20, time_scramble=30, pawn_structure=25
    )
    arch_swash = classify_archetype(dims_swash)
    assert arch_swash.name == "The Swashbuckler"

    # Tunnel-Vision: back-rank dominates
    dims_tunnel = BlunderDnaDimensions(
        pins=30, hanging_pieces=35, overloaded_defenders=40, back_rank=85, time_scramble=30, pawn_structure=25
    )
    arch_tunnel = classify_archetype(dims_tunnel)
    assert arch_tunnel.name == "The Tunnel-Vision Invader"

    # Prodigy: all low
    dims_gm = BlunderDnaDimensions(
        pins=15, hanging_pieces=12, overloaded_defenders=10, back_rank=8, time_scramble=14, pawn_structure=16
    )
    arch_gm = classify_archetype(dims_gm)
    assert arch_gm.name == "The Grandmaster Prodigy"


def test_trap_puzzles_integrity_and_refutations():
    traps = get_all_traps()
    assert len(traps) >= 15
    for t in traps:
        assert t.id
        assert t.title
        assert t.difficulty in ("Beginner", "Intermediate", "Advanced")
        # Validate FEN is valid
        board = chess.Board(t.fen)
        assert board.is_valid()
        # Validate tempted move is legal from FEN
        move = chess.Move.from_uci(t.tempted_move_uci)
        assert move in board.legal_moves, f"Tempted move {t.tempted_move_uci} is illegal in trap {t.id}"
        # Push tempted move
        board.push(move)
        # Deep test: Verify every single move in punishment_line is legal sequentially!
        assert len(t.punishment_line) > 0, f"Punishment line empty for {t.id}"
        for ref_san in t.punishment_line:
            try:
                board.push_san(ref_san)
            except Exception as exc:
                raise AssertionError(
                    f"Refutation move '{ref_san}' failed in trap '{t.id}': {exc}. Board FEN: {board.fen()}"
                ) from exc


def test_analysis_iconic_badges():
    board = chess.Board()
    # Book move ply 1 e4
    e4_move = chess.Move.from_uci("e2e4")
    cls, badge = _classify_move(board, e4_move, loss=5, ply=1, danger_prob=0.1)
    assert cls == "book"
    assert badge == "📖"

    # Standard best move (not a sacrifice)
    cls_best, badge_best = _classify_move(board, e4_move, loss=0, ply=12, danger_prob=0.1)
    assert cls_best == "best"
    assert badge_best == "★"

    # Brilliant queen sacrifice into undefended square
    # Board where White Queen can sacrifice on e6/f7
    sac_board = chess.Board("r1b1k2r/pppp1ppp/8/4q3/1b2Q3/2N5/PPP2PPP/R1B1KB1R w KQkq - 0 9")
    # Queen on e4, moves to a square or sacrifices
    # Let's create an attacked queen position: White Queen on e4, move to an undefended attacked square e7
    queen_sac_board = chess.Board("r1b1k2r/pppp1ppp/4p3/8/4Q3/8/PPP2PPP/RNB1KB1R w KQkq - 0 8")
    # If Queen moves to an attacked square e6 without defenders
    q_move = chess.Move.from_uci("e4e6")
    if q_move in queen_sac_board.legal_moves:
        cls_brill, badge_brill = _classify_move(queen_sac_board, q_move, loss=5, ply=10, danger_prob=0.2)
        assert cls_brill == "brilliant"
        assert badge_brill == "!!"

    # Blunder with high centipawn loss
    cls_blunder, badge_blunder = _classify_move(board, e4_move, loss=350, ply=15, danger_prob=0.7)
    assert cls_blunder == "blunder"
    assert badge_blunder == "??"

    # Mistake with moderate loss
    cls_mistake, badge_mistake = _classify_move(board, e4_move, loss=140, ply=15, danger_prob=0.3)
    assert cls_mistake == "mistake"
    assert badge_mistake == "?"


def test_analysis_piece_trade_is_not_brilliant():
    # White Knight on c3 captures Black Queen on d5
    # Board with Black Queen on d5 defended by c6 pawn, White Knight on c3 captures d5
    board = chess.Board("r1b1kbnr/ppp2ppp/2p5/3q4/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 4")
    capture_queen = chess.Move.from_uci("c3d5")
    assert capture_queen in board.legal_moves
    cls, badge = _classify_move(board, capture_queen, loss=0, ply=8, danger_prob=0.1)
    # Gaining queen with a knight is an optimal capture, NOT a brilliant sacrifice!
    assert cls == "best"
    assert badge == "★"

    # Queen trade: White Queen takes Black Queen on d8
    trade_board = chess.Board("r1bqkbnr/pppp1ppp/2n5/4p3/3P4/5N2/PPP1PPPP/RNBQKB1R w KQkq - 1 3")
    # Equal material queen swap
    trade_board_queens = chess.Board("r1bQkbnr/ppp2ppp/2n5/4p3/8/5N2/PPP1PPPP/RNB1KB1R b KQkq - 0 4")
    # Black King captures Queen on d8
    k_takes = chess.Move.from_uci("e8d8")
    assert k_takes in trade_board_queens.legal_moves
    cls_k, badge_k = _classify_move(trade_board_queens, k_takes, loss=0, ply=8, danger_prob=0.1)
    assert cls_k == "best"
    assert badge_k == "★"


def test_blunder_dna_clean_game_has_no_artificial_back_rank_flaw():
    # Standard classical opening without any back-rank mate weakness
    clean_pgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 *"
    report = compute_blunder_dna(pgn_texts=[clean_pgn])
    # The back_rank dimension must not be artificially maxed at 95 on an opening!
    assert report.dimensions.back_rank < 50
    assert report.archetype.name != "The Tunnel-Vision Invader"


def test_blunder_dna_detects_genuine_back_rank_vulnerability():
    # Position where king has no escape square and enemy heavy piece attacks back rank
    back_rank_fen = "3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1"
    report = compute_blunder_dna(fens=[back_rank_fen])
    assert report.dimensions.back_rank >= 50

