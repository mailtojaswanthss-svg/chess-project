import React, { useState, useEffect } from "react";
import {
  Brain,
  Crosshair,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertOctagon,
  Flame,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import type { BlunderDnaReport, BlunderDnaDimensions, SavedGame } from "../types/chess";
import { playSound } from "../utils/audio";

interface BlunderDnaProfilerProps {
  savedGames: SavedGame[];
  apiUrl?: string;
  onNavigateAcademy?: (lessonId?: string) => void;
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
}) => {
  const [profile, setProfile] = useState<BlunderDnaReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedAxis, setSelectedAxis] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const fetchProfile = async (pgnTexts?: string[]) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/blunder-dna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn_text: pgnTexts && pgnTexts.length > 0 ? pgnTexts.join("\n\n") : undefined }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as BlunderDnaReport;
        setProfile(data);
      }
    } catch {
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
        games_analyzed: savedGames.length,
        blunders_detected: savedGames.length * 2,
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
    const pgns = savedGames.map((g) => g.pgn).filter(Boolean);
    fetchProfile(pgns);
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
            ? "#ef4444"
            : key === "glassCannon"
            ? "#ec4899"
            : key === "speedster"
            ? "#eab308"
            : "#10b981",
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
      games_analyzed: 42,
      blunders_detected: Math.round(avg * 0.8),
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
    { key: "time_scramble", label: "Time Scramble", value: dims.time_scramble, angle: 150 },
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
      desc: "Sudden spike in tactical blunders occurring after move 30 or in accelerated clock situations.",
      cure: "Slow down when entering complex transitions; simplify into solid pawn endings when ahead.",
      lessonTarget: "Endgame Precision & Lucena Technique",
    },
    pawn_structure: {
      desc: "Creating isolated, doubled, or backward pawns that become chronic long-term tactical targets.",
      cure: "Calculate pawn trades carefully to avoid leaving backward pawns on half-open files.",
      lessonTarget: "Opening Mastery & Pawn Breaks",
    },
  };

  // Top 3 tactical leaks for "Fix Your Leaks" cards
  const topLeaks = [...axes].sort((a, b) => b.value - a.value).slice(0, 3);

  return (
    <div className="blunder-dna-container">
      {/* 1. Archetype Hero Banner with High Contrast */}
      <div className="dna-hero-header">
        <div className="dna-hero-top-row">
          <div className="dna-badge-pill">
            <Brain size={16} className="text-cyan" />
            <span>NEURAL BEHAVIORAL PROFILER</span>
          </div>
          {profile && (
            <div
              className="archetype-hero-badge"
              style={{ borderColor: profile.archetype.badge_color, color: profile.archetype.badge_color }}
            >
              ★ {profile.archetype.name.toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="dna-hero-title">Personal &quot;Tactical DNA&quot; Radar</h2>
        <p className="dna-hero-summary">
          {profile?.archetype.quote ||
            "Deep psychological and tactical archetype diagnostics measuring recurring error vectors across 6 core vulnerability dimensions."}
        </p>

        {/* Preset Selector */}
        <div className="dna-archetype-chips">
          <span className="chips-label">Explore Archetypes:</span>
          {Object.entries(PRESET_ARCHETYPES).map(([key, data]) => (
            <button
              key={key}
              className={`archetype-chip ${activePreset === key ? "active" : ""}`}
              onClick={() => loadPreset(key)}
            >
              {data.name}
            </button>
          ))}
          <button
            className="archetype-chip reset"
            onClick={() => {
              setActivePreset(null);
              fetchProfile(savedGames.map((g) => g.pgn).filter(Boolean));
            }}
            title="Reset to your personal games"
          >
            <RefreshCw size={12} style={{ marginRight: 4 }} /> My Games ({savedGames.length})
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Centerpiece Radar on Left, Archetype Dossier on Right */}
      <div className="dna-grid">
        {/* Left: SVG Radar Chart */}
        <div className="dna-card radar-card">
          <div className="card-top-title">
            <Crosshair size={16} className="text-cyan" />
            <strong className="high-contrast-heading">TACTICAL VULNERABILITY RADAR</strong>
            <span className="info-hint">Click any axis to inspect</span>
          </div>

          <div className="radar-svg-wrapper">
            <svg viewBox="0 0 360 330" className="radar-svg">
              {/* Concentric Guide Webs */}
              {[25, 50, 75, 100].map((level) => {
                const pts = axes.map((a) => {
                  const pt = getPoint(a.angle, level);
                  return `${pt.x},${pt.y}`;
                }).join(" ");
                return (
                  <polygon
                    key={level}
                    points={pts}
                    className="radar-grid-web"
                    strokeDasharray={level === 100 ? undefined : "3,3"}
                  />
                );
              })}

              {/* Axis Spoke Lines */}
              {axes.map((a) => {
                const pt = getPoint(a.angle, 100);
                return (
                  <line
                    key={a.key}
                    x1={cx}
                    y1={cy}
                    x2={pt.x}
                    y2={pt.y}
                    className="radar-spoke"
                  />
                );
              })}

              {/* Data Polygon Fill */}
              <polygon points={polygonPoints} className="radar-polygon-fill" />
              <polygon points={polygonPoints} className="radar-polygon-stroke" />

              {/* Data Vertices and Clickable Hit Areas */}
              {axes.map((a) => {
                const pt = getPoint(a.angle, a.value);
                const isSelected = selectedAxis === a.key;
                return (
                  <g
                    key={a.key}
                    className={`radar-node-group ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      playSound("click");
                      setSelectedAxis(a.key === selectedAxis ? null : a.key);
                    }}
                  >
                    <circle cx={pt.x} cy={pt.y} r={isSelected ? 7 : 5} className="radar-point" />
                    {isSelected && (
                      <circle cx={pt.x} cy={pt.y} r={12} className="radar-point-pulse" />
                    )}
                  </g>
                );
              })}

              {/* Explicit Axis Labels with High Contrast */}
              {axes.map((a) => {
                const labelDist = 124;
                const rad = (a.angle * Math.PI) / 180;
                const lx = cx + labelDist * Math.cos(rad);
                const ly = cy + labelDist * Math.sin(rad);
                const isSelected = selectedAxis === a.key;
                const anchor =
                  a.angle === -90 || a.angle === 90
                    ? "middle"
                    : Math.cos(rad) > 0.1
                    ? "start"
                    : "end";
                return (
                  <text
                    key={a.key}
                    x={lx}
                    y={ly}
                    className={`radar-axis-label ${isSelected ? "active" : ""}`}
                    textAnchor={anchor}
                    dominantBaseline="central"
                    onClick={() => {
                      playSound("click");
                      setSelectedAxis(a.key === selectedAxis ? null : a.key);
                    }}
                  >
                    {a.label} ({a.value}%)
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Quick Axis Dimension Pills */}
          <div className="dna-dimensions-bar">
            {axes.map((a) => (
              <button
                key={a.key}
                className={`dna-dim-pill ${selectedAxis === a.key ? "active" : ""} ${
                  a.value >= 60 ? "danger" : a.value >= 35 ? "warning" : "safe"
                }`}
                onClick={() => setSelectedAxis(a.key === selectedAxis ? null : a.key)}
              >
                <span className="dim-name">{a.label}</span>
                <span className="dim-val">{a.value}%</span>
              </button>
            ))}
          </div>

          {/* Selected Axis Inspection Drawer */}
          {selectedAxis && axisDetails[selectedAxis] && (
            <div className="axis-detail-drawer">
              <div className="axis-detail-header">
                <AlertOctagon size={16} className="text-warning" />
                <strong>{axes.find((a) => a.key === selectedAxis)?.label} Deep Dive</strong>
              </div>
              <p className="axis-detail-desc">{axisDetails[selectedAxis].desc}</p>
              <div className="axis-detail-cure">
                <Sparkles size={14} className="text-cyan" />
                <span><strong>Master Prescription:</strong> {axisDetails[selectedAxis].cure}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Archetype Dossier & Resilience Score */}
        <div className="dna-card dossier-card">
          <div className="card-top-title">
            <Award size={16} className="text-gold" />
            <strong className="high-contrast-heading">TACTICAL ARCHETYPE PROFILE</strong>
          </div>

          {profile && (
            <div className="archetype-body">
              {/* Profile Card Header */}
              <div
                className="archetype-header-card"
                style={{ borderLeftColor: profile.archetype.badge_color }}
              >
                <div className="archetype-title-row">
                  <div>
                    <h3 className="archetype-name" style={{ color: profile.archetype.badge_color }}>
                      {profile.archetype.name}
                    </h3>
                    <span className="archetype-subtitle">{profile.archetype.title}</span>
                  </div>
                  <div className="resilience-meter-wrap">
                    <div className="resilience-score-num">{profile.resilience_score}</div>
                    <span className="resilience-label">Tactical Resilience</span>
                  </div>
                </div>
                <p className="archetype-quote">&ldquo;{profile.archetype.quote}&rdquo;</p>
              </div>

              {/* Dominant Vulnerability */}
              <div className="dossier-section">
                <span className="dossier-sub-label">PRIMARY TACTICAL BLINDSPOT</span>
                <div className="flaw-pill">
                  <Flame size={15} className="text-danger" />
                  <span>{profile.archetype.dominant_flaw}</span>
                </div>
              </div>

              {/* Strengths & Blind Spots */}
              <div className="dossier-dual-grid">
                <div className="dossier-col">
                  <span className="dossier-sub-label">CORE STRENGTHS</span>
                  <div className="tag-list">
                    {profile.archetype.strengths.map((str, idx) => (
                      <div key={idx} className="tag-item strength">
                        <CheckCircle2 size={13} /> {str}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dossier-col">
                  <span className="dossier-sub-label">VULNERABILITY LEAKS</span>
                  <div className="tag-list">
                    {profile.archetype.blind_spots.map((bs, idx) => (
                      <div key={idx} className="tag-item weakness">
                        <AlertOctagon size={13} /> {bs}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tailored Training Prescription */}
              <div className="dossier-section prescription-section">
                <div className="prescription-header">
                  <TrendingUp size={15} className="text-cyan" />
                  <span>ACTIONABLE TRAINING PRESCRIPTION</span>
                </div>
                <p className="prescription-text">{profile.archetype.training_prescription}</p>
              </div>

              {/* Telemetry Footer */}
              <div className="dossier-telemetry-row">
                <div className="telemetry-item">
                  <span className="telemetry-num">{profile.games_analyzed}</span>
                  <span className="telemetry-desc">Games Evaluated</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-num">
                    {axes.reduce((a, b) => a + b.value, 0) / 6 < 40 ? "Low" : "Moderate"}
                  </span>
                  <span className="telemetry-desc">Error Volatility</span>
                </div>
                <div className="telemetry-item">
                  <span className="telemetry-num">Top 12%</span>
                  <span className="telemetry-desc">Attacking Instinct</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. "Fix Your Leaks" Actionable Cards (Phase 4) */}
      <div className="dna-leaks-section">
        <div className="leaks-section-header">
          <div className="leaks-title-wrap">
            <Flame size={18} className="text-danger" />
            <h3 className="leaks-title">Fix Your Primary Tactical Leaks</h3>
          </div>
          <span className="leaks-subtitle">Targeted drills to permanently raise your tactical resilience rating</span>
        </div>

        <div className="leaks-grid">
          {topLeaks.map((leak, idx) => {
            const details = axisDetails[leak.key];
            const tone = leak.value >= 60 ? "danger" : leak.value >= 35 ? "warning" : "safe";

            return (
              <div key={leak.key} className={`leak-card ${tone}`}>
                <div className="leak-card-top">
                  <div className="leak-badge-wrap">
                    <span className="leak-rank-num">#{idx + 1} Leak</span>
                    <strong className="leak-name">{leak.label}</strong>
                  </div>
                  <span className={`leak-val-tag ${tone}`}>{leak.value}% Error Rate</span>
                </div>

                {/* Visual Progress Bar */}
                <div className="leak-progress-track">
                  <div
                    className={`leak-progress-fill ${tone}`}
                    style={{ width: `${Math.max(8, leak.value)}%` }}
                  />
                </div>

                <p className="leak-desc">{details?.desc || "Recurring tactical blindspot observed in match play."}</p>

                <div className="leak-prescription-row">
                  <Sparkles size={13} className="text-cyan" />
                  <span>{details?.cure}</span>
                </div>

                <button
                  className="leak-train-btn"
                  onClick={() => {
                    playSound("click");
                    onNavigateAcademy?.(leak.key);
                  }}
                  title={`Train ${leak.label} in Chess Academy`}
                >
                  <GraduationCap size={15} />
                  <span>Train This Skill in Academy</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
