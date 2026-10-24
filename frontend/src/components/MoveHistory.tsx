import React, { useEffect, useRef } from "react";
import type { MovePair } from "../types/chess";

interface MoveHistoryProps {
  movePairs: MovePair[];
  currentMoveIndex?: number;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ movePairs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [movePairs]);

  return (
    <div className="history-card">
      <div className="card-header">
        <span className="card-title">MOVE NOTATION</span>
        <span className="card-meta">{movePairs.length ? `${movePairs.length} rounds` : "Starting"}</span>
      </div>

      <div className="move-table-scroll" ref={scrollRef}>
        {movePairs.length === 0 ? (
          <div className="empty-history-notice">
            <span>No moves yet. Make a move on the board to start!</span>
          </div>
        ) : (
          <div className="move-rows">
            {movePairs.map((pair) => (
              <div key={pair.number} className="move-pair-row">
                <span className="move-number">{pair.number}.</span>
                <span className={`move-cell white ${pair.white ? "filled" : ""}`}>
                  {pair.white?.san ?? "-"}
                </span>
                <span className={`move-cell black ${pair.black ? "filled" : ""}`}>
                  {pair.black?.san ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
