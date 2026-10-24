import "./MetricInfo.css";
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { METRIC_COPY, type MetricKey } from "../utils/metricCopy";

interface MetricInfoProps {
  metric: MetricKey;
  /** Shown instead of the usual caveat when the number isn't available */
  unavailableReason?: string | null;
  className?: string;
}

const GAP = 8;
const WIDTH = 300;

/**
 * Small ⓘ button that explains what a number means and how it's calculated.
 * The popover is portalled to <body> so panels with overflow or `contain`
 * can't clip it, and a transformed ancestor can't offset it.
 */
export const MetricInfo: React.FC<MetricInfoProps> = ({ metric, unavailableReason, className = "" }) => {
  const copy = METRIC_COPY[metric];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 16);
    const popHeight = popRef.current?.offsetHeight ?? 180;
    const above = rect.bottom + GAP + popHeight > window.innerHeight && rect.top - GAP - popHeight > 0;
    setPos({ top: above ? rect.top - GAP - popHeight : rect.bottom + GAP, left, above });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`metric-info ${open ? "is-open" : ""} ${className}`}
        aria-label={`What is ${copy.title.toLowerCase()}?`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info size={13} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={id}
            role="dialog"
            aria-label={copy.title}
            className={`metric-pop ${pos?.above ? "is-above" : ""}`}
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: Math.min(WIDTH, window.innerWidth - 32) }}
          >
            <strong className="metric-pop__title">{copy.title}</strong>
            <p className="metric-pop__what">{copy.what}</p>
            <p className="metric-pop__how">
              <span className="metric-pop__label">How it's calculated</span>
              {copy.how}
            </p>
            {unavailableReason ? (
              <p className="metric-pop__note metric-pop__note--warn">{unavailableReason}</p>
            ) : (
              copy.note && <p className="metric-pop__note">{copy.note}</p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

/** Placeholder for a number the backend couldn't produce. */
export const Unavailable: React.FC<{ reason: string }> = ({ reason }) => (
  <span className="metric-unavailable" title={reason}>
    <span className="num" aria-hidden="true">—</span>
    <span className="metric-unavailable__text">{reason}</span>
  </span>
);

export const NEEDS_MODEL = "Needs the blunder model";
export const NEEDS_ENGINE = "Needs Stockfish";
