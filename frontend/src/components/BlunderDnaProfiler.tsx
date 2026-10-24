import "./BlunderDnaProfiler.css";
import React, { useState, useEffect } from "react";
import { Crosshair, Sparkles, Flame, GraduationCap, ShieldCheck, AlertOctagon, Puzzle, TrendingUp, Gamepad2 } from "lucide-react";
import { useCountUp } from "../utils/useCountUp";
import type { BlunderDnaReport, BlunderDnaDimensions, SavedGame } from "../types/chess";
import { playSound } from "../utils/audio";
import { MetricInfo } from "./MetricInfo";

interface BlunderDnaProfilerProps {
  savedGames: SavedGame[];
  apiUrl?: string;
  onNavigateAcademy?: (lessonId?: string) => void;
  onPracticePuzzles?: () => void;
}

const PRESET_ARCHETYPES: Record<string, { dims: BlunderDnaDimensions; name: string; title: string }> = {
  swashbuckler: {
    name: "The Swashbuckler",
    title: "Aggressive Romantic Gambler",
    dims: { pins: 45, hanging_pieces: 82, overloaded_defenders: 60, back_rank: 25, time_scramble: 38, pawn_structure: 30 },
  },
  tunnelVision: {
    name: "The Tunnel-Vision Invader",
    title: "Offensive Monomaniac",
    dims: { pins: 35, hanging_pieces: 30, overloaded_defenders: 55, back_rank: 88, time_scramble: 40, pawn_structure: 35 },
  },
  glassCannon: {
    name: "The Glass Cannon",
    title: "High-Variance Tactician",
    dims: { pins: 52, hanging_pieces: 65, overloaded_defenders: 85, back_rank: 30, time_scramble: 45, pawn_structure: 40 },
  },
  speedster: {
    name: "The Impulsive Speedster",
    title: "Clock-Pressured Intuitive",
    dims: { pins: 30, hanging_pieces: 48, overloaded_defenders: 40, back_rank: 35, time_scramble: 85, pawn_structure: 70 },
  },
  grandmaster: {
    name: "The Grandmaster Prodigy",
    title: "Ironclad Positionalist",
    dims: { pins: 18, hanging_pieces: 15, overloaded_defenders: 20, back_rank: 12, time_scramble: 22, pawn_structure: 19 },
  },
};

export const BlunderDnaProfiler: React.FC<BlunderDnaProfilerProps> = ({
  savedGames,
  apiUrl = "http://127.0.0.1:8000",
  onNavigateAcademy,
  onPracticePuzzles,
}) => {
  const [profile, setProfile] = useState<BlunderDnaReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAxis, setSelectedAxis] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const fetchProfile = async (games: SavedGame[]) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/blunder-dna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send each game with the colour you played, so only your positions are counted
        body: JSON.stringify({
          games: games
            .filter((g) => g.pgn)
            .map((g) => ({ pgn: g.pgn, player_color: g.playerColor ?? null })),
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as BlunderDnaReport;
        setProfile(data);
        setIsOffline(false);
      }
    } catch {
      setIsOffline(true);
      // Fallback baseline if server unreached
      setProfile({
        dimensions: {
          pins: 42,
          hanging_pieces: 58,
          overloaded_defenders: 38,
          back_rank: 25,
          time_scramble: 45,
          pawn_structure: 35,
        },
        archetype: {
          name: "The Dynamic Pragmatist",
          title: "Balanced Competitive Fighter",
          quote: "A versatile tactical fighter with dangerous attacking flashes and occasional blind spots.",
          badge_color: "#3b82f6",
          dominant_flaw: "Hanging Pieces & Loose Outposts",
          strengths: ["Fast opening tempo", "Active counter-play", "Sharp tactical initiative"],
          blind_spots: ["Leaves unprotected minor pieces during flank attacks", "Rushes in complex time pressure"],
          training_prescription: "Implement a disciplined LPDO (Loose Pieces Drop Off) scan before committing to forward thrusts.",
        },
        resilience_score: 72,
        games_analyzed: 0,
        blunders_detected: 0,
        is_sample: true,
        critical_advice: [
          "Scan all unprotected pieces ('LPDO') before selecting a candidate move.",
          "Ensure your king has an escape square before committing heavy pieces to the attack.",
          "Double check for enemy alignment rays against your Queen.",
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(savedGames);
  }, [savedGames]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreset = (key: string) => {
    playSound("click");
    setActivePreset(key);
    const p = PRESET_ARCHETYPES[key];
    if (!p) return;

    const avg = Object.values(p.dims).reduce((a, b) => a + b, 0) / 6;
    const resilience = Math.max(20, Math.min(96, Math.round(100 - avg * 0.75)));

    setProfile({
      dimensions: p.dims,
      archetype: {
        name: p.name,
        title: p.title,
        quote:
          key === "swashbuckler"
            ? "Charges fearlessly into tactical firestorms, sacrificing structure for rapid tactical blows."
            : key === "tunnelVision"
            ? "Laser-focused on the opponent's king while neglecting foundational back-rank corridors."
            : key === "glassCannon"
            ? "Deploys devastating attacking ideas, but crumbles when defenders are deflected."
            : key === "speedster"
            ? "Plays with instinctive lightning speed, but bleeds tactical accuracy in acute scrambles."
            : "Patient, deeply calculating positional master with near-zero tactical oversights.",
        badge_color:
          key === "swashbuckler"
            ? "#f97316"
            : key === "tunnelVision"
            ? "#e5675a"
            : key === "glassCannon"
            ? "#ec4899"
            : key === "speedster"
            ? "#e8b44c"
            : "#5fd08a",
        dominant_flaw:
          key === "swashbuckler"
            ? "Hanging Pieces (82% Leak Rate)"
            : key === "tunnelVision"
            ? "Back-Rank Corridor Blindspot (88% Leak Rate)"
            : key === "glassCannon"
            ? "Overloaded Defenders (85% Leak Rate)"
            : key === "speedster"
            ? "Time Scramble Blunders (85% Leak Rate)"
            : "Subtle Pawn Structure Imbalances (19% Leak Rate)",
        strengths: ["Dynamic initiative", "Flank breakthroughs", "Uncompromising fighting spirit"],
        blind_spots: ["Tactical prophylaxis", "Defensive patience", "Proactive King safety"],
        training_prescription:
          key === "swashbuckler"
            ? "Drill Nunn's LPDO rule on every candidate move."
            : key === "tunnelVision"
            ? "Create luft (h3/h6) prior to opening heavy piece infiltration lines."
            : key === "glassCannon"
            ? "Anchor primary defenders with redundant support."
            : key === "speedster"
            ? "Practice deliberate clock management in endgame transitions."
            : "Refine nuanced minority attacks and bishop vs knight endgames.",
      },
      resilience_score: resilience,
      games_analyzed: 0,
      blunders_detected: 0,
      is_sample: true,
      critical_advice: [
        "Proactively reinforce threatened anchor pieces before advancing.",
        "Verify your King escape corridor before exchanging queens.",
        "Calculate forced checks and captures before intuitive development.",
      ],
    });
  };

  const dims = profile?.dimensions || {
    pins: 35,
    hanging_pieces: 45,
    overloaded_defenders: 40,
    back_rank: 30,
    time_scramble: 50,
    pawn_structure: 35,
  };

  const cx = 180;
  const cy = 160;
  const r = 100;

  const axes = [
    { key: "pins", label: "Pins & Skewers", value: dims.pins, angle: -90 },
    { key: "hanging_pieces", label: "Hanging Pieces", value: dims.hanging_pieces, angle: -30 },
    { key: "overloaded_defenders", label: "Overloaded Def.", value: dims.overloaded_defenders, angle: 30 },
    { key: "back_rank", label: "Back Rank", value: dims.back_rank, angle: 90 },
    { key: "time_scramble", label: "Late-game slips", value: dims.time_scramble, angle: 150 },
    { key: "pawn_structure", label: "Pawn Structure", value: dims.pawn_structure, angle: 210 },
  ];

  const getPoint = (angleDeg: number, val: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const dist = (val / 100) * r;
    return {
      x: cx + dist * Math.cos(rad),
      y: cy + dist * Math.sin(rad),
    };
  };

  const polygonPoints = axes.map((a) => {
    const pt = getPoint(a.angle, a.value);
    return `${pt.x},${pt.y}`;
  }).join(" ");

  const axisDetails: Record<string, { desc: string; cure: string; lessonTarget: string }> = {
    pins: {
      desc: "Pieces trapped on the same rank, file, or diagonal as higher value royal targets.",
      cure: "Step off alignment lines immediately whenever enemy rooks or bishops sight royal pieces.",
      lessonTarget: "Middlegame Warfare & Absolute Pins",
    },
    hanging_pieces: {
      desc: "Leaving minor or major pieces without friendly defenders while exposed to enemy strike vectors.",
      cure: "Form the habit of LPDO (Loose Pieces Drop Off) — every move must verify all pieces are anchored.",
      lessonTarget: "Opening Mastery & Dynamic Outposts",
    },
    overloaded_defenders: {
      desc: "A piece tasked with protecting multiple squares or pieces simultaneously. When deflected, defense collapses.",
      cure: "Introduce redundant defenders or remove the underlying threat so single pieces don't shoulder double duties.",
      lessonTarget: "The Art of Defense & Prophylaxis",
    },
    back_rank: {
      desc: "King trapped on the back rank behind a pawn barrier without an escape square ('luft').",
      cure: "Play h3 (or h6 for Black) to grant your King an escape hatch before launching heavy rooks into combat.",
      lessonTarget: "The Art of Defense & Parrying Swindles",
    },
    time_scramble: {
      desc: "Loose pieces in your positions after move 25. There's no clock data, so this stands in for time pressure.",
      cure: "Slow down when entering complex transitions; simplify into solid pawn endings when ahead.",
      lessonTarget: "Endgame Precision & Lucena Technique",
    },
    pawn_structure: {
      desc: "Creating isolated, doubled, or backward pawns that become chronic long-term tactical targets.",
      cure: "Calculate pawn trades carefully to avoid leaving backward pawns on half-open files.",
      lessonTarget: "Opening Mastery & Pawn Breaks",
    },
  };


  const severity = (v: number) => (v >= 60 ? "high" : v >= 35 ? "medium" : "low");
  const rankedLeaks = [...axes].sort((a, b) => b.value - a.value);
  const topLeaks = rankedLeaks.slice(0, 3);
  const otherLeaks = rankedLeaks.slice(3);
  const strongest = rankedLeaks[rankedLeaks.length - 1];
  const resilience = Math.round(useCountUp(profile?.resilience_score ?? 0, 900));
  const accent = profile?.archetype.badge_color ?? "var(--accent)";
  const selected = selectedAxis ? axes.find((a) => a.key === selectedAxis) : undefined;
  const usingExample = activePreset !== null;
  const isSample = !usingExample && (profile?.is_sample ?? savedGames.length === 0);

  const showMyGames = () => {
    playSound("click");
    setActivePreset(null);
    fetchProfile(savedGames);
  };

  return (
    <div className="view dna">
      <div className="page-head">
        <div>
          <h1 className="page-title">Player Profile</h1>
          <p className="page-sub">Your recurring weak spots, ranked, with a drill for each one.</p>
        </div>
        <div className="dna-source" role="group" aria-label="Profile source">
          <div className="segmented">
            <button className={`segmented__btn ${!usingExample ? "is-active" : ""}`} aria-pressed={!usingExample} onClick={showMyGames}>
              <Gamepad2 size={14} aria-hidden="true" /> My games <span className="num">({savedGames.length})</span>
            </button>
            <button
              className={`segmented__btn ${usingExample ? "is-active" : ""}`}
              aria-pressed={usingExample}
              onClick={() => loadPreset(activePreset ?? "glassCannon")}
            >
              Example
            </button>
          </div>
          {usingExample && (
            <select
              id="dna-example"
              className="dna-select"
              aria-label="Example archetype"
              value={activePreset ?? ""}
              onChange={(e) => loadPreset(e.target.value)}
            >
              {Object.entries(PRESET_ARCHETYPES).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.name.replace(/^The /, "")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isSample && (
        <div className="dna-notice" role="status">
          <Sparkles size={15} aria-hidden="true" />
          <span>
            <strong>Sample profile.</strong>{" "}
            {isOffline
              ? "The analysis server is offline, so these numbers are an example, not your games."
              : "These numbers are an example. Play or import games and your own profile replaces it."}
          </span>
        </div>
      )}

      {/* Summary: who you are, in one row */}
      <section className="card dna-summary" style={{ "--dna-accent": accent } as React.CSSProperties} aria-label="Profile summary">
        {isLoading && !profile ? (
          <div className="skeleton" style={{ height: 88 }} />
        ) : (
          <>
            <div key={profile?.archetype.name} className="dna-identity">
              <div className="dna-ring" style={{ "--pct": `${resilience}%` } as React.CSSProperties}>
                <span className="dna-ring__value num" aria-label={`Resilience ${profile?.resilience_score ?? 0} out of 100`}>
                  {resilience}
                </span>
                <span className="dna-ring__label">
                  Resilience <MetricInfo metric="resilience" />
                </span>
              </div>
              <div className="dna-identity__text">
                <span className="dna-identity__kicker">{usingExample ? "Example archetype" : "Your archetype"}</span>
                <h2 className="dna-identity__name">{profile?.archetype.name ?? "Unprofiled"}</h2>
                <p className="dna-identity__quote">{profile?.archetype.quote}</p>
              </div>
            </div>
            <dl className="dna-kpis">
              <div>
                <dt>Games analysed</dt>
                <dd className="num">{usingExample || isSample ? "—" : profile?.games_analyzed ?? 0}</dd>
              </div>
              <div>
                <dt>
                  Risky positions <MetricInfo metric="riskyPositions" />
                </dt>
                <dd className="num">
                  {usingExample || isSample
                    ? "—"
                    : `${profile?.blunders_detected ?? 0} of ${profile?.positions_analyzed ?? 0}`}
                </dd>
              </div>
              <div>
                <dt>Biggest leak</dt>
                <dd className="dna-kpi--bad">{topLeaks[0]?.label}</dd>
              </div>
              <div>
                <dt>Strongest area</dt>
                <dd className="dna-kpi--good">{strongest?.label}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <div className="dna-main">
        {/* Left: the shape of your weaknesses */}
        <div className="dna-col">
          <section className="card dna-radar-card" style={{ "--dna-accent": accent } as React.CSSProperties} aria-label="Weakness radar">
            <header className="card__header">
              <h2 className="card__title">
                <Crosshair size={16} /> Weakness map
              </h2>
              <span className="card__meta">
                % of your positions · tap an axis
                <MetricInfo metric="dnaDimensions" />
              </span>
            </header>
            <svg viewBox="-70 -6 500 336" className="radar-svg" role="img" aria-label="Weakness radar">
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  className="radar-web"
                  points={axes
                    .map((a) => {
                      const pt = getPoint(a.angle, scale * 100);
                      return `${pt.x},${pt.y}`;
                    })
                    .join(" ")}
                />
              ))}
              {axes.map((a) => {
                const end = getPoint(a.angle, 100);
                return <line key={a.key} className="radar-spoke" x1={cx} y1={cy} x2={end.x} y2={end.y} />;
              })}
              <g key={polygonPoints} className="radar-shape">
                <polygon points={polygonPoints} className="radar-fill" />
                <polygon points={polygonPoints} className="radar-stroke" pathLength={1} />
              </g>
              {axes.map((a) => {
                const pt = getPoint(a.angle, a.value);
                const label = getPoint(a.angle, 122);
                const anchor = label.x < cx - 10 ? "end" : label.x > cx + 10 ? "start" : "middle";
                const isSelected = selectedAxis === a.key;
                const toggle = () => {
                  playSound("click");
                  setSelectedAxis(isSelected ? null : a.key);
                };
                return (
                  <g
                    key={a.key}
                    className={`radar-axis radar-axis--${severity(a.value)} ${isSelected ? "is-selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${a.label}: ${a.value}%`}
                    onClick={toggle}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle()}
                  >
                    <circle cx={pt.x} cy={pt.y} r={isSelected ? 7 : 5} className="radar-point" />
                    <text x={label.x} y={label.y - 7} textAnchor={anchor} dominantBaseline="central" className="radar-label">
                      {a.label}
                    </text>
                    <text x={label.x} y={label.y + 9} textAnchor={anchor} dominantBaseline="central" className="radar-value">
                      {a.value}%
                    </text>
                  </g>
                );
              })}
            </svg>
            {selected && axisDetails[selected.key] && (
              <div className="dna-axis-detail">
                <strong>
                  <AlertOctagon size={15} aria-hidden="true" /> {selected.label}
                </strong>
                <p>{axisDetails[selected.key].desc}</p>
              </div>
            )}
          </section>

          {profile && (
            <section className="card" aria-label="Strengths and blind spots">
              <div className="dna-traits">
                <div>
                  <h3 className="dna-traits__title dna-traits__title--good">
                    <ShieldCheck size={15} aria-hidden="true" /> Strengths
                  </h3>
                  <ul className="trait-list">
                    {profile.archetype.strengths.map((item) => (
                      <li key={item} className="trait trait--good">{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="dna-traits__title dna-traits__title--bad">
                    <AlertOctagon size={15} aria-hidden="true" /> Blind spots
                  </h3>
                  <ul className="trait-list">
                    {profile.archetype.blind_spots.map((item) => (
                      <li key={item} className="trait trait--bad">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right: what to do about it */}
        <div className="dna-col">
          <section className="card" aria-label="Fix these first">
            <header className="card__header">
              <h2 className="card__title">
                <Flame size={16} /> Fix these first
              </h2>
              <span className="card__meta">Your three biggest leaks</span>
            </header>
            <ol className="focus-list stagger">
              {topLeaks.map((leak, idx) => {
                const tone = severity(leak.value);
                return (
                  <li
                    key={leak.key}
                    className={`focus focus--${tone} ${selectedAxis === leak.key ? "is-selected" : ""}`}
                    style={{ "--i": idx } as React.CSSProperties}
                  >
                    <div className="focus__top">
                      <span className="focus__rank num">{idx + 1}</span>
                      <strong className="focus__name">{leak.label}</strong>
                      <span className={`focus__value num focus__value--${tone}`}>{leak.value}%</span>
                    </div>
                    <div className="meter">
                      <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${leak.value}%` }} />
                    </div>
                    <p className="focus__cure">{axisDetails[leak.key]?.cure}</p>
                    <div className="focus__actions">
                      <button
                        className="btn btn--sm btn--primary"
                        onClick={() => {
                          playSound("click");
                          onNavigateAcademy?.(leak.key);
                        }}
                      >
                        <GraduationCap size={14} /> Lesson
                      </button>
                      {onPracticePuzzles && (
                        <button
                          className="btn btn--sm"
                          onClick={() => {
                            playSound("click");
                            onPracticePuzzles();
                          }}
                        >
                          <Puzzle size={14} /> Puzzles
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="card" aria-label="Other areas">
            <header className="card__header">
              <h2 className="card__title">
                <TrendingUp size={16} /> Other areas
              </h2>
            </header>
            <ul className="other-list">
              {otherLeaks.map((leak) => {
                const tone = severity(leak.value);
                return (
                  <li key={leak.key} className="other">
                    <button
                      className="other__name"
                      onClick={() => {
                        playSound("click");
                        setSelectedAxis(selectedAxis === leak.key ? null : leak.key);
                      }}
                    >
                      {leak.label}
                    </button>
                    <div className="meter">
                      <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${leak.value}%` }} />
                    </div>
                    <span className="other__value num">{leak.value}%</span>
                  </li>
                );
              })}
            </ul>
            {profile && (
              <details className="dna-prescription">
                <summary>
                  <Sparkles size={14} aria-hidden="true" /> Training plan
                </summary>
                <p>{profile.archetype.training_prescription}</p>
                {profile.critical_advice.length > 0 && (
                  <ul>
                    {profile.critical_advice.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </details>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
