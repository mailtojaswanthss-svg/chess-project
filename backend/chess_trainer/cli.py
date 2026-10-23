from __future__ import annotations

import argparse
from pathlib import Path
import json

from sklearn.model_selection import GroupShuffleSplit

from .config import settings
from .dataset import build_dataset
from .engine import StockfishEvaluator
from .ingest import collect_games, parse_usernames
from .model import train_and_evaluate


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the chess blunder predictor.")
    parser.add_argument("pgn", type=Path)
    parser.add_argument("--output", type=Path, default=settings.model_path)
    parser.add_argument("--stockfish-path", type=Path, default=settings.stockfish_path)
    parser.add_argument("--depth", type=int, default=12)
    parser.add_argument("--blunder-loss-centipawns", type=int, default=settings.blunder_loss_centipawns)
    parser.add_argument(
        "--split-by",
        choices=("player", "game"),
        default="player",
        help="Hold out whole players for generalization testing (default) or games.",
    )
    args = parser.parse_args()
    if args.stockfish_path is None:
        parser.error("--stockfish-path is required or set STOCKFISH_PATH")
    with StockfishEvaluator(args.stockfish_path, depth=args.depth) as evaluator:
        dataset = build_dataset(args.pgn, evaluator, args.blunder_loss_centipawns)
    split_groups = dataset.player_ids if args.split_by == "player" else dataset.game_ids
    if len(set(split_groups.tolist())) < 2:
        raise ValueError(f"Need at least two groups for a {args.split_by}-held-out split")
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_indices, test_indices = next(splitter.split(dataset.features, dataset.labels, split_groups))
    model, evaluation = train_and_evaluate(
        dataset.features[train_indices],
        dataset.labels[train_indices],
        dataset.features[test_indices],
        dataset.labels[test_indices],
        dataset.game_ids[test_indices],
    )
    model.metadata = {
        **(model.metadata or {}),
        "label_definition": {
            "name": "engine_mistake",
            "stockfish_depth": args.depth,
            "loss_threshold_centipawns": args.blunder_loss_centipawns,
            "description": "Played move losing at least the configured centipawns versus Stockfish.",
        },
        "decision_policy": "ranking_only",
        "evaluation_split": {
            "strategy": f"{args.split_by}_held_out",
            "train_groups": sorted(set(split_groups[train_indices].tolist())),
            "test_groups": sorted(set(split_groups[test_indices].tolist())),
        },
    }
    model.save(args.output)
    metrics_path = args.output.with_suffix(".metrics.json")
    metrics_path.write_text(
        json.dumps(model.metadata or {}, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(f"samples={evaluation.sample_count} positive_rate={evaluation.positive_rate:.3f}")
    print(f"accuracy={evaluation.accuracy:.3f} majority_accuracy={evaluation.majority_accuracy:.3f}")
    print(f"roc_auc={evaluation.roc_auc if evaluation.roc_auc is not None else 'undefined'}")
    print(f"precision={evaluation.precision:.3f} recall={evaluation.recall:.3f} f1={evaluation.f1:.3f}")
    print(f"logistic_accuracy={evaluation.logistic_accuracy:.3f} logistic_roc_auc={evaluation.logistic_roc_auc if evaluation.logistic_roc_auc is not None else 'undefined'}")
    print(f"brier_score={evaluation.brier_score:.3f}")
    print(f"calibration_error={evaluation.calibration_error:.3f}")
    print(f"pr_auc={evaluation.pr_auc:.3f} top_decile_lift={evaluation.top_decile_lift:.3f}")
    print(f"brier_skill_vs_base_rate={evaluation.brier_skill_vs_base_rate:.3f}")
    print(f"roc_auc_ci=({evaluation.roc_auc_ci_low:.3f}, {evaluation.roc_auc_ci_high:.3f})")
    print(f"metrics_json={metrics_path}")


def download_main() -> None:
    parser = argparse.ArgumentParser(description="Download and deduplicate public Lichess games.")
    parser.add_argument("usernames", help="Comma- or space-separated Lichess usernames")
    parser.add_argument("--output", type=Path, default=Path("data/raw/multi_user_games.pgn"))
    parser.add_argument("--max-games", type=int, default=100)
    args = parser.parse_args()
    summaries = collect_games(parse_usernames(args.usernames), args.output, args.max_games)
    for summary in summaries:
        suffix = f" ({summary.message})" if summary.message else ""
        print(f"{summary.username}: {summary.status}, games={summary.games_downloaded}{suffix}")
    print(f"output={args.output}")
    print(f"manifest={args.output.with_suffix('.manifest.json')}")
