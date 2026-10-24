"""CLI Runner for Chess Coach LLM & Heuristic Evals."""

import json
from pathlib import Path
from evals.evaluator import run_coach_benchmarks


def main() -> None:
    print("\n" + "=" * 70)
    print("[AI COACH EVALS] CHESSWISE COACH EVALUATION SUITE (LLM / AGENT BENCHMARK)")
    print("=" * 70 + "\n")

    report = run_coach_benchmarks()

    print(f"{'BENCHMARK ID':<24} | {'MOTIF':<14} | {'STATUS':<8} | {'LATENCY':<8}")
    print("-" * 70)
    for res in report.results:
        status = "[PASS]" if (res.schema_passed and res.motif_matched and res.hallucination_free) else "[FAIL]"
        print(f"{res.benchmark_id:<24} | {res.ground_truth_motif:<14} | {status:<8} | {res.latency_ms:>6.1f}ms")

    print("\n" + "=" * 70)
    print("[METRICS] AGGREGATE EVALUATION METRICS")
    print("=" * 70)
    print(f"Total Benchmark Positions : {report.total_benchmarks}")
    print(f"Schema Adherence Rate     : {report.schema_pass_rate}%")
    print(f"Tactical Motif Recall     : {report.motif_recall}%")
    print(f"Hallucination-Free Rate   : {report.hallucination_free_rate}%")
    print(f"Mean Response Latency     : {report.avg_latency_ms:.2f} ms")
    print(f"OVERALL EVAL SCORE        : {report.overall_eval_score} / 100")
    print("=" * 70 + "\n")

    out_file = Path("eval_report.json")
    out_file.write_text(json.dumps(report.model_dump(), indent=2), encoding="utf-8")
    print(f"Saved evaluation report artifact to: {out_file.resolve()}\n")


if __name__ == "__main__":
    main()
