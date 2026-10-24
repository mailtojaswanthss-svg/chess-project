import React, { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

/** Square centre in board units (White at the bottom): "e5" -> [4.5, 3.5] */
const at = (sq: string): [number, number] => [sq.charCodeAt(0) - 96 - 0.5, 8 - Number(sq[1]) + 0.5];

const pts = (...squares: string[]) => squares.map((s) => at(s).join(",")).join(" ");

/** Arrowhead triangle at `to`, pointing away from `from` */
function head(from: string, to: string, size = 0.34): string {
  const [x1, y1] = at(from);
  const [x2, y2] = at(to);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * size;
  const by = y2 - uy * size;
  const w = size * 0.62;
  return `${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`;
}

interface IntroBoardProps {
  fen: string;
  /** Knight path shown as the tempting move (amber), e.g. ["f3", "f5", "e5"] */
  tempt: string[];
  /** The punishing reply (red), from and to */
  reply: [string, string];
  /** Squares the reply hits */
  targets: string[];
  /** The move that holds (green) */
  hold: string[];
  label: string;
}

export const IntroBoard: React.FC<IntroBoardProps> = ({ fen, tempt, reply, targets, hold, label }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      setSize((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const temptEnd = tempt[tempt.length - 1];
  const temptPrev = tempt[tempt.length - 2];
  const holdEnd = hold[hold.length - 1];
  const holdPrev = hold[hold.length - 2];
  const [rx, ry] = at(reply[1]);

  return (
    <div className="intro-frame" ref={frameRef} role="img" aria-label={label}>
      <div className="intro-cam">
        {size > 0 && (
          <Chessboard
            id={`intro-${label.length}`}
            position={fen}
            boardWidth={size}
            arePiecesDraggable={false}
            customBoardStyle={{ borderRadius: "0" }}
            customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
            customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
            showBoardNotation
            animationDuration={0}
          />
        )}
        <svg className="intro-ink" viewBox="0 0 8 8" aria-hidden="true">
          {/* The tempting knight jump */}
          <g className="ink ink--tempt">
            <polyline className="ink__line" points={pts(...tempt)} pathLength={1} />
            <polygon className="ink__head" points={head(temptPrev, temptEnd)} />
          </g>
          {/* The reply and the two squares it hits */}
          <g className="ink ink--threat">
            <polyline className="ink__line" points={pts(...reply)} pathLength={1} />
            <polygon className="ink__head" points={head(reply[0], reply[1])} />
            {targets.map((sq) => {
              const [x, y] = at(sq);
              return <line key={sq} className="ink__ray" x1={rx} y1={ry} x2={x} y2={y} />;
            })}
            {targets.map((sq) => {
              const [x, y] = at(sq);
              return <circle key={sq} className="ink__ring" cx={x} cy={y} r={0.42} />;
            })}
          </g>
          {/* The move that holds */}
          <g className="ink ink--hold">
            <polyline className="ink__line" points={pts(...hold)} pathLength={1} />
            <polygon className="ink__head" points={head(holdPrev, holdEnd)} />
          </g>
        </svg>
      </div>
    </div>
  );
};
