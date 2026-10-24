from __future__ import annotations

from dataclasses import dataclass
from io import StringIO
import chess
import chess.pgn
from pydantic import BaseModel


class BlunderDnaDimensions(BaseModel):
    pins: int  # 0 to 100 weakness index
    hanging_pieces: int
    overloaded_defenders: int
    back_rank: int
    time_scramble: int
    pawn_structure: int


class TacticalArchetype(BaseModel):
    name: str
    title: str
    quote: str
    badge_color: str
    dominant_flaw: str
    strengths: list[str]
    blind_spots: list[str]
    training_prescription: str


class BlunderDnaResponse(BaseModel):
    dimensions: BlunderDnaDimensions
    archetype: TacticalArchetype
    resilience_score: int  # 0 to 100 overall tactical fitness
    games_analyzed: int
    blunders_detected: int
    critical_advice: list[str]


def _detect_position_weaknesses(board: chess.Board, ply: int) -> dict[str, int]:
    turn = board.turn
    counts = {
        "pins": 0,
        "hanging": 0,
        "overloaded": 0,
        "back_rank": 0,
        "time_scramble": 1 if ply > 50 else 0,
        "pawn_structure": 0,
    }

    # 1. Pins
    king_sq = board.king(turn)
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.color == turn and piece.piece_type != chess.KING:
            if board.is_pinned(turn, sq):
                counts["pins"] += 1

    PIECE_VALUES = {
        chess.PAWN: 1,
        chess.KNIGHT: 3,
        chess.BISHOP: 3,
        chess.ROOK: 5,
        chess.QUEEN: 9,
        chess.KING: 100,
    }

    # 2. Hanging Pieces
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.color == turn and piece.piece_type != chess.KING:
            attackers = list(board.attackers(not turn, sq))
            defenders = list(board.attackers(turn, sq))
            if attackers and not defenders:
                counts["hanging"] += 1
            elif attackers:
                lowest_att = min(
                    PIECE_VALUES[board.piece_at(s).piece_type]
                    for s in attackers
                    if board.piece_at(s)
                )
                if lowest_att < PIECE_VALUES[piece.piece_type]:
                    counts["hanging"] += 1
                elif len(attackers) > len(defenders) and lowest_att <= PIECE_VALUES[piece.piece_type]:
                    counts["hanging"] += 1

    # 3. Overloaded defenders: piece that defends 2+ different attacked pieces
    defender_load: dict[chess.Square, int] = {}
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece and piece.color == turn and piece.piece_type != chess.KING:
            attackers = list(board.attackers(not turn, sq))
            if attackers:
                for def_sq in board.attackers(turn, sq):
                    defender_load[def_sq] = defender_load.get(def_sq, 0) + 1
    counts["overloaded"] = sum(1 for load in defender_load.values() if load >= 2)

    # 4. Back-rank vulnerability (only applicable after opening development when back rank can be infiltrated)
    if king_sq is not None and ply > 12:
        rank = chess.square_rank(king_sq)
        is_back = (turn == chess.WHITE and rank == 0) or (turn == chess.BLACK and rank == 7)
        if is_back:
            # Check if there is escape square in front of king
            file = chess.square_file(king_sq)
            forward_rank = rank + 1 if turn == chess.WHITE else rank - 1
            escape_blocked = True
            for f in range(max(0, file - 1), min(8, file + 2)):
                sq_ahead = chess.square(f, forward_rank)
                p = board.piece_at(sq_ahead)
                if p is None or p.color != turn:
                    escape_blocked = False
                    break
            enemy_heavy = any(
                p.piece_type in (chess.ROOK, chess.QUEEN) and p.color != turn
                for p in board.piece_map().values()
            )
            if escape_blocked and enemy_heavy:
                friendly_pawns = [
                    s for s, p in board.piece_map().items()
                    if p.piece_type == chess.PAWN and p.color == turn
                ]
                friendly_pawn_files = set(chess.square_file(s) for s in friendly_pawns)
                has_open_corridor = any(f not in friendly_pawn_files for f in range(8))
                back_rank_attacked = any(
                    len(board.attackers(not turn, chess.square(f, rank))) > 0
                    for f in range(8)
                )
                if has_open_corridor and back_rank_attacked:
                    counts["back_rank"] += 1

    # 5. Pawn Structure: isolated or doubled pawns
    pawn_squares = [s for s, p in board.piece_map().items() if p.piece_type == chess.PAWN and p.color == turn]
    pawn_files = [chess.square_file(s) for s in pawn_squares]
    doubled = len(pawn_files) - len(set(pawn_files))
    isolated = 0
    for f in pawn_files:
        if (f - 1 not in pawn_files) and (f + 1 not in pawn_files):
            isolated += 1
    counts["pawn_structure"] = doubled + isolated

    return counts


def classify_archetype(dims: BlunderDnaDimensions) -> TacticalArchetype:
    vals = {
        "Hanging Pieces": dims.hanging_pieces,
        "Pins & Skewers": dims.pins,
        "Overloaded Defenders": dims.overloaded_defenders,
        "Back-Rank Weakness": dims.back_rank,
        "Time Scramble": dims.time_scramble,
        "Pawn Structure Flaws": dims.pawn_structure,
    }
    top_flaw = max(vals, key=vals.get)
    max_val = vals[top_flaw]

    if max_val < 30:
        return TacticalArchetype(
            name="The Grandmaster Prodigy",
            title="Ironclad Positionalist",
            quote="Prophylaxis is second nature; your pieces coordinate with effortless harmony.",
            badge_color="#10b981",
            dominant_flaw="Minimal systematic flaws detected",
            strengths=["Deep piece coordination", "High tactical awareness", "Solid pawn structure hygiene"],
            blind_spots=["Can be overly cautious in sharp counter-attacking races"],
            training_prescription="Practice accelerating dynamic conversions and conversion of microscopic endgame advantages.",
        )

    if top_flaw == "Hanging Pieces":
        return TacticalArchetype(
            name="The Swashbuckler",
            title="Aggressive Romantic Gambler",
            quote="You launch ferocious offensive waves, but frequently leave undefended pieces scattered across the flanks.",
            badge_color="#ef4444",
            dominant_flaw="Hanging Pieces & Undefended Outposts",
            strengths=["Initiative creation", "Kingside attacking flair", "Unflinching aggressive instinct"],
            blind_spots=["Leaves minor pieces undefended during attacking sorties", "Prone to backward knight forks"],
            training_prescription="Implement a mandatory 'LPDO' (Loose Pieces Drop Off) scan before committing to any attacking move.",
        )

    if top_flaw == "Pins & Skewers":
        return TacticalArchetype(
            name="The Blindspot Tactician",
            title="Linear Geometry Victim",
            quote="You calculate forward branches accurately, but diagonal and file pins silently unravel your position.",
            badge_color="#f59e0b",
            dominant_flaw="Relative & Absolute Pins",
            strengths=["Direct tactical strikes", "Active piece play", "Piece mobility"],
            blind_spots=["Forgets pinned pieces cannot leave their defensive ray", "Allows cross-pins against the queen"],
            training_prescription="Whenever an enemy bishop or rook enters an alignment with your King or Queen, immediately assess unpinning moves.",
        )

    if top_flaw == "Overloaded Defenders":
        return TacticalArchetype(
            name="The Glass Cannon",
            title="High-Variance Tactician",
            quote="Your position looks magnificent until an overloaded defender is deflected, collapsing the entire edifice.",
            badge_color="#ec4899",
            dominant_flaw="Overloaded Defensive Anchors",
            strengths=["Complex piece interaction", "Tactical ambition", "Dynamic queen play"],
            blind_spots=["Tasks a single knight or bishop with holding 3 separate critical squares"],
            training_prescription="Trace each piece's defensive duties. If a piece protects both a square and another piece, find an auxiliary anchor.",
        )

    if top_flaw == "Back-Rank Weakness":
        return TacticalArchetype(
            name="The Tunnel-Vision Invader",
            title="Offensive Monomaniac",
            quote="You push deep into enemy territory while your own king sits trapped in a claustrophobic back-rank coffin.",
            badge_color="#8b5cf6",
            dominant_flaw="Back-Rank Mate Vulnerability",
            strengths=["Heavy piece penetration", "Rook infiltration on 7th rank", "Checkmate threats"],
            blind_spots=["Neglects playing 'luft' (h3/h6 escape square) before launching rooks into the fray"],
            training_prescription="Make 'creating luft' (e.g. h3 or g3) a muscle memory habit as soon as the center opens up.",
        )

    if top_flaw == "Time Scramble":
        return TacticalArchetype(
            name="The Impulsive Speedster",
            title="Clock-Pressured Intuitive",
            quote="Brilliant in the opening and middlegame, but precision plummets as the move count and complexity rise.",
            badge_color="#06b6d4",
            dominant_flaw="Endgame / Time Scramble Deterioration",
            strengths=["Rapid opening development", "Fast pattern recognition", "Dangerous intuitive strikes"],
            blind_spots=["Hasty hands in critical transitions", "Commits blunders on move 35+"],
            training_prescription="Practice slow endgame calculation and breathing techniques when transition into the late game occurs.",
        )

    return TacticalArchetype(
        name="The Dynamic Pragmatist",
        title="Balanced Competitive Fighter",
        quote="A resilient all-rounder with versatile tactical reflexes, facing standard structural friction in the middlegame.",
        badge_color="#3b82f6",
        dominant_flaw="Pawn Levers & Structural Weaknesses",
        strengths=["Resilience under pressure", "Adaptable tactical style", "Balanced attack/defense"],
        blind_spots=["Occasional creation of chronic backward pawns and weak outpost squares"],
        training_prescription="Focus on pawn tension handling, minority attacks, and avoiding premature central pawn pushes.",
    )


def compute_blunder_dna(
    pgn_texts: list[str] | None = None,
    fens: list[str] | None = None,
) -> BlunderDnaResponse:
    total_positions = 0
    agg = {
        "pins": 0,
        "hanging": 0,
        "overloaded": 0,
        "back_rank": 0,
        "time_scramble": 0,
        "pawn_structure": 0,
    }
    games_count = 0
    blunders_count = 0

    if pgn_texts:
        for pgn_text in pgn_texts:
            if not pgn_text.strip():
                continue
            try:
                sio = StringIO(pgn_text)
                while True:
                    game = chess.pgn.read_game(sio)
                    if game is None:
                        break
                    games_count += 1
                    board = game.board()
                    for ply, move in enumerate(game.mainline_moves(), start=1):
                        total_positions += 1
                        weaknesses = _detect_position_weaknesses(board, ply)
                        # Count tactical blunder moments where pieces are hanging or severely overworked
                        if (
                            weaknesses["hanging"] >= 1
                            or weaknesses["overloaded"] >= 2
                            or (weaknesses["pins"] >= 1 and weaknesses["hanging"] >= 1)
                        ):
                            blunders_count += 1
                        for k, v in weaknesses.items():
                            agg[k] += v
                        board.push(move)
            except Exception:
                continue

    if fens:
        for fen in fens:
            try:
                board = chess.Board(fen)
                total_positions += 1
                weaknesses = _detect_position_weaknesses(board, 20)
                if weaknesses["hanging"] >= 1 or weaknesses["overloaded"] >= 2:
                    blunders_count += 1
                for k, v in weaknesses.items():
                    agg[k] += v
            except Exception:
                continue

    if total_positions == 0:
        # Default baseline benchmark profile
        dims = BlunderDnaDimensions(
            pins=42,
            hanging_pieces=58,
            overloaded_defenders=38,
            back_rank=25,
            time_scramble=45,
            pawn_structure=35,
        )
        archetype = classify_archetype(dims)
        return BlunderDnaResponse(
            dimensions=dims,
            archetype=archetype,
            resilience_score=68,
            games_analyzed=0,
            blunders_detected=0,
            critical_advice=[
                "Scan all unprotected pieces ('LPDO') before selecting a candidate move.",
                "Ensure your king has an escape square before committing heavy pieces to the attack.",
                "Double check for enemy alignment rays against your Queen.",
            ],
        )

    # Normalize counts to a 0-100 severity index
    factor = 100.0 / max(1, total_positions)
    pins_idx = min(95, max(10, int(agg["pins"] * factor * 2.0)))
    hanging_idx = min(95, max(10, int(agg["hanging"] * factor * 1.8)))
    overloaded_idx = min(95, max(10, int(agg["overloaded"] * factor * 2.0)))
    back_rank_idx = min(95, max(10, int(agg["back_rank"] * factor * 2.5)))
    time_scramble_idx = min(95, max(10, int(agg["time_scramble"] * factor * 1.5)))
    pawn_struct_idx = min(95, max(10, int(agg["pawn_structure"] * factor * 1.2)))

    dims = BlunderDnaDimensions(
        pins=pins_idx,
        hanging_pieces=hanging_idx,
        overloaded_defenders=overloaded_idx,
        back_rank=back_rank_idx,
        time_scramble=time_scramble_idx,
        pawn_structure=pawn_struct_idx,
    )

    archetype = classify_archetype(dims)
    avg_flaw = (pins_idx + hanging_idx + overloaded_idx + back_rank_idx + time_scramble_idx + pawn_struct_idx) / 6.0
    resilience = max(15, min(98, int(100 - (avg_flaw * 0.75))))

    advice: list[str] = []
    if dims.hanging_pieces >= 50:
        advice.append("Prioritize fixing undefended pieces: your highest frequency blunder root is loose material.")
    if dims.pins >= 45:
        advice.append("Watch out for pins: Opponents are exploiting alignment pins against your key pieces.")
    if dims.back_rank >= 40:
        advice.append("Give your King breathing room ('luft') before opening the center.")
    if dims.overloaded_defenders >= 40:
        advice.append("Avoid overworking defenders: relieve pieces asked to defend multiple targets.")
    if not advice:
        advice.append("Solid tactical hygiene across standard dimensions. Focus on deepening concrete calculation.")

    return BlunderDnaResponse(
        dimensions=dims,
        archetype=archetype,
        resilience_score=resilience,
        games_analyzed=max(1, games_count) if games_count > 0 else (len(fens) if fens else 1),
        blunders_detected=blunders_count,
        critical_advice=advice,
    )
