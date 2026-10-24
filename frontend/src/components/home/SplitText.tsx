import React, { useMemo } from "react";

/**
 * Scroll-scrubbed entrances. The parent band writes `--k` (0..1 assembly progress);
 * each word or character reads its own threshold from the seeded values set here,
 * so the "random" offsets are identical on every load and fully reversible.
 */
export type SplitMode = "depth" | "grid" | "punch" | "blur" | "rise";

interface SplitTextProps {
  text: string;
  mode: SplitMode;
  /** Words to give the bigger overshoot in "punch" mode */
  emphasis?: string[];
  /** How long the stagger runs, in progress units of the band */
  spread?: number;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Var = React.CSSProperties & Record<`--${string}`, string | number>;

export const SplitText: React.FC<SplitTextProps> = ({ text, mode, emphasis = [], spread = 0.45 }) => {
  const words = useMemo(() => {
    const rand = rng(hash(text));
    const list = text.split(" ");
    const totalChars = list.reduce((n, w) => n + w.length, 0) || 1;
    let charIndex = 0;
    return list.map((word, wi) => {
      const wordStyle: Var = {};
      if (mode === "punch") wordStyle["--th"] = ((wi / list.length) * spread).toFixed(3);
      if (mode === "rise" || mode === "depth") wordStyle["--th"] = ((wi / list.length) * spread).toFixed(3);
      const chars = [...word].map((ch) => {
        const style: Var = {};
        if (mode === "grid") {
          style["--th"] = ((charIndex / totalChars) * spread + rand() * 0.06).toFixed(3);
          style["--jx"] = `${(-18 - rand() * 26).toFixed(1)}px`;
        }
        charIndex++;
        return { ch, style };
      });
      const em = emphasis.includes(word.replace(/[.,!?]/g, ""));
      return { word, wordStyle, chars, em };
    });
  }, [text, mode, emphasis, spread]);

  const visual = (
    <>
      {words.map((w, wi) => (
        <React.Fragment key={wi}>
          <span className={`w${w.em ? " em" : ""}`} style={w.wordStyle}>
            {mode === "grid"
              ? w.chars.map((c, ci) => (
                  <span key={ci} className="c" style={c.style}>
                    {c.ch}
                  </span>
                ))
              : w.word}
          </span>
          {wi < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </>
  );

  return (
    <>
      <span className="sr-only">{text}</span>
      {mode === "blur" ? (
        <span className="split split--blur" aria-hidden="true">
          <span className="split__soft">{text}</span>
          <span className="split__sharp">{text}</span>
        </span>
      ) : (
        <span className={`split split--${mode}`} aria-hidden="true">
          {visual}
        </span>
      )}
    </>
  );
};
