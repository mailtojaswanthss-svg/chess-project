from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, average_precision_score, brier_score_loss, f1_score, precision_recall_curve, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .features import FEATURE_NAMES


@dataclass
class Evaluation:
    train_sample_count: int
    sample_count: int
    positive_rate: float
    accuracy: float
    roc_auc: float | None
    majority_accuracy: float
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0
    logistic_accuracy: float = 0.0
    logistic_roc_auc: float | None = None
    brier_score: float = 0.0
    calibration_error: float = 0.0
    pr_auc: float = 0.0
    top_decile_lift: float = 0.0
    brier_skill_vs_base_rate: float = 0.0
    roc_auc_ci_low: float | None = None
    roc_auc_ci_high: float | None = None
    top_decile_lift_ci_low: float | None = None
    top_decile_lift_ci_high: float | None = None


def expected_calibration_error(labels: np.ndarray, probabilities: np.ndarray, bins: int = 10) -> float:
    boundaries = np.linspace(0.0, 1.0, bins + 1)
    error = 0.0
    for lower, upper in zip(boundaries[:-1], boundaries[1:]):
        selected = (probabilities >= lower) & (
            probabilities < upper if upper < 1.0 else probabilities <= upper
        )
        if np.any(selected):
            error += float(np.mean(selected)) * abs(
                float(np.mean(probabilities[selected])) - float(np.mean(labels[selected]))
            )
    return error


def top_decile_lift(labels: np.ndarray, probabilities: np.ndarray) -> float:
    count = max(1, int(np.ceil(len(labels) * 0.10)))
    top_rate = float(np.mean(labels[np.argsort(probabilities)[-count:]]))
    overall_rate = float(np.mean(labels))
    return top_rate / overall_rate if overall_rate else 0.0


def grouped_bootstrap_intervals(
    labels: np.ndarray,
    probabilities: np.ndarray,
    groups: np.ndarray,
    samples: int = 300,
) -> tuple[tuple[float, float] | None, tuple[float, float] | None]:
    unique_groups = np.unique(groups)
    if len(unique_groups) < 2 or len(np.unique(labels)) < 2:
        return None, None
    rng = np.random.default_rng(42)
    auc_values: list[float] = []
    lift_values: list[float] = []
    for _ in range(samples):
        selected_groups = rng.choice(unique_groups, size=len(unique_groups), replace=True)
        selected = np.concatenate([np.flatnonzero(groups == group) for group in selected_groups])
        sample_labels = labels[selected]
        if len(np.unique(sample_labels)) < 2:
            continue
        sample_probabilities = probabilities[selected]
        auc_values.append(float(roc_auc_score(sample_labels, sample_probabilities)))
        lift_values.append(top_decile_lift(sample_labels, sample_probabilities))
    if not auc_values:
        return None, None
    return (
        (float(np.percentile(auc_values, 2.5)), float(np.percentile(auc_values, 97.5))),
        (float(np.percentile(lift_values, 2.5)), float(np.percentile(lift_values, 97.5))),
    )


@dataclass
class BlunderModel:
    classifier: object
    metadata: dict[str, object] | None = None

    def predict_probability(self, features: np.ndarray) -> float:
        return float(self.classifier.predict_proba(features.reshape(1, -1))[0, 1])

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"feature_names": FEATURE_NAMES, "classifier": self.classifier, "metadata": self.metadata or {}},
            path,
        )

    @classmethod
    def load(cls, path: Path) -> "BlunderModel":
        payload = joblib.load(path)
        if tuple(payload.get("feature_names", ())) != FEATURE_NAMES:
            raise ValueError("Model feature schema does not match this application")
        return cls(payload["classifier"], payload.get("metadata", {}))


def train_and_evaluate(
    train_x: np.ndarray,
    train_y: np.ndarray,
    test_x: np.ndarray,
    test_y: np.ndarray,
    test_groups: np.ndarray | None = None,
) -> tuple[BlunderModel, Evaluation]:
    classifier = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
        min_samples_leaf=2,
    )
    folds = max(2, min(5, int(np.bincount(train_y).min())))
    calibration_split = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
    oof_probabilities = cross_val_predict(
        classifier,
        train_x,
        train_y,
        cv=calibration_split,
        method="predict_proba",
    )[:, 1]
    calibrated_classifier = CalibratedClassifierCV(
        estimator=classifier,
        method="sigmoid",
        cv=calibration_split,
    )
    calibrated_classifier.fit(train_x, train_y)
    probabilities = calibrated_classifier.predict_proba(test_x)[:, 1]
    threshold = 0.5
    predictions = (probabilities >= threshold).astype(int)
    logistic = make_pipeline(
        StandardScaler(),
        LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42),
    )
    logistic.fit(train_x, train_y)
    logistic_predictions = logistic.predict(test_x)
    logistic_probabilities = logistic.predict_proba(test_x)[:, 1]
    logistic_roc_auc = None
    if len(np.unique(test_y)) == 2:
        logistic_roc_auc = float(roc_auc_score(test_y, logistic_probabilities))
    roc_auc = None
    if len(np.unique(test_y)) == 2:
        roc_auc = float(roc_auc_score(test_y, probabilities))
    majority = int(np.mean(train_y) >= 0.5)
    base_rate_brier = float(np.mean((test_y - np.mean(train_y)) ** 2))
    grouped_intervals = grouped_bootstrap_intervals(
        test_y,
        probabilities,
        test_groups if test_groups is not None else np.arange(len(test_y)),
    )
    evaluation = Evaluation(
        train_sample_count=len(train_y),
        sample_count=len(test_y),
        positive_rate=float(np.mean(test_y)),
        accuracy=float(accuracy_score(test_y, predictions)),
        roc_auc=roc_auc,
        majority_accuracy=float(accuracy_score(test_y, np.full(len(test_y), majority))),
        precision=float(precision_score(test_y, predictions, zero_division=0)),
        recall=float(recall_score(test_y, predictions, zero_division=0)),
        f1=float(f1_score(test_y, predictions, zero_division=0)),
        logistic_accuracy=float(accuracy_score(test_y, logistic_predictions)),
        logistic_roc_auc=logistic_roc_auc,
        brier_score=float(brier_score_loss(test_y, probabilities)),
        calibration_error=expected_calibration_error(test_y, probabilities),
        pr_auc=float(average_precision_score(test_y, probabilities)),
        top_decile_lift=top_decile_lift(test_y, probabilities),
        brier_skill_vs_base_rate=(
            1.0 - (float(brier_score_loss(test_y, probabilities)) / base_rate_brier)
            if base_rate_brier else 0.0
        ),
        roc_auc_ci_low=grouped_intervals[0][0] if grouped_intervals[0] else None,
        roc_auc_ci_high=grouped_intervals[0][1] if grouped_intervals[0] else None,
        top_decile_lift_ci_low=grouped_intervals[1][0] if grouped_intervals[1] else None,
        top_decile_lift_ci_high=grouped_intervals[1][1] if grouped_intervals[1] else None,
    )
    metadata = {
        "feature_names": list(FEATURE_NAMES),
        "train_samples": len(train_y),
        "test_samples": len(test_y),
        "positive_rate": float(np.mean(test_y)),
        "metrics": {
            "accuracy": evaluation.accuracy,
            "majority_accuracy": evaluation.majority_accuracy,
            "roc_auc": evaluation.roc_auc,
            "precision": evaluation.precision,
            "recall": evaluation.recall,
            "f1": evaluation.f1,
            "logistic_accuracy": evaluation.logistic_accuracy,
            "logistic_roc_auc": evaluation.logistic_roc_auc,
            "brier_score": evaluation.brier_score,
            "calibration_error": evaluation.calibration_error,
            "decision_threshold": threshold,
            "pr_auc": evaluation.pr_auc,
            "top_decile_lift": evaluation.top_decile_lift,
            "brier_skill_vs_base_rate": evaluation.brier_skill_vs_base_rate,
            "roc_auc_ci_low": evaluation.roc_auc_ci_low,
            "roc_auc_ci_high": evaluation.roc_auc_ci_high,
            "top_decile_lift_ci_low": evaluation.top_decile_lift_ci_low,
            "top_decile_lift_ci_high": evaluation.top_decile_lift_ci_high,
        },
    }
    return BlunderModel(calibrated_classifier, metadata), evaluation
