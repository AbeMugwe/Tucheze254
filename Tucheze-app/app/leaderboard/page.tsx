"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  _id: string;
  nickname: string;
  avatar: string;
  color: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  badge: string;
  playStyle?: string[];
}

type SortKey = "elo" | "wins" | "winRate";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const TIER_CONFIG = [
  { min: 1800, label: "Legend",    color: "#FFE135", bg: "#fffbea", icon: "👑", shadow: "#e6c800" },
  { min: 1600, label: "Elite",     color: "#FF6B6B", bg: "#fff5f5", icon: "🔥", shadow: "#e54545" },
  { min: 1400, label: "Veteran",   color: "#4ECDC4", bg: "#f0fdfb", icon: "⚡", shadow: "#2aada4" },
  { min: 1200, label: "Contender", color: "#FF9ECD", bg: "#fff5f9", icon: "🎯", shadow: "#e07aac" },
  { min:    0, label: "Rising",    color: "#C8F135", bg: "#f8ffe0", icon: "🌱", shadow: "#9ecc00" },
];

function getTier(elo: number) {
  return TIER_CONFIG.find(t => elo >= t.min) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
}

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
  .lb-podium-place { display: flex; flex-direction: column; align-items: center; gap: 0; }
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
  .lb-podium-elo  { font-size: 0.68rem; font-weight: 800; color: rgba(255,255,255,0.45); margin-bottom: 0; }
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

  /* ── TIER LEGEND ── */
  .lb-tiers {
    display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap;
  }
  .lb-tier-chip {
    display: flex; align-items: center; gap: 6px;
    border: 2.5px solid var(--navy); border-radius: 50px;
    padding: 5px 14px; font-size: 0.75rem; font-weight: 800;
    box-shadow: 2px 2px 0 var(--navy); cursor: pointer;
    transition: all .12s;
  }
  .lb-tier-chip:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--navy); }
  .lb-tier-chip.active { box-shadow: 2px 2px 0 rgba(0,0,0,0.2); }

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
    grid-template-columns: 52px 1fr 110px 90px 90px 120px;
    align-items: center; gap: 12px;
    background: white; border: var(--border); border-radius: 18px;
    padding: 14px 18px; box-shadow: var(--shadow);
    transition: transform .15s, box-shadow .15s;
    animation: rowIn .3s cubic-bezier(.34,1.56,.64,1) both;
  }
  .lb-row:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  @keyframes rowIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .lb-row.top-1 { background: #fffbea; border-color: #e6c800; box-shadow: 4px 4px 0 #e6c800; }
  .lb-row.top-2 { background: #f9f9f9; border-color: #aaa;    box-shadow: 4px 4px 0 #aaa; }
  .lb-row.top-3 { background: #fdf6ee; border-color: #cd7f32; box-shadow: 4px 4px 0 #cd7f32; }
  .lb-row.is-me { border-color: var(--mint); box-shadow: 4px 4px 0 var(--mint); }

  .lb-col-rank { font-family: 'Fredoka One', cursive; font-size: 1.3rem; text-align: center; }
  .lb-col-player { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .lb-player-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    border: 2.5px solid var(--navy); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
    box-shadow: 2px 2px 0 var(--navy);
  }
  .lb-player-name { font-family: 'Fredoka One', cursive; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lb-player-badge { font-size: 0.68rem; font-weight: 800; opacity: 0.5; margin-top: 1px; }
  .lb-player-styles { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
  .lb-style-chip {
    font-size: 0.6rem; font-weight: 800; border-radius: 50px;
    padding: 1px 7px; border: 1.5px solid rgba(26,26,46,0.15);
    background: rgba(26,26,46,0.05);
  }
  .lb-col-elo { text-align: center; }
  .lb-elo-num { font-family: 'Fredoka One', cursive; font-size: 1.2rem; }
  .lb-elo-label { font-size: 0.6rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.5px; }
  .lb-col-wins { text-align: center; font-family: 'Fredoka One', cursive; font-size: 1.05rem; }
  .lb-col-rate { text-align: center; }
  .lb-rate-num { font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--coral); }
  .lb-rate-bar { height: 6px; background: #eee; border: 1.5px solid var(--navy); border-radius: 50px; overflow: hidden; margin-top: 4px; }
  .lb-rate-fill { height: 100%; background: var(--coral); border-radius: 50px; transition: width .6s ease; }
  .lb-col-tier { display: flex; justify-content: center; }
  .lb-tier-badge {
    display: flex; align-items: center; gap: 5px;
    border: 2px solid var(--navy); border-radius: 50px;
    padding: 4px 12px; font-size: 0.72rem; font-weight: 800;
    box-shadow: 2px 2px 0 var(--navy);
  }
  .lb-me-chip {
    font-size: 0.6rem; font-weight: 900; background: var(--mint);
    border: 1.5px solid var(--navy); border-radius: 50px;
    padding: 1px 6px; margin-left: 4px; white-space: nowrap;
  }

  /* ── ELO EXPLAINER ── */
  .lb-elo-card {
    border: var(--border); border-radius: 20px; overflow: hidden;
    box-shadow: var(--shadow-lg); margin-bottom: 32px;
  }
  .lb-elo-head {
    background: var(--navy); color: white; padding: 14px 20px;
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    display: flex; align-items: center; gap: 8px;
  }
  .lb-elo-body { background: white; padding: 20px; }
  .lb-elo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .lb-elo-tier {
    display: flex; align-items: center; gap: 10px;
    border: 2px solid var(--navy); border-radius: 14px;
    padding: 10px 14px; box-shadow: 2px 2px 0 var(--navy);
  }
  .lb-elo-tier-icon { font-size: 1.4rem; }
  .lb-elo-tier-name { font-weight: 800; font-size: 0.82rem; }
  .lb-elo-tier-range { font-size: 0.68rem; font-weight: 700; opacity: 0.5; }

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

  @media (max-width: 900px) {
    .lb-header { padding: 32px 20px 0; }
    .lb-header h1 { font-size: 2.2rem; }
    .lb-body { padding: 28px 16px 60px; }
    .lb-row { grid-template-columns: 40px 1fr 80px 70px; gap: 8px; padding: 12px 14px; }
    .lb-col-rate, .lb-col-tier { display: none; }
    .lb-podium { padding: 24px 16px 0; }
  }
`;

// ─── Rank Medal ───────────────────────────────────────────────────────────────

function rankDisplay(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow({ i }: { i: number }) {
  return (
    <div className="lb-row" style={{ animationDelay: `${i * 0.04}s` }}>
      <div className="lb-skel" style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="lb-skel" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <div className="lb-skel" style={{ width: 100, height: 16, marginBottom: 6 }} />
          <div className="lb-skel" style={{ width: 70, height: 11 }} />
        </div>
      </div>
      <div className="lb-skel" style={{ width: 50, height: 28, margin: "0 auto", borderRadius: 8 }} />
      <div className="lb-skel" style={{ width: 40, height: 22, margin: "0 auto", borderRadius: 8 }} />
      <div className="lb-skel" style={{ width: 44, height: 22, margin: "0 auto", borderRadius: 8 }} />
      <div className="lb-skel" style={{ width: 80, height: 26, margin: "0 auto", borderRadius: 50 }} />
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ players }: { players: Player[] }) {
  if (players.length < 1) return null;
  const first  = players[0];
  const second = players[1];
  const third  = players[2];

  const podiumOrder = [second, first, third].filter(Boolean);
  const heights     = [80, 110, 60];
  const classes     = ["second", "first", "third"];
  const medals      = ["🥈", "🥇", "🥉"];
  const colors      = ["#C0C0C0", "#FFB800", "#CD7F32"];

  return (
    <div className="lb-podium">
      {podiumOrder.map((player, i) => {
        if (!player) return null;
        const isFirst = player._id === first._id;
        return (
          <div key={player._id} className={`lb-podium-place ${classes[i]}`}>
            {isFirst && <div className="lb-podium-crown">👑</div>}
            <div
              className={`lb-podium-avatar${isFirst ? " first" : ""}`}
              style={{ background: player.color, boxShadow: `4px 4px 0 ${getTier(player.elo ?? 1000).shadow}`, border: `3px solid ${getTier(player.elo ?? 1000).color}` }}
            >
              {player.avatar}
            </div>
            <div className="lb-podium-name">{player.nickname}</div>
            <div className="lb-podium-elo">{player.elo ?? 1000} ELO</div>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const currentUser = useQuery(api.users.currentUser) as any;
  const rawPlayers  = useQuery(api.users.leaderboard, currentUser ? {} : "skip") as Player[] | undefined;
  const loading     = rawPlayers === undefined;

  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState<SortKey>("elo");
  const [tierFilter,  setTierFilter]  = useState<string | null>(null);

  const players: Player[] = (rawPlayers ?? []).map((p: any) => ({
    ...p,
    elo:     (p.elo     && !isNaN(p.elo))     ? p.elo     : 1000,
    wins:    (p.wins    && !isNaN(p.wins))    ? p.wins    : 0,
    losses:  (p.losses  && !isNaN(p.losses))  ? p.losses  : 0,
    winRate: (p.winRate && !isNaN(p.winRate)) ? p.winRate : 0,
    badge:   p.badge   ?? "🌱 Rising",
  }));

  const filtered = useMemo(() => {
    let result = [...players];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.nickname.toLowerCase().includes(q) ||
        (p.badge ?? "").toLowerCase().includes(q)
      );
    }

    if (tierFilter) {
      result = result.filter(p => getTier(p.elo).label === tierFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "wins")    return b.wins - a.wins;
      if (sortBy === "winRate") return b.winRate - a.winRate;
      return b.elo - a.elo;
    });

    return result;
  }, [players, search, sortBy, tierFilter]);

  // Stats
  const topElo    = players.length > 0 ? Math.max(...players.map(p => p.elo ?? 1000)) : 0;
  const avgElo    = players.length > 0 ? Math.round(players.reduce((s, p) => s + (p.elo ?? 1000), 0) / players.length) : 0;
  const totalWins = players.reduce((s, p) => s + (p.wins ?? 0), 0);

  // Top 3 for podium (sorted by ELO)
  const top3 = [...players].sort((a, b) => b.elo - a.elo).slice(0, 3);

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
            <div className="lb-header-tag">🏆 ELO Rankings</div>
            <h1>Who&apos;s the<br /><span>top dog?</span></h1>
            <p className="lb-header-sub">
              ELO updates after every session. Beat stronger players, gain more. Lose to weaker ones, drop fast.
            </p>
          </div>

          {/* Podium */}
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
              <div className="lb-stat-num">{topElo}</div>
              <div className="lb-stat-lbl">Top ELO</div>
            </div>
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{avgElo}</div>
              <div className="lb-stat-lbl">Avg ELO</div>
            </div>
            <div className="lb-stat-tile">
              <div className="lb-stat-num">{totalWins}</div>
              <div className="lb-stat-lbl">Podium Finishes</div>
            </div>
          </div>

          {/* ELO tier explainer */}
          <div className="lb-elo-card">
            <div className="lb-elo-head">⚡ How ELO Works</div>
            <div className="lb-elo-body">
              <p style={{ fontSize: "0.82rem", fontWeight: 700, opacity: 0.6, marginBottom: 16, lineHeight: 1.6 }}>
                After every session, ELO shifts based on your placement vs everyone else's expected rank.
                Beat a higher-rated player? Big gain. Lose to a lower-rated one? Bigger drop.
                New players start at <strong>1000</strong>. K-factor decreases as you play more games.
              </p>
              <div className="lb-elo-grid">
                {TIER_CONFIG.map((tier) => (
                  <div key={tier.label} className="lb-elo-tier" style={{ background: tier.bg }}>
                    <div className="lb-elo-tier-icon">{tier.icon}</div>
                    <div>
                      <div className="lb-elo-tier-name">{tier.label}</div>
                      <div className="lb-elo-tier-range">
                        {tier.min === 0 ? "< 1200" : tier.min >= 1800 ? "1800+" : `${tier.min}–${tier.min + 199}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tier filter chips */}
          <div className="lb-tiers">
            <button
              className="lb-tier-chip"
              style={{ background: tierFilter === null ? "#1a1a2e" : "white", color: tierFilter === null ? "white" : "#1a1a2e" }}
              onClick={() => setTierFilter(null)}
            >
              All Tiers
            </button>
            {TIER_CONFIG.map(tier => (
              <button
                key={tier.label}
                className={`lb-tier-chip${tierFilter === tier.label ? " active" : ""}`}
                style={{
                  background: tierFilter === tier.label ? tier.color : "white",
                  color: "#1a1a2e",
                }}
                onClick={() => setTierFilter(tierFilter === tier.label ? null : tier.label)}
              >
                {tier.icon} {tier.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="lb-toolbar">
            <div className="lb-search-wrap">
              <span className="lb-search-icon">🔍</span>
              <input
                className="lb-search"
                placeholder="Search players…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="lb-sort-wrap">
              <select className="lb-sort" value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}>
                <option value="elo">ELO Rating</option>
                <option value="wins">Most Podiums</option>
                <option value="winRate">Win Rate</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="lb-table">
              {[0, 1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} i={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="lb-empty">
              <div className="lb-empty-icon">🏆</div>
              <div className="lb-empty-title">{players.length === 0 ? "No ranked players yet" : "No matches"}</div>
              <div className="lb-empty-sub">
                {players.length === 0
                  ? "Play your first session to get ranked on the leaderboard."
                  : "Try a different search or tier filter."}
              </div>
            </div>
          ) : (
            <div className="lb-table">
              {filtered.map((player, i) => {
                const tier   = getTier(player.elo);
                const isMe   = currentUser?._id === player._id;
                const rank   = players.indexOf(player) + 1; // rank by full unsorted list
                const rowClass = `lb-row${rank === 1 ? " top-1" : rank === 2 ? " top-2" : rank === 3 ? " top-3" : ""}${isMe ? " is-me" : ""}`;
                const total  = (player.wins ?? 0) + (player.losses ?? 0);

                return (
                  <div key={player._id} className={rowClass} style={{ animationDelay: `${i * 0.04}s`, cursor: "pointer" }}
                    onClick={() => window.location.href = `/profile/${player._id}`}>
                    {/* Rank */}
                    <div className="lb-col-rank" style={{
                      color: rank === 1 ? "#FFB800" : rank === 2 ? "#888" : rank === 3 ? "#CD7F32" : "#1a1a2e"
                    }}>
                      {rankDisplay(rank)}
                    </div>

                    {/* Player */}
                    <div className="lb-col-player">
                      <div className="lb-player-avatar" style={{ background: player.color }}>
                        {player.avatar}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div className="lb-player-name">{player.nickname}</div>
                          {isMe && <span className="lb-me-chip">You</span>}
                        </div>
                        <div className="lb-player-badge">{player.badge}</div>
                        {(player.playStyle ?? []).length > 0 && (
                          <div className="lb-player-styles">
                            {(player.playStyle ?? []).slice(0, 2).map(s => (
                              <span key={s} className="lb-style-chip">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="lb-col-elo">
                      <div className="lb-elo-num" style={{ color: tier.color }}>{player.elo ?? 1000}</div>
                      <div className="lb-elo-label">ELO</div>
                    </div>

                    {/* Wins */}
                    <div className="lb-col-wins">
                      {player.wins ?? 0}🏅
                      <div style={{ fontSize: "0.62rem", fontWeight: 800, opacity: 0.4 }}>
                        {total}G
                      </div>
                    </div>

                    {/* Win rate */}
                    <div className="lb-col-rate">
                      <div className="lb-rate-num">{player.winRate ?? 0}%</div>
                      <div className="lb-rate-bar">
                        <div className="lb-rate-fill" style={{ width: `${player.winRate ?? 0}%` }} />
                      </div>
                    </div>

                    {/* Tier badge */}
                    <div className="lb-col-tier">
                      <div className="lb-tier-badge" style={{ background: tier.bg, borderColor: tier.color, boxShadow: `2px 2px 0 ${tier.shadow}` }}>
                        {tier.icon} {tier.label}
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