import "./SidebarCards.css";
import React from "react";
import { Brain, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import type { CoachExplanation } from "../../types/chess";

interface CoachCardProps {
  coachAdvice?: CoachExplanation | null;
  fallbackText: string;
  onFetchCoachAdvice?: () => void;
  isFetchingCoachAdvice?: boolean;
  disabled?: boolean;
}

export const CoachCard: React.FC<CoachCardProps> = ({
  coachAdvice,
  fallbackText,
  onFetchCoachAdvice,
  isFetchingCoachAdvice = false,
  disabled = false,
}) => (
  <section className={`card coach ${coachAdvice ? "has-advice" : ""}`} aria-label="Grandmaster coach">
    <header className="card__header">
      <h2 className="card__title">
        <Brain size={16} /> GM coach
      </h2>
      {onFetchCoachAdvice && (
        <button
          className="btn btn--sm btn--primary coach-ask"
          onClick={onFetchCoachAdvice}
          disabled={isFetchingCoachAdvice || disabled}
        >
          {isFetchingCoachAdvice ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          {isFetchingCoachAdvice ? "Thinking" : coachAdvice ? "Ask again" : "Ask the coach"}
        </button>
      )}
    </header>

    {isFetchingCoachAdvice && !coachAdvice ? (
      <div className="coach-loading" aria-busy="true">
        <div className="skeleton" style={{ height: 14, width: "55%" }} />
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, width: "80%" }} />
      </div>
    ) : coachAdvice ? (
      <div key={coachAdvice.headline} className="coach-advice">
        <div className="coach-meta">
          <span className="pill pill--violet">{coachAdvice.concept}</span>
          <span className="coach-source">{coachAdvice.engine_source}</span>
        </div>
        <h3 className="coach-headline">{coachAdvice.headline}</h3>
        <p className="card__body">{coachAdvice.explanation}</p>
        {coachAdvice.threat_summary && (
          <p className="coach-threat">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{coachAdvice.threat_summary}</span>
          </p>
        )}
        <div className="coach-rec">
          <span className="coach-rec__label">Play</span>
          <span className="coach-rec__move num">{coachAdvice.recommended_move}</span>
        </div>
        {coachAdvice.tactical_tags.length > 0 && (
          <div className="coach-tags">
            {coachAdvice.tactical_tags.map((tag) => (
              <span key={tag} className="coach-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    ) : (
      <p className="card__body">{fallbackText}</p>
    )}
  </section>
);
