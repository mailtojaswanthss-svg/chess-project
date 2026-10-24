import React, { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { RotateCcw, ScanLine } from "lucide-react";
import { useReducedMotion } from "../../utils/heroGates";

// After 4.Nxe5 Qg5 (checked with python-chess): e5 and g2 are attacked with no
// defender; c2 and d2 are attacked but covered.
const SCAN_FEN = "r1b1kbnr/pppp1ppp/8/4N1q1/2BnP3/8/PPPP1PPP/RNBQK2R w KQkq - 1 5";
const LOOSE = ["e5", "g2"];
const COVERED = ["c2", "d2"];
const HOLD_MS = 1400;

const at = (sq: string): [number, number] => [sq.charCodeAt(0) - 96 - 0.5, 8 - Number(sq[1]) + 0.5];

export const ScanCheck: React.FC = () => {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [done, setDone] = useState(false);
  const progress = useRef(0);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const written = useRef(-1);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const write = (v: number) => {
    if (Math.abs(v - written.current) < 0.004 && v !== 0 && v !== 1) return;
    written.current = v;
    rootRef.current?.style.setProperty("--hold", v.toFixed(3));
  };

  const tick = useCallback((now: number) => {
    const dt = Math.min(64, now - (last.current || now));
    last.current = now;
    // Builds while held; letting go eases it back down instead of snapping to zero
    const next = holding.current
      ? progress.current + dt / HOLD_MS
      : progress.current - (dt / HOLD_MS) * 1.6 * Math.max(0.35, progress.current);
    progress.current = Math.min(1, Math.max(0, next));
    write(progress.current);
    if (progress.current >= 1) {
      holding.current = false;
      raf.current = null;
      last.current = 0;
      setDone(true);
      return;
    }
    if (progress.current <= 0 && !holding.current) {
      raf.current = null;
      last.current = 0;
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  const start = () => {
    if (done) return;
    if (reduced) {
      progress.current = 1;
      write(1);
      setDone(true);
      return;
    }
    holding.current = true;
    if (raf.current === null) raf.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!holding.current) return;
    holding.current = false;
    if (raf.current === null && progress.current > 0) raf.current = requestAnimationFrame(tick);
  };

  const reset = () => {
    progress.current = 0;
    write(0);
    setDone(false);
  };

  useEffect(() => () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div ref={rootRef} className={`scan ${done ? "is-done" : ""}`}>
      <div
        className="scan__board"
        ref={frameRef}
        role="img"
        aria-label="Position after 4.Nxe5 Qg5. White to play."
        style={{ "--scan-h": `${size}px` } as React.CSSProperties}
      >
        {size > 0 && (
          <Chessboard
            id="scan-board"
            position={SCAN_FEN}
            boardWidth={size}
            arePiecesDraggable={false}
            customBoardStyle={{ borderRadius: "0" }}
            customDarkSquareStyle={{ backgroundColor: "var(--board-dark)" }}
            customLightSquareStyle={{ backgroundColor: "var(--board-light)" }}
            animationDuration={0}
          />
        )}
        <span className="scan__line" aria-hidden="true" />
        <svg className="scan__ink" viewBox="0 0 8 8" aria-hidden="true">
          {COVERED.map((sq, i) => {
            const [x, y] = at(sq);
            return <circle key={sq} className="scan__ring scan__ring--covered" cx={x} cy={y} r={0.4} style={{ "--i": i + 2 } as React.CSSProperties} />;
          })}
          {LOOSE.map((sq, i) => {
            const [x, y] = at(sq);
            return <circle key={sq} className="scan__ring scan__ring--loose" cx={x} cy={y} r={0.42} style={{ "--i": i } as React.CSSProperties} />;
          })}
        </svg>
      </div>

      <div className="scan__copy">
        <p className="home-kicker">Your turn</p>
        <h2 id="scan-title" className="home-h2">Check before you move.</h2>
        <p className="home-lede">
          This is the position after 4.Nxe5 Qg5. Hold the button and run the check a strong player runs before every move.
        </p>

        {done ? (
          <div className="scan__result" role="status">
            <p className="scan__found">
              <strong>Two loose targets.</strong> The knight on e5 and the pawn on g2 have no defender, and the queen hits both.
            </p>
            <p className="scan__note">c2 and d2 are attacked too, but they're covered.</p>
            <button type="button" className="btn btn--ghost btn--sm scan__again" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" /> Scan again
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--primary scan__hold"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                start();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") stop();
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="scan__meter" aria-hidden="true" />
            <ScanLine size={16} aria-hidden="true" />
            <span>{reduced ? "Show loose pieces" : "Hold to scan the board"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
