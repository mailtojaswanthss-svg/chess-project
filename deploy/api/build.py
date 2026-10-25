"""Vercel build step: copy the backend package in and fetch a Linux Stockfish.

Runs from deploy/api after dependencies are installed. Everything it writes is
gitignored and ends up in the function bundle.
"""

from __future__ import annotations

import os
import shutil
import stat
import tarfile
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
STOCKFISH_URL = os.environ.get(
    "STOCKFISH_URL",
    "https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64-avx2.tar",
)


def copy_backend() -> None:
    target = HERE / "chess_trainer"
    shutil.rmtree(target, ignore_errors=True)
    shutil.copytree(REPO / "backend" / "chess_trainer", target, ignore=shutil.ignore_patterns("__pycache__"))
    print(f"Copied backend package to {target}")


def fetch_stockfish() -> None:
    target = HERE / "bin" / "stockfish"
    target.parent.mkdir(exist_ok=True)
    archive = HERE / "bin" / "stockfish.tar"
    print(f"Downloading {STOCKFISH_URL}")
    urllib.request.urlretrieve(STOCKFISH_URL, archive)
    with tarfile.open(archive) as tar:
        member = next(m for m in tar.getmembers() if m.isfile() and Path(m.name).name.startswith("stockfish-"))
        with tar.extractfile(member) as src, open(target, "wb") as dst:
            shutil.copyfileobj(src, dst)
    archive.unlink()
    target.chmod(target.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    print(f"Stockfish ready at {target} ({target.stat().st_size // 1_000_000} MB)")


if __name__ == "__main__":
    copy_backend()
    fetch_stockfish()
