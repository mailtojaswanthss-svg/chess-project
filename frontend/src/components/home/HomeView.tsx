import "./HomeView.css";
import React, { useEffect, useRef } from "react";
import { ArrowRight, ChevronDown, Crosshair, Info, Swords, Telescope } from "lucide-react";
import type { PlayMode } from "../../types/chess";
import { MODES } from "../arena/PlayToolbar";
import { useStaticHero } from "../../utils/heroGates";
import { IntroBoard } from "./IntroBoard";
import { ScanCheck } from "./ScanCheck";
import { SplitText } from "./SplitText";

// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4, White to play (Blackburne Shilling; checked with
// python-chess). Stockfish depth 20: 4.Nxd4 +1.25, 4.Nxe5? Qg5 -0.60.
const TRAP_FEN = "r1bqkbnr/pppp1ppp/8/4p3/2BnP3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
const BOARD_PROPS = {
  fen: TRAP_FEN,
  tempt: ["f3", "f5", "e5"],
  reply: ["d8", "g5"] as [string, string],
  targets: ["e5", "g2"],
  hold: ["f3", "d3", "d4"],
  label: "Move 4, White to play: the knight could take on e5, but Qg5 would hit the knight and g2. Nxd4 holds.",
};

/** Caption bands in hero scroll progress. Starting points, checked with the flick test. */
const BANDS: [number, number][] = [
  [0, 0.18],
  [0.21, 0.39],
  [0.42, 0.6],
  [0.63, 0.81],
  [0.85, 1],
];

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Board choreography as a pure function of progress */
function boardState(p: number) {
  return {
    zoom: 1 + 0.55 * smooth(p, 0.14, 0.36) - 0.1 * smooth(p, 0.42, 0.52) - 0.45 * smooth(p, 0.82, 0.95),
    tempt: smooth(p, 0.22, 0.33),
    temptOp: 1 - smooth(p, 0.6, 0.7),
    threat: smooth(p, 0.43, 0.53),
    threatOp: 1 - 0.72 * smooth(p, 0.62, 0.72),
    hold: smooth(p, 0.64, 0.74),
    cue: 1 - smooth(p, 0.03, 0.09),
    readout: smooth(p, 0.2, 0.25) * (1 - smooth(p, 0.82, 0.86)),
  };
}

function readoutFor(p: number): { label: string; value: string; tone: string } {
  const down = smooth(p, 0.45, 0.56);
  const up = smooth(p, 0.65, 0.74);
  const v = p < 0.62 ? 1.25 - 1.85 * down : -0.6 + 1.85 * up;
  const value = `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;
  if (p < 0.45) return { label: "Engine eval now", value, tone: "even" };
  if (p < 0.64) return { label: "After 4.Nxe5 Qg5", value, tone: "bad" };
  return { label: "After 4.Nxd4", value, tone: "good" };
}

interface HomeViewProps {
  onStart: (mode?: PlayMode) => void;
  onOpenTraps: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStart, onOpenTraps }) => {
  const isStatic = useStaticHero();

  return (
    <div className="view home">
      {isStatic ? (
        <StaticHero onStart={() => onStart()} onOpenTraps={onOpenTraps} />
      ) : (
        <ScrollHero onStart={() => onStart()} onOpenTraps={onOpenTraps} />
      )}
      <HowItWorks />
      <section className="home-section home-scan" aria-labelledby="scan-title">
        <ScanCheck />
      </section>
      <ModesRail onStart={onStart} />
      <HonestNumbers />
      <FinalCta onStart={() => onStart()} />
    </div>
  );
};

/* ------------------------------------------------------------------------ */
/* The scroll-driven intro                                                   */
/* ------------------------------------------------------------------------ */

const ScrollHero: React.FC<{ onStart: () => void; onOpenTraps: () => void }> = ({ onStart, onOpenTraps }) => {
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const readLabel = useRef<HTMLSpanElement>(null);
  const readValue = useRef<HTMLSpanElement>(null);
  const readChip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    if (!hero || !stage) return;

    // Keep the stage clear of the sticky header, whatever its height
    const topbar = document.querySelector<HTMLElement>(".topbar");
    const syncTop = () => hero.style.setProperty("--topbar-h", `${topbar?.offsetHeight ?? 0}px`);
    syncTop();
    const ro = topbar ? new ResizeObserver(syncTop) : null;
    if (topbar) ro?.observe(topbar);

    let target = 0;
    let shown = 0;
    let rafId: number | null = null;
    let lastTick = 0;
    let onScreen = true;
    let loadK = 0;
    const loadStart = performance.now();
    const LOAD_MS = 900;

    const varCache = new Map<string, number>();
    const setVar = (el: HTMLElement, name: string, v: number, eps = 0.004) => {
      const key = name + (el === stage ? "" : el.dataset.band);
      const prev = varCache.get(key);
      if (prev !== undefined && Math.abs(prev - v) < eps && v !== 0 && v !== 1) return;
      if (prev === v) return;
      varCache.set(key, v);
      el.style.setProperty(name, v.toFixed(3));
    };
    const bandCache = bandRefs.current.map(() => ({ op: -1, live: null as boolean | null }));
    let lastText = "";
    let lastTextAt = 0;
    let lastTone = "";

    const progress = () => {
      const rect = hero.getBoundingClientRect();
      const range = hero.offsetHeight - stage.offsetHeight;
      return range > 0 ? clamp(-rect.top / range) : 0;
    };

    const apply = (p: number, now: number) => {
      const s = boardState(p);
      setVar(stage, "--zoom", s.zoom);
      setVar(stage, "--tempt", s.tempt);
      setVar(stage, "--tempt-op", s.temptOp);
      setVar(stage, "--threat", s.threat);
      setVar(stage, "--threat-op", s.threatOp);
      setVar(stage, "--hold", s.hold);
      setVar(stage, "--cue", s.cue);
      setVar(stage, "--readout", s.readout);

      BANDS.forEach(([a, b], i) => {
        const el = bandRefs.current[i];
        if (!el) return;
        const f = Math.min(0.02, (b - a) / 3);
        const inOp = i === 0 ? 1 : smooth(p, a, a + f);
        const outOp = i === BANDS.length - 1 ? 0 : smooth(p, b - f, b);
        const op = p < a && i > 0 ? 0 : inOp * (1 - outOp);
        const ramp = Number(el.dataset.ramp) || Math.min(0.025, (b - a) * 0.35);
        let k = clamp((p - a) / ramp);
        if (i === 0) k = Math.max(k, loadK);
        const cache = bandCache[i];
        if (Math.abs(op - cache.op) > 0.004 || ((op === 0 || op === 1) && op !== cache.op)) {
          cache.op = op;
          el.style.opacity = op.toFixed(3);
        }
        setVar(el, "--k", k, 0.008);
        const live = op > 0.5;
        if (live !== cache.live) {
          cache.live = live;
          el.classList.toggle("is-live", live);
          if (live) el.removeAttribute("inert");
          else el.setAttribute("inert", "");
        }
      });

      // Small readout: ~10Hz and only when the text changes
      if (now - lastTextAt > 100) {
        const r = readoutFor(p);
        const text = `${r.label}|${r.value}`;
        if (text !== lastText) {
          lastText = text;
          lastTextAt = now;
          if (readLabel.current) readLabel.current.textContent = r.label;
          if (readValue.current) readValue.current.textContent = r.value;
        }
        if (r.tone !== lastTone && readChip.current) {
          lastTone = r.tone;
          readChip.current.dataset.tone = r.tone;
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      loadK = smooth(now - loadStart, 0, LOAD_MS);
      const k = 0.16;
      shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
      const settled = Math.abs(target - shown) < 0.0005;
      if (settled) shown = target;
      apply(shown, now);
      if (settled && loadK >= 1) {
        rafId = null;
        lastTick = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (rafId === null && onScreen) rafId = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      target = progress();
      wake();
    };

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) onScroll();
    });
    io.observe(hero);

    target = shown = progress();
    apply(shown, performance.now());
    rafId = requestAnimationFrame(tick);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);

    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      io.disconnect();
      ro?.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const band = (i: number) => (el: HTMLDivElement | null) => {
    bandRefs.current[i] = el;
  };

  return (
    <section ref={heroRef} className="intro" aria-label="Into the move: a trap, slowed down">
      <div ref={stageRef} className="intro__stage">
        <div className="intro__copy">
          <div ref={band(0)} data-band="0" className="band band--1">
            <p className="home-kicker">Move 4 · White to play</p>
            <h1 className="band__title">
              <SplitText text="Every blunder starts as a move that looks fine." mode="depth" spread={0.3} />
            </h1>
          </div>
          <div ref={band(1)} data-band="1" className="band band--2" data-ramp="0.036">
            <h2 className="band__title">
              <SplitText text="That pawn on e5 looks free." mode="grid" spread={0.5} />
            </h2>
            <p className="band__sub">One knight jump and it's yours. Or so it seems.</p>
          </div>
          <div ref={band(2)} data-band="2" className="band band--3">
            <h2 className="band__title">
              <SplitText text="It isn't. After Nxe5, Qg5 hits the knight and g2 at once." mode="punch" emphasis={["isn't", "Qg5"]} spread={0.5} />
            </h2>
          </div>
          <div ref={band(3)} data-band="3" className="band band--4">
            <h2 className="band__title">
              <SplitText text="ChessWise shows you the move that holds." mode="blur" />
            </h2>
            <p className="band__sub">Nxd4 keeps White ahead. Same position, no trap.</p>
          </div>
          <div ref={band(4)} data-band="4" className="band band--5" data-ramp="0.05">
            <h2 className="band__title band__title--settle">
              <SplitText text="Train smarter. Blunder less." mode="rise" spread={0.4} />
            </h2>
            <p className="band__sub">
              Play real games, see the danger before you move, and drill the mistakes you actually make.
            </p>
            <div className="band__cta">
              <button type="button" className="btn btn--primary home-cta" onClick={onStart}>
                <Swords size={16} aria-hidden="true" /> Start a game
              </button>
              <button type="button" className="btn btn--ghost home-cta-2" onClick={onOpenTraps}>
                Try trap puzzles <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="intro__board">
          <IntroBoard {...BOARD_PROPS} />
          <div ref={readChip} className="intro__readout chip" data-tone="even" aria-hidden="true">
            <span ref={readLabel} className="intro__readout-label">Engine eval now</span>
            <span ref={readValue} className="intro__readout-value num">+1.3</span>
          </div>
        </div>

        <div className="intro__cue" aria-hidden="true">
          <span>Scroll</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------------ */
/* Phones, portrait tablets and reduced motion: the composed resting frame   */
/* ------------------------------------------------------------------------ */

const StaticHero: React.FC<{ onStart: () => void; onOpenTraps: () => void }> = ({ onStart, onOpenTraps }) => (
  <section className="intro-static" aria-labelledby="intro-static-title">
    <div className="intro-static__copy">
      <p className="home-kicker">The pawn on e5 looks free. It isn't.</p>
      <h1 id="intro-static-title" className="band__title band__title--settle">
        Train smarter. Blunder less.
      </h1>
      <p className="band__sub">
        Play real games, see the danger before you move, and drill the mistakes you actually make.
      </p>
      <div className="band__cta">
        <button type="button" className="btn btn--primary home-cta" onClick={onStart}>
          <Swords size={16} aria-hidden="true" /> Start a game
        </button>
        <button type="button" className="btn btn--ghost home-cta-2" onClick={onOpenTraps}>
          Try trap puzzles <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="intro-static__board intro__stage--rest">
      <IntroBoard {...BOARD_PROPS} />
      <div className="intro__readout chip" data-tone="good" aria-hidden="true">
        <span className="intro__readout-label">After 4.Nxd4</span>
        <span className="intro__readout-value num">+1.3</span>
      </div>
    </div>
  </section>
);

/* ------------------------------------------------------------------------ */
/* Below the intro                                                           */
/* ------------------------------------------------------------------------ */

const STEPS = [
  {
    icon: Swords,
    title: "Play a real game.",
    body: "Pick a mode and a strength. Every finished game is saved for review.",
  },
  {
    icon: Telescope,
    title: "See it coming.",
    body: "Before you move: the engine's top three, the threats on the board, and your blunder risk.",
  },
  {
    icon: Crosshair,
    title: "Fix what you miss.",
    body: "Review any game, then drill the patterns your profile says cost you points.",
  },
];

const HowItWorks: React.FC = () => (
  <section className="home-section home-steps reveal-group" aria-labelledby="steps-title">
    <header className="home-section__head">
      <p className="home-kicker">How it works</p>
      <h2 id="steps-title" className="home-h2">Three steps, every game.</h2>
    </header>
    <div className="steps-wrap">
      <svg className="steps__line" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden="true">
        <path d="M 0 4 L 1000 4" pathLength={1} />
      </svg>
      <ol className="steps">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="step" style={{ "--i": i } as React.CSSProperties}>
            <span className="step__badge">
              <Icon size={20} aria-hidden="true" />
              <span className="step__n num">{i + 1}</span>
            </span>
            <h3 className="step__title">{title}</h3>
            <p className="step__body">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const MODE_LINES: Record<PlayMode, string> = {
  free_lab: "Free play with live feedback.",
  max_engine: "Play the engine at the strength you pick.",
  human_sparring: "A human-like opponent at your rating.",
  tricky_bot: "A bot that steers you toward traps.",
  trap_puzzle: "Classic opening traps, played as puzzles.",
};

const ModesRail: React.FC<{ onStart: (mode?: PlayMode) => void }> = ({ onStart }) => (
  <section className="home-section home-modes reveal-group" aria-labelledby="modes-title">
    <header className="home-section__head home-section__head--row">
      <div>
        <p className="home-kicker">Pick your opponent</p>
        <h2 id="modes-title" className="home-h2">Five ways to play.</h2>
      </div>
    </header>
    <ul className="modes-rail">
      {MODES.map(({ id, label, icon: Icon }, i) => (
        <li key={id} style={{ "--i": i } as React.CSSProperties}>
          <button type="button" className="mode-card" onClick={() => onStart(id)}>
            <span className="mode-card__icon">
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="mode-card__name">{label}</span>
            <span className="mode-card__line">{MODE_LINES[id]}</span>
            <span className="mode-card__go" aria-hidden="true">
              Play <ArrowRight size={14} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

const HonestNumbers: React.FC = () => (
  <section className="home-section home-honest reveal-group" aria-labelledby="honest-title">
    <h2 id="honest-title" className="home-h2">Every number tells you what it is.</h2>
    <p className="home-lede">
      Tap the <Info size={15} className="home-honest__i" aria-label="info" /> on any percentage to see what it measures and how
      it's worked out. If the engine or the model isn't connected, you see a dash, never a made-up number.
    </p>
    <ul className="honest-chips">
      {["Blunder risk", "Outlook", "Accuracy"].map((name, i) => (
        <li key={name} className="honest-chip" style={{ "--i": i } as React.CSSProperties}>
          {name}
          <Info size={13} aria-hidden="true" />
        </li>
      ))}
    </ul>
  </section>
);

const FinalCta: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="home-section home-final reveal-group" aria-labelledby="final-title">
    <h2 id="final-title" className="home-h2 home-final__title">Your next game starts here.</h2>
    <span className="home-final__halo">
      <button type="button" className="btn btn--primary home-cta home-final__cta" onClick={onStart}>
        <Swords size={16} aria-hidden="true" /> Start a game
      </button>
    </span>
  </section>
);
