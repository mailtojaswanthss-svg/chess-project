from __future__ import annotations

from pydantic import BaseModel


class TrapDrill(BaseModel):
    id: str
    title: str
    difficulty: str  # "Beginner" | "Intermediate" | "Advanced"
    theme: str
    side_to_move: str  # "White" | "Black"
    fen: str
    tempted_move_san: str
    tempted_move_uci: str
    is_trap: bool
    prompt: str
    trap_explanation: str
    punishment_line: list[str]


CURATED_TRAPS: list[TrapDrill] = [
    TrapDrill(
        id="legals-mate",
        title="Legal's Mate Trap",
        difficulty="Beginner",
        theme="Decoy & Queen Sacrifice",
        side_to_move="Black",
        fen="rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R b KQkq - 0 5",
        tempted_move_san="Bxd1",
        tempted_move_uci="g4d1",
        is_trap=True,
        prompt="White just played 5.Nxe5, leaving the Queen on d1 completely hanging! Can Black greedily play 5...Bxd1?",
        trap_explanation="POISONED TRAP! Capturing the free queen leads to forced mate: 6.Bxf7+ Ke7 7.Nd5# checkmate!",
        punishment_line=["Bxf7+", "Ke7", "Nd5#"],
    ),
    TrapDrill(
        id="blackburne-shilling",
        title="Blackburne Shilling Gambit",
        difficulty="Beginner",
        theme="Overloaded Defender & Fork",
        side_to_move="White",
        fen="r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        tempted_move_san="Nxe5",
        tempted_move_uci="f3e5",
        is_trap=True,
        prompt="Black plays 3...Nd4 leaving the e5 pawn apparently free for the taking. Can White play 4.Nxe5?",
        trap_explanation="POISONED TRAP! Black retaliates with 4...Qg5! attacking both the knight and the g2 pawn, leading to the smothering 7...Nf3# or winning the rook on h1!",
        punishment_line=["Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"],
    ),
    TrapDrill(
        id="noahs-ark",
        title="Noah's Ark Trap (Ruy Lopez)",
        difficulty="Intermediate",
        theme="Bishop Trap",
        side_to_move="White",
        fen="r1bqkbnr/2p2ppp/p2p4/1p6/3pP3/1B6/PPP2PPP/RNBQK2R w KQkq - 0 8",
        tempted_move_san="Qxd4",
        tempted_move_uci="d1d4",
        is_trap=True,
        prompt="In the Ruy Lopez, Black just played 7...exd4. Can White recapture the pawn with 8.Qxd4?",
        trap_explanation="POISONED TRAP! Black plays 8...c5! followed by 9.Qd5 Be6 10.Qc6+ Bd7 11.Qd5 c4!, completely trapping and capturing White's light-squared bishop on b3!",
        punishment_line=["c5", "Qd5", "Be6", "Qc6+", "Bd7", "Qd5", "c4"],
    ),
    TrapDrill(
        id="elephant-trap",
        title="Elephant Trap (Queen's Gambit)",
        difficulty="Intermediate",
        theme="Discovery & Unprotected Knight",
        side_to_move="White",
        fen="r1bqkb1r/pppn1ppp/5n2/3p2B1/3P4/2N5/PP2PPPP/R2QKBNR w KQkq - 0 6",
        tempted_move_san="Nxd5",
        tempted_move_uci="c3d5",
        is_trap=True,
        prompt="In the QGD (1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5), Black's knight on d7 seems pinned. Can White win a pawn with 6.Nxd5?",
        trap_explanation="POISONED TRAP! Black plays 6...Nxd5! sacrificing the Queen. After 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8, Black emerges a full minor piece ahead!",
        punishment_line=["Nxd5", "Bxd8", "Bb4+", "Qd2", "Bxd2+", "Kxd2", "Kxd8"],
    ),
    TrapDrill(
        id="siberian-trap",
        title="Siberian Trap (Morra Gambit)",
        difficulty="Intermediate",
        theme="Smothered Mate & Queen Deflection",
        side_to_move="White",
        fen="r1b1kb1r/ppqp1ppp/2n1p3/8/2B1P1n1/2N2N2/PP2QPPP/R1B2RK1 w kq - 6 9",
        tempted_move_san="h3",
        tempted_move_uci="h2h3",
        is_trap=True,
        prompt="In the Smith-Morra Gambit, Black plays 8...Ng4. Can White kick the annoying knight with 9.h3?",
        trap_explanation="POISONED TRAP! Black strikes with 9...Nd4! attacking the Queen and deflecting the f3 defender, forcing 10.Nxd4 Qh2# checkmate!",
        punishment_line=["Nd4", "Nxd4", "Qh2#"],
    ),
    TrapDrill(
        id="lasker-trap",
        title="Lasker Trap (Albin Countergambit)",
        difficulty="Advanced",
        theme="Underpromotion to Knight",
        side_to_move="White",
        fen="rnbqk1nr/ppp2ppp/8/4P3/1bP5/4p3/PP1B1PPP/RN1QKBNR w KQkq - 0 6",
        tempted_move_san="Bxb4",
        tempted_move_uci="d2b4",
        is_trap=True,
        prompt="In the Albin Countergambit, Black plays 5...Bb4+. Should White greedily take the bishop with 6.Bxb4?",
        trap_explanation="POISONED TRAP! Black replies 6...exf2+! 7.Ke2 fxg1=N+! (underpromoting with check so White cannot trade queens), followed by 8.Ke1 Qh4+ with a winning attack!",
        punishment_line=["exf2+", "Ke2", "fxg1=N+", "Ke1", "Qh4+"],
    ),
    TrapDrill(
        id="mortimer-trap",
        title="Mortimer Trap (Ruy Lopez)",
        difficulty="Intermediate",
        theme="Discovered Double Attack",
        side_to_move="White",
        fen="r1bqkb1r/ppppnppp/5n2/1B2p3/4P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
        tempted_move_san="Nxe5",
        tempted_move_uci="f3e5",
        is_trap=True,
        prompt="In the Berlin Defense, Black plays 4...Ne7!? baiting the e5 pawn. Can White safely play 5.Nxe5?",
        trap_explanation="POISONED TRAP! Black plays 5...c6! 6.Bc4 Qa5+! (double attack forking the king and the e5 knight) winning the piece!",
        punishment_line=["c6", "Bc4", "Qa5+", "Nc3", "Qxe5"],
    ),
    TrapDrill(
        id="fishing-pole",
        title="The Fishing Pole Trap",
        difficulty="Intermediate",
        theme="H-File Clearance",
        side_to_move="White",
        fen="r1bqk2r/pppp1pp1/2n5/1Bb1p2p/4P1n1/3P1N1P/PPP2PP1/RNBQ1RK1 w kq - 0 7",
        tempted_move_san="hxg4",
        tempted_move_uci="h3g4",
        is_trap=True,
        prompt="Black plays 6...h5 baiting the knight. Can White safely capture with 7.hxg4?",
        trap_explanation="POISONED TRAP! After 7...hxg4 8.Ng5 g3! 9.Be3 Bxe3 10.fxe3 Qxg5, Black rips open the h-file for decisive invasion!",
        punishment_line=["hxg4", "Ng5", "g3", "Be3", "Bxe3", "fxe3", "Qxg5"],
    ),
    TrapDrill(
        id="halosar-trap",
        title="Halosar Trap (Blackmar-Diemer)",
        difficulty="Intermediate",
        theme="Deflection & Smothered Strike",
        side_to_move="Black",
        fen="rn2kb1r/ppp1pppp/5n2/1N6/1q4b1/4BQ2/PPP3PP/2KR1BNR b kq - 5 8",
        tempted_move_san="Bxf3",
        tempted_move_uci="g4f3",
        is_trap=True,
        prompt="White just played 8.Nb5, threatening Nxc7# checkmate! The White Queen on f3 is hanging. Can Black greedily capture 8...Bxf3?",
        trap_explanation="POISONED TRAP! Capturing the free Queen with 8...Bxf3 allows immediate 9.Nxc7# checkmate! Black must defend c7 (e.g. 8...Na6).",
        punishment_line=["Nxc7#"],
    ),
    TrapDrill(
        id="back-rank-deflection",
        title="Corridor Back-Rank Deflection",
        difficulty="Beginner",
        theme="Back-Rank Mate",
        side_to_move="White",
        fen="3r2k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
        tempted_move_san="Qe7",
        tempted_move_uci="e2e7",
        is_trap=True,
        prompt="White plays Qe7 attacking the rook and threatening mate. But wait—is this a Poisoned Trap or Sound & Safe?",
        trap_explanation="POISONED TRAP! White's own back rank is unprotected! Black replies 1...Rd1+! followed by 2.Qe1 Rxe1# checkmate!",
        punishment_line=["Rd1+", "Qe1", "Rxe1#"],
    ),
    TrapDrill(
        id="poisoned-b2-pawn",
        title="Poisoned b2 Pawn (Sicilian Najdorf)",
        difficulty="Advanced",
        theme="Queen Trapping",
        side_to_move="Black",
        fen="rnb1kb1r/1p3ppp/pq1ppn2/6B1/3NPP2/2N5/PPPQ2PP/R3KB1R b KQkq - 2 8",
        tempted_move_san="Qxb2",
        tempted_move_uci="b6b2",
        is_trap=True,
        prompt="The b2 pawn appears completely hanging. Should Black play 8...Qxb2 attacking the a1 rook?",
        trap_explanation="POISONED TRAP! Taking on b2 is notoriously sharp: White plays 9.Rb1 Qa3 10.f5 Be7 11.fxe6 fxe6, developing overwhelming initiative against the displaced Queen!",
        punishment_line=["Rb1", "Qa3", "f5", "Be7", "fxe6", "fxe6"],
    ),
    TrapDrill(
        id="noahs-ark-safe",
        title="Noah's Ark Safe Prophylaxis",
        difficulty="Intermediate",
        theme="Prophylaxis",
        side_to_move="White",
        fen="r1bqkbnr/2p2ppp/p2p4/1p6/3pP3/1B6/PPP2PPP/RNBQK2R w KQkq - 0 8",
        tempted_move_san="c3",
        tempted_move_uci="c2c3",
        is_trap=False,
        prompt="From the Noah's Ark setup, instead of grabbing on d4, White plays 8.c3! Is this a Poisoned Trap or Sound & Safe?",
        trap_explanation="SOUND & SAFE! 8.c3! is the master move: it challenges Black's center while opening a crucial escape square for the bishop on c2, defusing any trap!",
        punishment_line=["dxc3", "Nxc3", "Nf6", "O-O", "Be7"],
    ),
    TrapDrill(
        id="italian-center-strike",
        title="Italian Game Central Strike",
        difficulty="Beginner",
        theme="Center Control",
        side_to_move="White",
        fen="r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5",
        tempted_move_san="d4",
        tempted_move_uci="d2d4",
        is_trap=False,
        prompt="In the Italian Game (Giuoco Piano), White plays 5.d4 striking the center. Is this a Poisoned Trap or Sound & Safe?",
        trap_explanation="SOUND & SAFE! 5.d4 is the classical mainline thrust, establishing broad central dominance and opening lines for the pieces.",
        punishment_line=["exd4", "cxd4", "Bb4+", "Bd2", "Bxd2+", "Nbxd2"],
    ),
    TrapDrill(
        id="cambridge-springs-safe",
        title="Cambridge Springs Safe Unpin",
        difficulty="Advanced",
        theme="Unpinning & Prophylaxis",
        side_to_move="White",
        fen="r1b1kb1r/pp1n1ppp/2p1pn2/q2p2B1/2PP4/2N1PN2/PP3PPP/R2QKB1R w KQkq - 2 7",
        tempted_move_san="Nd2",
        tempted_move_uci="f3d2",
        is_trap=False,
        prompt="Black plays 6...Qa5 in the Cambridge Springs pinning the knight. White plays 7.Nd2! Is this a Poisoned Trap or Sound & Safe?",
        trap_explanation="SOUND & SAFE! 7.Nd2! is master-level prophylaxis, unpinning the c3 knight, safeguarding against ...Ne4, and preparing to kick the Black Queen with a3/Qc2.",
        punishment_line=["Bb4", "Qc2", "O-O", "a3"],
    ),
    TrapDrill(
        id="sicilian-development-safe",
        title="Open Sicilian Active Development",
        difficulty="Beginner",
        theme="Rapid Piece Development",
        side_to_move="Black",
        fen="rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4",
        tempted_move_san="Nf6",
        tempted_move_uci="g8f6",
        is_trap=False,
        prompt="In the Open Sicilian after 4.Nxd4, Black plays 4...Nf6 developing and attacking e4. Is this a Poisoned Trap or Sound & Safe?",
        trap_explanation="SOUND & SAFE! 4...Nf6 is universal theory, developing the knight to its natural outpost with tempo while maintaining flexible pawn structure.",
        punishment_line=["Nc3", "a6", "Be3", "e5", "Nb3", "Be6"],
    ),
]


def get_all_traps() -> list[TrapDrill]:
    return CURATED_TRAPS


def get_trap_by_id(trap_id: str) -> TrapDrill | None:
    for t in CURATED_TRAPS:
        if t.id == trap_id:
            return t
    return None
