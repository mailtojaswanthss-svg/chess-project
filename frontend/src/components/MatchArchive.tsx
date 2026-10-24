import React from "react";
import { Download, Trash2, Play, Inbox, Eye } from "lucide-react";
import type { SavedGame } from "../types/chess";

interface MatchArchiveProps {
  savedGames: SavedGame[];
  onLoadGame: (game: SavedGame) => void;
  onReviewGame?: (game: SavedGame) => void;
  onDownloadPgn: (game: SavedGame) => void;
  onDeleteGame: (id: string) => void;
  onClearAll: () => void;
}

export const MatchArchive: React.FC<MatchArchiveProps> = ({
  savedGames,
  onLoadGame,
  onReviewGame,
  onDownloadPgn,
  onDeleteGame,
  onClearAll,
}) => {
  return (
    <div className="archive-dashboard">
      <div className="archive-header">
        <div>
          <h3>MATCH ARCHIVE</h3>
          <p>Local games recorded on this device with full move history and PGNs.</p>
        </div>
        {savedGames.length > 0 && (
          <button className="secondary-btn danger-btn" onClick={onClearAll}>
            Clear History
          </button>
        )}
      </div>

      {savedGames.length === 0 ? (
        <div className="archive-empty">
          <Inbox size={40} className="empty-icon" />
          <h4>No Saved Games Yet</h4>
          <p>Complete a match in Play mode or against Stockfish to automatically record games here.</p>
        </div>
      ) : (
        <div className="saved-games-grid">
          {savedGames.map((game) => {
            const dateStr = new Date(game.completedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const isWhiteWin = game.result.toLowerCase().includes("white wins");
            const isBlackWin = game.result.toLowerCase().includes("black wins");
            const badgeClass = isWhiteWin ? "white-win" : isBlackWin ? "black-win" : "draw";

            return (
              <div key={game.id} className="game-card">
                <div className="game-card-top">
                  <span className={`result-tag ${badgeClass}`}>{game.result}</span>
                  <span className="game-date">{dateStr}</span>
                </div>

                <div className="game-card-info">
                  <div className="game-reason">{game.reason}</div>
                  <div className="game-moves-count">{game.moves.length} plies played</div>
                </div>

                <div className="game-card-actions">
                  <button
                    className="secondary-btn btn-sm"
                    onClick={() => onLoadGame(game)}
                    title="Load position on board"
                  >
                    <Play size={13} /> Load
                  </button>
                  {onReviewGame && (
                    <button
                      className="secondary-btn btn-sm review-btn"
                      onClick={() => onReviewGame(game)}
                      title="Analyze with CAPS Review"
                    >
                      <Eye size={13} /> Review
                    </button>
                  )}
                  <button
                    className="secondary-btn btn-sm"
                    onClick={() => onDownloadPgn(game)}
                    title="Download PGN"
                  >
                    <Download size={13} /> PGN
                  </button>
                  <button
                    className="icon-action-btn delete-btn"
                    onClick={() => onDeleteGame(game.id)}
                    title="Delete game"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
