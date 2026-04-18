"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  _id: string;
  nickname: string;
  avatar: string;
  color: string;
  points: number;
  wins: number;
  losses: number;
  winRate: number;
  previousRank: number | null;
  currentRank: number;
  playStyle?: string[];
}

type SortKey = "highToLow" | "lowToHigh" | "winRate";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

// ─── Tag helpers ──────────────────────────────────────────────────────────────

function getPointsTag(pts: number): { label: string; bg: string; color: string } {
  if (pts >= 400)  return { label: "G.O.A.T",               bg: "#FAEEDA", color: "#633806" };
  if (pts >= 200)  return { label: "Elite",                 bg: "#EEEDFE", color: "#3C3489" };
  if (pts >= 100)  return { label: "Solid",                 bg: "#E1F5EE", color: "#085041" };
  if (pts >= 20)   return { label: "Rising",                bg: "#EAF3DE", color: "#27500A" };
  if (pts > 0)     return { label: "Legend in training",    bg: "#E6F1FB", color: "#0C447C" };
  if (pts === 0)   return { label: "Just started",          bg: "#F1EFE8", color: "#444441" };
  if (pts >= -50)  return { label: "Meh...",                bg: "#FAECE7", color: "#712B13" };
  if (pts >= -100) return { label: "Trash",                 bg: "#FCEBEB", color: "#791F1F" };
  if (pts >= -150) return { label: "Are you even playing?", bg: "#FBEAF0", color: "#72243E" };
  return            { label: "Delete the account",          bg: "#D3D1C7", color: "#2C2C2A" };
}

function getWinRateTag(wr: number, games: number): { label: string; bg: string; color: string } {
  if (games === 0) return { label: "No games yet",       bg: "#F1EFE8", color: "#444441" };
  if (wr >= 85)    return { label: "Godlike",             bg: "#FAEEDA", color: "#633806" };
  if (wr >= 70)    return { label: "Clutch",              bg: "#EEEDFE", color: "#3C3489" };
  if (wr >= 55)    return { label: "Reliable",            bg: "#E1F5EE", color: "#085041" };
  if (wr >= 45)    return { label: "Average",             bg: "#F1EFE8", color: "#444441" };
  if (wr >= 35)    return { label: "Shaky",               bg: "#FAECE7", color: "#712B13" };
  if (wr >= 20)    return { label: "Coin flip",           bg: "#FCEBEB", color: "#791F1F" };
  return            { label: "Unlucky... or not",         bg: "#FBEAF0", color: "#72243E" };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --yellow: #FFE135; --coral: #FF6B6B; --mint: #4ECDC4;
    --navy: #1a1a2e;   --lime: #C8F135;  --pink: #FF9ECD;
    --white: #FFFDF5;
    --border: 3px solid #1a1a2e;
    --shadow: 4px 4px 0 #1a1a2e;
    --shadow-lg: 6px 6px 0 #1a1a2e;
  }

  .lb-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh;
    color: var(--navy);
  }

  /* ── HEADER ── */
  .lb-header {
    background: var(--navy); padding: 48px 40px 0;
    position: relative; overflow: hidden;
    border-bottom: var(--border);
  }
  .lb-header-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px; pointer-events: none;
  }
  .lb-header-glow {
    position: absolute; width: 400px; height: 400px;
    border-radius: 50%; filter: blur(80px); opacity: 0.13; pointer-events: none;
  }
  .lb-header-inner {
    position: relative; z-index: 1;
    max-width: 1100px; margin: 0 auto;
  }
  .lb-header-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,225,53,0.12); border: 2px solid rgba(255,225,53,0.3);
    color: var(--yellow); border-radius: 50px; padding: 4px 14px;
    font-size: 0.7rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 16px;
  }
  .lb-header h1 {
    font-family: 'Fredoka One', cursive; font-size: 3rem;
    color: white; line-height: 1.05; margin-bottom: 10px;
  }
  .lb-header h1 span { color: var(--yellow); }
  .lb-header-sub {
    font-size: 0.9rem; font-weight: 700;
    color: rgba(255,255,255,0.4); margin-bottom: 28px; max-width: 480px;
  }

  /* ── PODIUM ── */
  .lb-podium {
    display: flex; justify-content: center; align-items: flex-end;
    gap: 12px; padding: 32px 0 0; max-width: 580px; margin: 0 auto;
  }
  .lb-podium-place { display: flex; flex-direction: column; align-items: center; }
  .lb-podium-crown { font-size: 1.6rem; margin-bottom: 4px; animation: crownBob 2.5s ease-in-out infinite; }
  @keyframes crownBob { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-6px) rotate(5deg)} }
  .lb-podium-avatar {
    width: 60px; height: 60px; border-radius: 50%;
    border: 3px solid var(--navy); display: flex; align-items: center;
    justify-content: center; font-size: 1.8rem;
    box-shadow: 4px 4px 0 var(--navy); margin-bottom: 6px;
  }
  .lb-podium-avatar.first { width: 72px; height: 72px; font-size: 2.1rem; }
  .lb-podium-name { font-family: 'Fredoka One', cursive; font-size: 0.9rem; text-align: center; color: white; margin-bottom: 2px; max-width: 90px; line-height: 1.2; }
  .lb-podium-pts  { font-size: 0.68rem; font-weight: 800; color: rgba(255,255,255,0.45); }
  .lb-podium-block {
    display: flex; align-items: center; justify-content: center;
    border: var(--border); border-bottom: none; border-radius: 12px 12px 0 0;
    font-family: 'Fredoka One', cursive; font-size: 1.4rem;
    width: 100px; box-shadow: 4px 0 0 var(--navy);
  }
  .lb-podium-place.second .lb-podium-block { width: 88px; }
  .lb-podium-place.third  .lb-podium-block { width: 80px; }

  /* ── BODY ── */
  .lb-body { max-width: 1100px; margin: 0 auto; padding: 36px 40px 80px; }

  /* ── TOOLBAR ── */
  .lb-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; flex-wrap: wrap;
  }
  .lb-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .lb-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .lb-search {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem;
    padding: 11px 14px 11px 40px;
    border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); transition: box-shadow .15s;
  }
  .lb-search:focus { box-shadow: 6px 6px 0 var(--navy); }
  .lb-sort-wrap { position: relative; }
  .lb-sort-wrap::after { content:"▾"; position:absolute; right:12px; top:50%; transform:translateY(-50%); pointer-events:none; font-size:0.8rem; }
  .lb-sort {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 11px 32px 11px 14px; border: var(--border); border-radius: 12px;
    background: white; outline: none; box-shadow: var(--shadow);
    cursor: pointer; appearance: none; color: var(--navy);
  }

  /* ── TABLE ── */
  .lb-table { display: flex; flex-direction: column; gap: 10px; }

  .lb-row {
    display: grid;
    grid-template-columns: 52px 1fr 110px 90px 90px;
    align-items: center; gap: 12px;
    background: white; border: var(--border); border-radius: 18px;
    padding: 14px 18px; box-shadow: var(--shadow);
    transition: transform .15s, box-shadow .15s;
    animation: rowIn .3s cubic-bezier(.34,1.56,.64,1) both;
    cursor: pointer;
  }
  .lb-row:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  @keyframes rowIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .lb-row.top-1 { background: #fffbea; border-color: #e6c800; box-shadow: 4px 4px 0 #e6c800; }
  .lb-row.top-2 { background: #f9f9f9; border-color: #aaa;    box-shadow: 4px 4px 0 #aaa; }
  .lb-row.top-3 { background: #fdf6ee; border-color: #cd7f32; box-shadow: 4px 4px 0 #cd7f32; }
  .lb-row.is-me { border-color: var(--mint); box-shadow: 4px 4px 0 var(--mint); }

  /* movement highlights — override top-N border/bg when movement is extreme */
  .lb-row.hot-riser { border-color: #1D9E75 !important; box-shadow: 4px 4px 0 #1D9E75 !important; background: linear-gradient(90deg, #d4f4e8 0%, white 55%) !important; }
  .lb-row.hot-faller { border-color: #D85A30 !important; box-shadow: 4px 4px 0 #D85A30 !important; background: linear-gradient(90deg, #fde8de 0%, white 55%) !important; }

  .lb-col-rank { font-family: 'Fredoka One', cursive; font-size: 1.3rem; text-align: center; }
  .lb-col-player { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .lb-player-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    border: 2.5px solid var(--navy); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
    box-shadow: 2px 2px 0 var(--navy);
  }
  .lb-player-name { font-family: 'Fredoka One', cursive; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lb-player-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; align-items: center; }
  .lb-tag {
    font-size: 0.62rem; font-weight: 800; border-radius: 50px;
    padding: 2px 8px; white-space: nowrap;
  }
  .lb-move-badge {
    font-size: 0.62rem; font-weight: 800; border-radius: 50px;
    padding: 2px 8px; white-space: nowrap; display: inline-flex; align-items: center; gap: 2px;
  }
  .move-up      { background: #E1F5EE; color: #085041; }
  .move-down    { background: #FAECE7; color: #712B13; }
  .move-none    { background: #F1EFE8; color: #888780; }
  .move-onfire  { background: #1D9E75; color: #fff; }
  .move-falling { background: #D85A30; color: #fff; }

  .lb-me-chip {
    font-size: 0.6rem; font-weight: 900; background: var(--mint);
    border: 1.5px solid var(--navy); border-radius: 50px;
    padding: 1px 6px; margin-left: 4px; white-space: nowrap;
  }
  .lb-col-points { text-align: center; }
  .lb-pts-num { font-family: 'Fredoka One', cursive; font-size: 1.2rem; }
  .lb-pts-num.positive { color: #0F6E56; }
  .lb-pts-num.negative { color: #993C1D; }
  .lb-pts-num.zero     { color: #888780; }
  .lb-pts-label { font-size: 0.6rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.5px; }

  .lb-col-wins { text-align: center; font-family: 'Fredoka One', cursive; font-size: 1.05rem; }
  .lb-col-rate { text-align: center; }
  .lb-rate-num { font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--coral); }
  .lb-rate-bar { height: 6px; background: #eee; border: 1.5px solid var(--navy); border-radius: 50px; overflow: hidden; margin-top: 4px; }
  .lb-rate-fill { height: 100%; background: var(--coral); border-radius: 50px; transition: width .6s ease; }

  /* ── LEGEND ── */
  .lb-legend {
    display: flex; gap: 16px; flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .lb-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; opacity: 0.6; }
  .lb-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

  /* ── TIER GUIDE ── */
  .lb-tier-card {
    border: var(--border); border-radius: 20px; overflow: hidden;
    box-shadow: var(--shadow-lg); margin-bottom: 32px;
  }
  .lb-tier-head {
    background: var(--navy); color: white; padding: 14px 20px;
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    display: flex; align-items: center; gap: 8px;
  }
  .lb-tier-body { background: white; padding: 20px; }
  .lb-tier-section-label { font-size: 0.7rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
  .lb-tier-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .lb-tier-pill {
    font-size: 0.75rem; font-weight: 800; border-radius: 50px;
    padding: 5px 14px; border: 2px solid rgba(26,26,46,0.12);
  }

  /* ── STATS BANNER ── */
  .lb-stats-banner {
    display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 28px;
  }
  .lb-stat-tile {
    flex: 1; min-width: 120px;
    background: white; border: var(--border); border-radius: 18px;
    padding: 16px 20px; box-shadow: var(--shadow); text-align: center;
  }
  .lb-stat-num { font-family: 'Fredoka One', cursive; font-size: 1.8rem; color: var(--coral); }
  .lb-stat-lbl { font-size: 0.68rem; font-weight: 800; opacity: 0.45; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  /* ── EMPTY / SKELETON ── */
  .lb-empty { text-align: center; padding: 80px 40px; border: 3px dashed rgba(26,26,46,0.15); border-radius: 24px; background: rgba(255,255,255,0.5); }
  .lb-empty-icon  { font-size: 4rem; margin-bottom: 16px; opacity: 0.4; }
  .lb-empty-title { font-family: 'Fredoka One', cursive; font-size: 1.6rem; margin-bottom: 8px; opacity: 0.5; }
  .lb-empty-sub   { font-size: 0.85rem; font-weight: 700; opacity: 0.35; }
  .lb-skel {
    background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  @media (max-width: 900px) {
    .lb-header { padding: 32px 20px 0; }
    .lb-header h1 { font-size: 2.2rem; }
    .lb-body { padding: 28px 16px 60px; }
    .lb-row { grid-template-columns: 40px 1fr 80px 70px; gap: 8px; padding: 12px 14px; }
    .lb-col-rate { display: none; }
    .lb-podium { padding: 24px 16px 0; }
  }
`;

// ─── Rank display ─────────────────────────────────────────────────────────────

function rankDisplay(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ i }: { i: number }) {
  return (
    <div className="lb-row" style={{ animationDelay: `${i * 0.04}s` }}>
      <div className="lb-skel" style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="lb-skel" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <div className="lb-skel" style={{ width: 100, height: 16, marginBottom: 6 }} />
          <div className="lb-skel" style={{ width: 140, height: 11 }} />
        </div>
      </div>
      <div className="lb-skel" style={{ width: 50, height: 28, margin: "0 auto", borderRadius: 8 }} />
      <div className="lb-skel" style={{ width: 40, height: 22, margin: "0 auto", borderRadius: 8 }} />
      <div className="lb-skel" style={{ width: 44, height: 22, margin: "0 auto", borderRadius: 8 }} />
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ players }: { players: Player[] }) {
  if (players.length < 1) return null;
  const [first, second, third] = players;
  const order   = [second, first, third].filter(Boolean);
  const heights = [80, 110, 60];
  const classes = ["second", "first", "third"];
  const medals  = ["🥈", "🥇", "🥉"];
  const colors  = ["#C0C0C0", "#FFB800", "#CD7F32"];

  return (
    <div className="lb-podium">
      {order.map((player, i) => {
        if (!player) return null;
        const isFirst = player._id === first._id;
        const ptsSign = player.points > 0 ? "+" : "";
        return (
          <div key={player._id} className={`lb-podium-place ${classes[i]}`}>
            {isFirst && <div className="lb-podium-crown">👑</div>}
            <div
              className={`lb-podium-avatar${isFirst ? " first" : ""}`}
              style={{ background: player.color }}
            >
              {player.avatar}
            </div>
            <div className="lb-podium-name">{player.nickname}</div>
            <div className="lb-podium-pts">{ptsSign}{player.points} pts</div>
            <div
              className="lb-podium-block"
              style={{ height: heights[i], background: colors[i] }}
            >
              {medals[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tier guide card ──────────────────────────────────────────────────────────

const POINTS_TIERS = [
  { label: "G.O.A.T",               range: "400+ pts",    bg: "#FAEEDA", color: "#633806" },
  { label: "Elite",                 range: "200–399 pts", bg: "#EEEDFE", color: "#3C3489" },
  { label: "Solid",                 range: "100–199 pts", bg: "#E1F5EE", color: "#085041" },
  { label: "Rising",                range: "20–99 pts",   bg: "#EAF3DE", color: "#27500A" },
  { label: "Legend in training",    range: "1–19 pts",    bg: "#E6F1FB", color: "#0C447C" },
  { label: "Just started",          range: "0 pts",       bg: "#F1EFE8", color: "#444441" },
  { label: "Meh...",                range: "-1 to -50",   bg: "#FAECE7", color: "#712B13" },
  { label: "Trash",                 range: "-51 to -100", bg: "#FCEBEB", color: "#791F1F" },
  { label: "Are you even playing?", range: "-101 to -150",bg: "#FBEAF0", color: "#72243E" },
  { label: "Delete the account",    range: "below -150",  bg: "#D3D1C7", color: "#2C2C2A" },
];

const WINRATE_TIERS = [
  { label: "Godlike",          range: "85%+",    bg: "#FAEEDA", color: "#633806" },
  { label: "Clutch",           range: "70–84%",  bg: "#EEEDFE", color: "#3C3489" },
  { label: "Reliable",         range: "55–69%",  bg: "#E1F5EE", color: "#085041" },
  { label: "Average",          range: "45–54%",  bg: "#F1EFE8", color: "#444441" },
  { label: "Shaky",            range: "35–44%",  bg: "#FAECE7", color: "#712B13" },
  { label: "Coin flip",        range: "20–34%",  bg: "#FCEBEB", color: "#791F1F" },
  { label: "Unlucky... or not",range: "< 20%",   bg: "#FBEAF0", color: "#72243E" },
];

function TierGuide() {
  return (
    <div className="lb-tier-card">
      <div className="lb-tier-head">🏷️ How tags work</div>
      <div className="lb-tier-body">
        <div className="lb-tier-section-label">Points tags</div>
        <div className="lb-tier-grid">
          {POINTS_TIERS.map((t) => (
            <span
              key={t.label}
              className="lb-tier-pill"
              style={{ background: t.bg, color: t.color }}
              title={t.range}
            >
              {t.label} <span style={{ opacity: 0.55, fontWeight: 700 }}>({t.range})</span>
            </span>
          ))}
        </div>
        <div className="lb-tier-section-label">Win rate tags</div>
        <div className="lb-tier-grid">
          {WINRATE_TIERS.map((t) => (
            <span
              key={t.label}
              className="lb-tier-pill"
              style={{ background: t.bg, color: t.color }}
              title={t.range}
            >
              {t.label} <span style={{ opacity: 0.55, fontWeight: 700 }}>({t.range})</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const currentUser = useQuery(api.users.currentUser) as any;
  const rawPlayers  = useQuery(api.users.leaderboard, currentUser ? {} : "skip") as Player[] | undefined;
  const loading     = rawPlayers === undefined;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("highToLow");

  // Normalise players — guarantee all numeric fields exist
  const players: Player[] = (rawPlayers ?? []).map((p: any) => ({
    ...p,
    points:       p.points      ?? 0,
    wins:         p.wins        ?? 0,
    losses:       p.losses      ?? 0,
    winRate:      p.winRate     ?? 0,
    previousRank: p.previousRank ?? null,
    currentRank:  p.currentRank  ?? 1,
  }));

  // ── Baseline is always highest-to-lowest (points) ──────────────────────────
  // Movement badges are computed from this baseline and never change with sort.
  const baseline: Player[] = useMemo(
    () => [...players].sort((a, b) => b.points - a.points),
    [players]
  );

  // Pre-compute moved value keyed by player _id so it's stable across sorts
  const movedMap: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};
    baseline.forEach((p) => {
      if (p.previousRank != null) {
        map[p._id] = p.previousRank - p.currentRank;
      } else {
        map[p._id] = 0;
      }
    });
    return map;
  }, [baseline]);

  const filtered = useMemo(() => {
    let result = [...players];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.nickname.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "lowToHigh") return a.points - b.points;
      if (sortBy === "winRate")   return b.winRate - a.winRate;
      return b.points - a.points; // highToLow default
    });

    return result;
  }, [players, search, sortBy]);

  // Stats banner values
  const topPoints  = players.length > 0 ? Math.max(...players.map((p) => p.points)) : 0;
  const avgPoints  = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.points, 0) / players.length) : 0;
  const totalWins  = players.reduce((s, p) => s + p.wins, 0);

  // Top 3 always by points for the podium
  const top3 = [...players].sort((a, b) => b.points - a.points).slice(0, 3);

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="lb-root">
        <Navbar />

        {/* ── HEADER ── */}
        <div className="lb-header">
          <div className="lb-header-pattern" />
          <div className="lb-header-glow" style={{ background: "#FFE135", top: "-80px", right: "-60px" }} />
          <div className="lb-header-glow" style={{ background: "#FF6B6B", bottom: "-60px", left: "-80px" }} />
          <div className="lb-header-inner">
            <div className="lb-header-tag">🏆 Rankings</div>
            <h1>Who&apos;s the<br /><span>top dog?</span></h1>
            <p className="lb-header-sub">
              Points update after every session. Win big, climb fast. Lose, and the tags get brutal.
            </p>
          </div>

          {!loading && top3.length >= 2 && <Podium players={top3} />}
          {loading && (
            <div style={{ height: 180, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, padding: "32px 0 0" }}>
              {[88, 110, 80].map((h, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="lb-skel" style={{ width: i === 1 ? 72 : 60, height: i === 1 ? 72 : 60, borderRadius: "50%" }} />
                  <div className="lb-skel" style={{ width: i === 1 ? 100 : 88, height: h, borderRadius: "12px 12px 0 0" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="lb-body">

          {/* Stats banner */}
          <div className="lb-stats-banner">
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{players.length}</div>
              <div className="lb-stat-lbl">Ranked Players</div>
            </div>
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{topPoints > 0 ? `+${topPoints}` : topPoints}</div>
              <div className="lb-stat-lbl">Top Points</div>
            </div>
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{avgPoints > 0 ? `+${avgPoints}` : avgPoints}</div>
              <div className="lb-stat-lbl">Avg Points</div>
            </div>
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{totalWins}</div>
              <div className="lb-stat-lbl">Total Wins</div>
            </div>
          </div>

          {/* Tier guide */}
          <TierGuide />

          {/* Movement legend */}
          <div className="lb-legend">
            <div className="lb-legend-item">
              <div className="lb-legend-dot" style={{ background: "#1D9E75" }} />
              On a tear (moved up 3+)
            </div>
            <div className="lb-legend-item">
              <div className="lb-legend-dot" style={{ background: "#D85A30" }} />
              Free falling (dropped 3+)
            </div>
          </div>

          {/* Toolbar */}
          <div className="lb-toolbar">
            <div className="lb-search-wrap">
              <span className="lb-search-icon">🔍</span>
              <input
                className="lb-search"
                placeholder="Search players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="lb-sort-wrap">
              <select
                className="lb-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
              >
                <option value="highToLow">Points: highest to lowest</option>
                <option value="lowToHigh">Points: lowest to highest</option>
                <option value="winRate">Win rate</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="lb-table">
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} i={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="lb-empty">
              <div className="lb-empty-icon">🏆</div>
              <div className="lb-empty-title">
                {players.length === 0 ? "No ranked players yet" : "No matches"}
              </div>
              <div className="lb-empty-sub">
                {players.length === 0
                  ? "Play your first session to get on the leaderboard."
                  : "Try a different search term."}
              </div>
            </div>
          ) : (
            <div className="lb-table">
              {filtered.map((player, i) => {
                const isMe    = currentUser?._id === player._id;
                // Rank position shown = position in the current sorted view (1-based)
                const rank    = i + 1;
                const moved   = movedMap[player._id] ?? 0;
                const games   = player.wins + player.losses;
                const ptTag   = getPointsTag(player.points);
                const wrTag   = getWinRateTag(player.winRate, games);
                const ptsSign = player.points > 0 ? "+" : "";
                const ptsCls  = player.points > 0 ? "positive" : player.points < 0 ? "negative" : "zero";

                const isHotRiser  = moved >= 3;
                const isHotFaller = moved <= -3;

                let rowClass = "lb-row";
                if (isHotRiser)       rowClass += " hot-riser";
                else if (isHotFaller) rowClass += " hot-faller";
                else if (rank === 1)  rowClass += " top-1";
                else if (rank === 2)  rowClass += " top-2";
                else if (rank === 3)  rowClass += " top-3";
                if (isMe) rowClass += " is-me";

                let moveBadgeClass = "lb-move-badge move-none";
                let moveBadgeText  = "—";
                if (isHotRiser)       { moveBadgeClass = "lb-move-badge move-onfire";  moveBadgeText = `+${moved} on fire`; }
                else if (isHotFaller) { moveBadgeClass = "lb-move-badge move-falling"; moveBadgeText = `${moved} falling`; }
                else if (moved > 0)   { moveBadgeClass = "lb-move-badge move-up";      moveBadgeText = `+${moved}`; }
                else if (moved < 0)   { moveBadgeClass = "lb-move-badge move-down";    moveBadgeText = `${moved}`; }

                return (
                  <div
                    key={player._id}
                    className={rowClass}
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => window.location.href = `/profile/${player._id}`}
                  >
                    {/* Rank */}
                    <div className="lb-col-rank" style={{
                      color: rank === 1 ? "#FFB800" : rank === 2 ? "#888" : rank === 3 ? "#CD7F32" : "#1a1a2e"
                    }}>
                      {rankDisplay(rank)}
                    </div>

                    {/* Player info + tags */}
                    <div className="lb-col-player">
                      <div className="lb-player-avatar" style={{ background: player.color }}>
                        {player.avatar}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="lb-player-name">{player.nickname}</div>
                          {isMe && <span className="lb-me-chip">You</span>}
                        </div>
                        <div className="lb-player-tags">
                          <span
                            className="lb-tag"
                            style={{ background: ptTag.bg, color: ptTag.color }}
                          >
                            {ptTag.label}
                          </span>
                          <span
                            className="lb-tag"
                            style={{ background: wrTag.bg, color: wrTag.color }}
                          >
                            {wrTag.label}
                          </span>
                          <span className={moveBadgeClass}>{moveBadgeText}</span>
                        </div>
                        {(player.playStyle ?? []).length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                            {(player.playStyle ?? []).slice(0, 2).map((s) => (
                              <span key={s} style={{
                                fontSize: "0.6rem", fontWeight: 800, borderRadius: 50,
                                padding: "1px 7px", border: "1.5px solid rgba(26,26,46,0.15)",
                                background: "rgba(26,26,46,0.05)",
                              }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="lb-col-points">
                      <div className={`lb-pts-num ${ptsCls}`}>{ptsSign}{player.points}</div>
                      <div className="lb-pts-label">points</div>
                    </div>

                    {/* Wins */}
                    <div className="lb-col-wins">
                      {player.wins}🏅
                      <div style={{ fontSize: "0.62rem", fontWeight: 800, opacity: 0.4 }}>
                        {games}G
                      </div>
                    </div>

                    {/* Win rate */}
                    <div className="lb-col-rate">
                      <div className="lb-rate-num">{player.winRate}%</div>
                      <div className="lb-rate-bar">
                        <div className="lb-rate-fill" style={{ width: `${player.winRate}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}