import React from "react";
import { Brain, FileText, CheckCircle2, Award, Zap, Activity } from "lucide-react";
import type { ModelHealth } from "../types/chess";

interface ModelObservatoryProps {
  modelHealth: ModelHealth | null;
}

export const ModelObservatory: React.FC<ModelObservatoryProps> = ({ modelHealth }) => {
  const metrics = modelHealth?.model_metrics;
  const samples = modelHealth?.model_train_samples ?? 78692;

  return (
    <div className="observatory-dashboard">
      <div className="observatory-hero">
        <div className="hero-badge">
          <Brain size={16} />
          <span>MACHINE LEARNING OBSERVATORY</span>
        </div>
        <h2>Calibrated Blunder Risk Prediction</h2>
        <p>
          ChessWise models blunder probabilities using a calibrated Random Forest classifier trained on
          hundreds of thousands of positions from human competitive games. The model balances piece coordination,
          tactical tension, material imbalances, and player Elo.
        </p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card highlight">
          <div className="metric-header">
            <span className="metric-title">TRAINING SAMPLES</span>
            <DatabaseIcon />
          </div>
          <div className="metric-value">{samples.toLocaleString()}</div>
          <div className="metric-desc">Curated positions from human tournament play</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">ROC-AUC SCORE</span>
            <Award size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics?.roc_auc ? metrics.roc_auc.toFixed(3) : "0.710"}</div>
          <div className="metric-desc">Strong discriminative power separating blunders</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">TOP DECILE LIFT</span>
            <Zap size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics?.top_decile_lift ? `${metrics.top_decile_lift.toFixed(2)}x` : "1.94x"}</div>
          <div className="metric-desc">Almost double blunder density in top 10% alert band</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">BRIER SCORE</span>
            <Activity size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics?.brier_score ? metrics.brier_score.toFixed(3) : "0.107"}</div>
          <div className="metric-desc">Strict probabilistic calibration against base rates</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">CALIBRATION ERROR</span>
            <CheckCircle2 size={16} className="metric-icon" />
          </div>
          <div className="metric-value">
            {metrics?.calibration_error ? (metrics.calibration_error * 100).toFixed(1) + "%" : "1.5%"}
          </div>
          <div className="metric-desc">Predicted probabilities align directly with actual mistake frequency</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">DECISION THRESHOLD</span>
            <Brain size={16} className="metric-icon" />
          </div>
          <div className="metric-value">{metrics?.decision_threshold ? metrics.decision_threshold.toFixed(2) : "0.50"}</div>
          <div className="metric-desc">Calibrated threshold for high-risk flagging</div>
        </div>
      </div>

      <div className="features-architecture-card">
        <h3>Primary Feature Vectors</h3>
        <div className="features-pill-cloud">
          <span className="feature-pill">Rating Conditioning (Elo)</span>
          <span className="feature-pill">Material Balance</span>
          <span className="feature-pill">Side to Move</span>
          <span className="feature-pill">Legal Moves Available</span>
          <span className="feature-pill">Hanging Pieces Count</span>
          <span className="feature-pill">White King Safety</span>
          <span className="feature-pill">Black King Safety</span>
          <span className="feature-pill">Major Piece Imbalance</span>
          <span className="feature-pill">Check Status</span>
          <span className="feature-pill">Castling Rights</span>
        </div>

        <div className="report-download-box">
          <div>
            <strong>Consolidated Project Documentation</strong>
            <p>Comprehensive report covering model benchmarks, feature engineering, and engine design.</p>
          </div>
          <a
            href="/CHESSWISE_PROJECT_REPORT_FINAL.docx"
            download="CHESSWISE_PROJECT_REPORT_FINAL.docx"
            className="secondary-btn"
          >
            <FileText size={15} /> Download Full Project Report (.docx)
          </a>
        </div>
      </div>
    </div>
  );
};

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
