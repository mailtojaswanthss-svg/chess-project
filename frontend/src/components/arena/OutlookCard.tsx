import "./SidebarCards.css";
import React from "react";
import { Activity, Trophy } from "lucide-react";
import type { SavedGame, WinChances } from "../../types/chess";
import { coachingTakeaway } from "../../utils/chessUtils";

interface OutlookCardProps {
  winChances?: WinChances | null;
  isCheck: boolean;
  moveCount: number;
  riskScore: number;
  lastMoveSan?: string;
  outcome?: SavedGame | null;
}

function statusLine(isCheck: boolean, moveCount: number, riskScore: number): { tone: string; text: string } {
  if (isCheck) return { tone: "danger", text: "King in check: legal replies are limited." };
  if (moveCount <= 6) return { tone: "accent", text: "Opening: standard development keeps risk low." };
  if (riskScore >= 0.65) return { tone: "danger", text: "High tension: a careless move is likely to be punished." };
  if (riskScore >= 0.35) return { tone: "warn", text: "Sharp position: check every forcing reply." };
  return { tone: "good", text: "Stable: pieces defended, king secure." };
}

export const OutlookCard: React.FC<OutlookCardProps> = ({
  winChances,
  isCheck,
  moveCount,
  riskScore,
  lastMoveSan,
  outcome,
}) => {
  if (outcome) {
    const result = outcome.result.toLowerCase();
    const score = result.includes("draw") ? "½–½" : result.includes("white wins") ? "1–0" : "0–1";
    return (
      <section className="card outlook outlook--final" aria-label="Game result">
        <header className="card__header">
          <h2 className="card__title">
            <Trophy size={16} /> {outcome.result}
          </h2>
          <span className="outlook-score num">{score}</span>
        </header>
        <p className="card__body">{coachingTakeaway(outcome)}</p>
        <p className="outlook-foot">
          Decided by {outcome.reason.toLowerCase()} after <span className="num">{outcome.moves.length}</span> plies.
          Undo to take it back, or review it from Games &amp; Settings.
        </p>
      </section>
    );
  }

  const status = statusLine(isCheck, moveCount, riskScore);
  const pct = (v: number) => Math.round(v * 100);

  return (
    <section className="card outlook" aria-label="Position outlook">
      <header className="card__header">
        <h2 className="card__title">
          <Activity size={16} /> Outlook
        </h2>
        {lastMoveSan && (
          <span className="card__meta">
            Last move <span className="num outlook-last">{lastMoveSan}</span>
          </span>
        )}
      </header>

      {winChances ? (
        <div className="wdl">
          <div className="wdl__bar" role="img" aria-label={`White ${pct(winChances.white)}%, draw ${pct(winChances.draw)}%, Black ${pct(winChances.black)}%`}>
            <span className="wdl__seg wdl__seg--white" style={{ flexGrow: winChances.white }} />
            <span className="wdl__seg wdl__seg--draw" style={{ flexGrow: winChances.draw }} />
            <span className="wdl__seg wdl__seg--black" style={{ flexGrow: winChances.black }} />
          </div>
          <div className="wdl__legend">
            <span>White <span className="num">{pct(winChances.white)}%</span></span>
            <span>Draw <span className="num">{pct(winChances.draw)}%</span></span>
            <span>Black <span className="num">{pct(winChances.black)}%</span></span>
          </div>
        </div>
      ) : (
        <div className="skeleton wdl-skeleton" />
      )}

      <p className={`outlook-status outlook-status--${status.tone}`}>
        <span className="live-dot" />
        {status.text}
      </p>
    </section>
  );
};
