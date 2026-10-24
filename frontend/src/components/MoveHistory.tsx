import "./MoveHistory.css";
import React, { useEffect, useRef } from "react";
import { ListOrdered } from "lucide-react";
import type { MovePair } from "../types/chess";

interface MoveHistoryProps {
  movePairs: MovePair[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ movePairs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const last = movePairs[movePairs.length - 1];
  const lastIsBlack = Boolean(last?.black);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [movePairs]);

  return (
    <section className="card history" aria-label="Move list">
      <header className="card__header">
        <h2 className="card__title">
          <ListOrdered size={16} /> Moves
        </h2>
        <span className="card__meta num">{movePairs.length ? `${movePairs.length} moves` : "Start"}</span>
      </header>

      {movePairs.length === 0 ? (
        <p className="card__empty">No moves yet. Drag or click a piece to begin.</p>
      ) : (
        <div className="history-scroll" ref={scrollRef}>
          <ol className="history-rows">
            {movePairs.map((pair, idx) => {
              const isLast = idx === movePairs.length - 1;
              return (
                <li key={pair.number} className="history-row">
                  <span className="history-no num">{pair.number}.</span>
                  <span className={`history-move num ${isLast && !lastIsBlack ? "is-current" : ""}`}>
                    {pair.white?.san ?? "…"}
                  </span>
                  <span className={`history-move num ${isLast && lastIsBlack ? "is-current" : ""}`}>
                    {pair.black?.san ?? ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};
