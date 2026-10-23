from __future__ import annotations

import hashlib
import io
import json
import time
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import chess.pgn


@dataclass
class DownloadSummary:
    username: str
    games_downloaded: int
    bytes_downloaded: int
    status: str
    message: str | None = None


def _fetch_games(username: str, max_games: int, attempts: int = 3) -> bytes:
    url = f"https://lichess.org/api/games/user/{username}?max={max_games}&clocks=true&evals=false&opening=false"
    request = Request(url, headers={"Accept": "application/x-chess-pgn", "User-Agent": "chesswise/0.1"})
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urlopen(request, timeout=60) as response:
                return response.read()
        except HTTPError as exc:
            if exc.code == 404:
                raise RuntimeError(f"No public games found for Lichess user: {username}") from exc
            last_error = exc
        except (URLError, ConnectionResetError, TimeoutError) as exc:
            last_error = exc
        if attempt < attempts - 1:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Could not reach Lichess for {username} after {attempts} attempts: {last_error}") from last_error


def _parse_games(content: bytes) -> list[chess.pgn.Game]:
    text = content.decode("utf-8")
    handle = io.StringIO(text)
    games: list[chess.pgn.Game] = []
    while game := chess.pgn.read_game(handle):
        games.append(game)
    return games


def _game_key(game: chess.pgn.Game) -> str:
    headers = "|".join(f"{key}={game.headers.get(key, '')}" for key in ("Site", "Date", "Round", "White", "Black"))
    moves = " ".join(move.uci() for move in game.mainline_moves())
    return hashlib.sha256(f"{headers}|{moves}".encode("utf-8")).hexdigest()


def collect_games(usernames: list[str], output_path: Path, max_games: int = 100) -> list[DownloadSummary]:
    unique_games: dict[str, chess.pgn.Game] = {}
    summaries: list[DownloadSummary] = []
    for raw_username in usernames:
        username = raw_username.strip()
        if not username:
            continue
        try:
            content = _fetch_games(username, max_games)
            games = _parse_games(content)
            added = 0
            for game in games:
                key = _game_key(game)
                if key not in unique_games:
                    unique_games[key] = game
                    added += 1
            summaries.append(DownloadSummary(username, added, len(content), "ok"))
        except RuntimeError as exc:
            summaries.append(DownloadSummary(username, 0, 0, "error", str(exc)))

    if not unique_games:
        raise ValueError("No playable games were downloaded. " + "; ".join(summary.message or summary.username for summary in summaries))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for index, game in enumerate(unique_games.values()):
            if index:
                handle.write("\n\n")
            print(game, file=handle, end="")

    manifest = {
        "usernames": usernames,
        "unique_games": len(unique_games),
        "summaries": [asdict(summary) for summary in summaries],
    }
    manifest_path = output_path.with_suffix(".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return summaries


def parse_usernames(value: str) -> list[str]:
    return [username for username in re.split(r"[,\s]+", value) if username]
