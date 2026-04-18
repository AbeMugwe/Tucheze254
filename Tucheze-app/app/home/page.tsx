"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";



// ─── Types ────────────────────────────────────────────────────────────────────

interface ConvexUser {
  _id: string;
  nickname: string;
  avatar: string;
  color: string;
  points: number;
  wins: number;
  winRate: number;
  badge: string;
}

interface GroupStats {
  sessionsPlayed: number;
  activePlayers: number;
  gamesInLibrary: number;
  totalRounds: number;
}

interface ActivityItem {
  icon: string;
  text: string;
  time: string;
  bg: string;
  ts: number;
}







// ─── CSS ──────────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const styles = `
  :root {
    --yellow: #FFE135; --coral: #FF6B6B; --mint: #4ECDC4;
    --navy: #1a1a2e;   --lime: #C8F135;  --pink: #FF9ECD;
    --white: #FFFDF5;  --ink: #1a1a2e;
    --border: 3px solid var(--ink);
    --shadow: 4px 4px 0px var(--ink);
    --shadow-lg: 6px 6px 0px var(--ink);
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    color: var(--ink); overflow-x: hidden;
  }
  .page { max-width: 1100px; margin: 0 auto; padding: 0 20px 80px; }

  /* ── HERO ── */
  .hero {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 40px; align-items: center; padding: 60px 0 50px;
  }
  .hero-left h1 {
    font-family: 'Fredoka One', cursive; font-size: 3.8rem;
    line-height: 1.05; color: var(--ink); margin-bottom: 16px;
  }
  .hero-left h1 span { color: var(--coral); }
  .hero-left p {
    font-size: 1.05rem; font-weight: 700; color: #555;
    line-height: 1.6; margin-bottom: 28px; max-width: 420px;
  }
  .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.95rem;
    padding: 12px 24px; border: var(--border); border-radius: 50px; cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s; box-shadow: var(--shadow);
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .btn-coral  { background: var(--coral); color: white; }
  .btn-yellow { background: var(--yellow); color: var(--ink); }
  .btn-mint   { background: var(--mint);  color: var(--ink); }
  .btn-navy   { background: var(--navy);  color: white; }
  .btn-lime   { background: var(--lime);  color: var(--ink); }

  /* hero card */
  .hero-right { position: relative; }
  .hero-card {
    background: var(--navy); border: var(--border); border-radius: 24px;
    box-shadow: var(--shadow-lg); padding: 28px; color: white;
    position: relative; overflow: hidden;
  }
  .hero-card::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 120px; height: 120px; background: var(--coral); opacity: 0.15; border-radius: 50%;
  }
  .session-label {
    font-size: 0.7rem; font-weight: 800; letter-spacing: 2px;
    color: var(--mint); text-transform: uppercase; margin-bottom: 6px;
  }
  .session-title { font-family: 'Fredoka One', cursive; font-size: 1.6rem; margin-bottom: 16px; color: var(--yellow); }
  .session-meta  { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .meta-chip {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 50px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700;
  }
  .live-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--coral); color: white; border-radius: 50px;
    padding: 5px 14px; font-size: 0.75rem; font-weight: 800;
    animation: pulse 2s infinite;
  }
  .live-dot { width: 7px; height: 7px; background: white; border-radius: 50%; animation: blink 1s infinite; }
  @keyframes blink  { 0%,100%{opacity:1}   50%{opacity:0.3} }
  @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
  .sticker {
    position: absolute; font-size: 2rem;
    animation: wobble 3s ease-in-out infinite; cursor: default; user-select: none;
  }
  .sticker:nth-child(2) { animation-delay: -1s; }
  @keyframes wobble { 0%,100%{transform:rotate(-5deg) scale(1)} 50%{transform:rotate(5deg) scale(1.08)} }

  /* ── SECTION HEADERS ── */
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; margin-top: 50px;
  }
  .section-title {
    font-family: 'Fredoka One', cursive; font-size: 1.6rem;
    color: var(--ink); display: flex; align-items: center; gap: 10px;
  }
  .section-pill {
    background: var(--yellow); border: var(--border); border-radius: 50px;
    padding: 2px 12px; font-size: 0.75rem; font-weight: 800; box-shadow: var(--shadow);
  }

  /* ── STAT CARDS ── */
  .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 50px; }
  .stat-card {
    border: var(--border); border-radius: 20px; padding: 20px 18px;
    box-shadow: var(--shadow); transition: transform 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .stat-icon { font-size: 1.8rem; margin-bottom: 8px; }
  .stat-num  { font-family: 'Fredoka One', cursive; font-size: 2.2rem; line-height: 1; margin-bottom: 4px; }
  .stat-label{ font-size: 0.78rem; font-weight: 700; opacity: 0.6; }

  /* ── LEADERBOARD ── */
  .leaderboard-card { border: var(--border); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-lg); margin-bottom: 50px; }
  .lb-header { background: var(--navy); color: white; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
  .lb-title  { font-family: 'Fredoka One', cursive; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
  .lb-tabs   { display: flex; gap: 6px; }
  .lb-tab {
    padding: 4px 14px; border-radius: 50px; font-size: 0.75rem; font-weight: 800;
    border: 1.5px solid rgba(255,255,255,0.3); cursor: pointer;
    background: transparent; color: white; font-family: 'Nunito', sans-serif;
    transition: background 0.15s;
  }
  .lb-tab.active { background: var(--coral); border-color: var(--coral); }
  .lb-row {
    display: grid; grid-template-columns: 40px 1fr 80px 80px 70px;
    align-items: center; gap: 12px; padding: 14px 24px;
    border-bottom: 2px solid #eee; transition: background 0.15s;
  }
  .lb-row:last-child { border-bottom: none; }
  .lb-row:hover  { background: #fafafa; }
  .lb-row.gold   { background: #fffbea; }
  .lb-rank  { font-family: 'Fredoka One', cursive; font-size: 1.1rem; text-align: center; }
  .rank-1 { color: #FFB800; } .rank-2 { color: #999; } .rank-3 { color: #cd7f32; }
  .lb-player { display: flex; align-items: center; gap: 10px; }
  .lb-avatar {
    width: 36px; height: 36px; border-radius: 50%; border: 2.5px solid var(--ink);
    display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;
  }
  .lb-name  { font-weight: 800; font-size: 0.9rem; }
  .lb-badge {
    font-size: 0.65rem; font-weight: 700; background: var(--pink);
    border: 1.5px solid var(--ink); border-radius: 50px;
    padding: 1px 8px; display: inline-block; margin-top: 2px;
  }
  .lb-elo  { font-family: 'Fredoka One', cursive; font-size: 1rem; text-align: center; }
  .lb-wins { font-weight: 800; text-align: center; font-size: 0.9rem; }
  .lb-rate { text-align: center; }
  .rate-bar {
    height: 8px; border-radius: 50px; background: #eee; overflow: hidden;
    margin-bottom: 2px; border: 1.5px solid var(--ink);
  }
  .rate-fill { height: 100%; border-radius: 50px; background: var(--mint); }
  .rate-txt  { font-size: 0.7rem; font-weight: 800; }

  /* ── SESSIONS ── */
  .upcoming-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 50px; }
  .session-card {
    border: var(--border); border-radius: 20px; padding: 22px; box-shadow: var(--shadow);
    position: relative; overflow: hidden;
    transition: transform 0.15s, box-shadow 0.15s; cursor: pointer;
  }
  .session-card:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .corner-emoji  { position: absolute; top: -5px; right: 10px; font-size: 2.8rem; opacity: 0.15; }
  .session-type  { font-size: 0.65rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; opacity: 0.5; }
  .session-name  { font-family: 'Fredoka One', cursive; font-size: 1.3rem; margin-bottom: 8px; }
  .session-info  { font-size: 0.8rem; font-weight: 700; opacity: 0.65; }
  .session-avatars { display: flex; margin-top: 14px; align-items: center; }
  .mini-avatar {
    width: 28px; height: 28px; border-radius: 50%; border: 2px solid white;
    margin-left: -6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
  }
  .mini-avatar:first-child { margin-left: 0; }
  .rsvp-chip {
    margin-left: 10px; font-size: 0.7rem; font-weight: 800;
    background: var(--lime); border: 1.5px solid var(--ink); border-radius: 50px; padding: 2px 10px;
  }
  .recent-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 50px; }
  .recent-row {
    display: flex; align-items: center; gap: 16px; border: var(--border);
    border-radius: 16px; padding: 16px 20px; box-shadow: var(--shadow); background: white;
    transition: transform 0.15s, box-shadow 0.15s; cursor: pointer;
  }
  .recent-row:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .recent-game-icon {
    width: 48px; height: 48px; border-radius: 14px; border: var(--border);
    display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; box-shadow: var(--shadow);
  }
  .recent-info { flex: 1; }
  .recent-name { font-weight: 800; font-size: 0.95rem; margin-bottom: 3px; }
  .recent-sub  { font-size: 0.78rem; font-weight: 600; opacity: 0.55; }
  .winner-tag  {
    background: var(--yellow); border: var(--border); border-radius: 50px;
    padding: 4px 12px; font-size: 0.75rem; font-weight: 800; box-shadow: 2px 2px 0 var(--ink);
  }

  /* ── POLL ── */
  .poll-card { border: var(--border); border-radius: 24px; overflow: hidden; box-shadow: var(--shadow-lg); }
  .poll-header {
    background: var(--lime); padding: 18px 24px; border-bottom: var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .poll-title { font-family: 'Fredoka One', cursive; font-size: 1.2rem; }
  .poll-end   { font-size: 0.75rem; font-weight: 700; opacity: 0.6; }
  .poll-options { padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
  .poll-option {
    border: var(--border); border-radius: 14px; padding: 12px 16px; cursor: pointer;
    position: relative; overflow: hidden; transition: transform 0.1s; background: white;
  }
  .poll-option:hover { transform: translate(-1px,-1px); }
  .poll-option.voted { border-color: var(--mint); }
  .poll-fill {
    position: absolute; left: 0; top: 0; bottom: 0;
    background: rgba(78,205,196,0.15); border-radius: 14px; transition: width 0.4s ease;
  }
  .poll-option-inner { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; }
  .poll-game  { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 0.9rem; }
  .poll-pct   { font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--mint); }
  .poll-votes { font-size: 0.7rem; font-weight: 700; opacity: 0.5; margin-top: 2px; }

  /* ── ACTIVITY ── */
  .activity-list { display: flex; flex-direction: column; gap: 10px; }
  .activity-item {
    display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px;
    border: var(--border); border-radius: 14px; background: white; box-shadow: 2px 2px 0 var(--ink);
  }
  .activity-icon {
    width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--ink);
    flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1rem;
  }
  .activity-text { font-size: 0.82rem; font-weight: 700; line-height: 1.5; }
  .activity-text strong { color: var(--coral); }
  .activity-time { font-size: 0.7rem; font-weight: 600; opacity: 0.4; margin-top: 2px; }

  /* ── CTA ── */
  .cta-banner {
    background: var(--navy); border: var(--border); border-radius: 24px; padding: 40px;
    text-align: center; box-shadow: var(--shadow-lg); position: relative; overflow: hidden;
  }
  .cta-banner::before {
    content: '🎲🃏🎮🕹️🎯'; position: absolute; top: 10px; left: 0; right: 0;
    font-size: 1.5rem; letter-spacing: 20px; opacity: 0.1;
  }
  .cta-banner h2 { font-family: 'Fredoka One', cursive; font-size: 2.2rem; color: var(--yellow); margin-bottom: 10px; }
  .cta-banner p  { color: rgba(255,255,255,0.7); font-weight: 700; margin-bottom: 24px; }

  /* ── BOTTOM NAV HINT ── */
  .bottom-hint { display: flex; justify-content: center; gap: 24px; padding-top: 20px; border-top: var(--border); margin-top: 50px; }
  .hint-item {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    font-size: 0.72rem; font-weight: 800; opacity: 0.4; cursor: pointer; transition: opacity 0.15s;
  }
  .hint-item:hover { opacity: 0.9; }
  .hint-item.active { opacity: 1; }
  .hint-icon { font-size: 1.4rem; }

  /* ── SKELETON LOADING ── */
  .skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── EMPTY STATES ── */
  .empty-state {
    text-align: center; padding: 48px 24px;
    border: 3px dashed #ddd; border-radius: 20px;
    background: rgba(255,255,255,0.5);
  }
  .empty-state-icon  { font-size: 3rem; margin-bottom: 12px; opacity: 0.4; }
  .empty-state-title { font-family: 'Fredoka One', cursive; font-size: 1.2rem; opacity: 0.4; margin-bottom: 6px; }
  .empty-state-sub   { font-size: 0.8rem; font-weight: 700; opacity: 0.3; }

  /* ── LOGGED-OUT GATE ── */
  .auth-gate {
    text-align: center; padding: 60px 32px;
    border: var(--border); border-radius: 24px;
    box-shadow: var(--shadow-lg); background: white;
    margin: 40px 0;
  }
  .auth-gate-icon  { font-size: 4rem; margin-bottom: 16px; }
  .auth-gate-title { font-family: 'Fredoka One', cursive; font-size: 2rem; margin-bottom: 8px; }
  .auth-gate-sub   { font-size: 0.9rem; font-weight: 700; opacity: 0.45; margin-bottom: 28px; }
  .auth-gate-btns  { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  @media (max-width: 768px) {
    .page { padding: 0 14px 80px; }

    /* ── HERO ── */
    .hero { grid-template-columns: 1fr; gap: 24px; padding: 32px 0 32px; }
    .hero-left h1 { font-size: 2.4rem; }
    .hero-left p  { font-size: 0.9rem; margin-bottom: 20px; }
    .hero-right   { margin-top: 0; }
    .hero-card    { padding: 20px; border-radius: 18px; }
    .session-title { font-size: 1.3rem; margin-bottom: 12px; }
    .session-meta  { gap: 8px; margin-bottom: 14px; }
    .meta-chip     { font-size: 0.7rem; padding: 3px 10px; }
    .sticker       { display: none; }
    .hero-actions { gap: 8px; }
    .btn          { font-size: 0.85rem; padding: 10px 18px; }

    /* ── STATS ── */
    .stats-grid { grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 32px; }
    .stat-card  { padding: 16px 14px; border-radius: 16px; }
    .stat-icon  { font-size: 1.4rem; margin-bottom: 6px; }
    .stat-num   { font-size: 1.8rem; }
    .stat-label { font-size: 0.72rem; }

    /* ── SECTION HEADERS ── */
    .section-header  { margin-top: 36px; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
    .section-title   { font-size: 1.3rem; }

    /* ── LEADERBOARD ── */
    .leaderboard-card { border-radius: 18px; margin-bottom: 36px; }
    .lb-header  { padding: 12px 16px; }
    .lb-title   { font-size: 1rem; }
    .lb-row {
      grid-template-columns: 32px 1fr 58px 48px;
      gap: 8px; padding: 11px 14px;
    }
    .lb-rate  { display: none; }
    .lb-elo   { font-size: 0.9rem; }
    .lb-wins  { font-size: 0.82rem; }
    .lb-name  { font-size: 0.82rem; }
    .lb-badge { display: none; }
    .lb-avatar { width: 30px; height: 30px; font-size: 0.9rem; }

    /* ── UPCOMING SESSIONS ── */
    .upcoming-grid { grid-template-columns: 1fr; gap: 12px; }
    .session-card  { padding: 18px 16px; border-radius: 16px; }
    .session-name  { font-size: 1.1rem; }

    /* ── POLL + ACTIVITY ── */
    .poll-card { border-radius: 18px; }
    .poll-header { padding: 14px 18px; flex-wrap: wrap; gap: 8px; }
    .poll-title  { font-size: 1rem; }
    .poll-options { padding: 12px 14px; gap: 8px; }
    .poll-option  { padding: 10px 12px; }
    .poll-game    { font-size: 0.82rem; }

    /* ── RECENT SESSIONS ── */
    .recent-list { gap: 8px; }
    .recent-row  { padding: 12px 14px; gap: 12px; border-radius: 14px; }
    .recent-game-icon { width: 40px; height: 40px; font-size: 1.2rem; border-radius: 11px; }
    .recent-name { font-size: 0.88rem; }
    .recent-sub  { font-size: 0.7rem; }
    .winner-tag  { font-size: 0.7rem; padding: 3px 10px; }

    /* ── ACTIVITY + POLL GRID → STACK ── */
    .poll-activity-grid { grid-template-columns: 1fr !important; gap: 0 !important; }

    /* ── ACTIVITY ── */
    .activity-item { padding: 10px 12px; gap: 10px; }
    .activity-icon { width: 30px; height: 30px; font-size: 0.85rem; }
    .activity-text { font-size: 0.78rem; }
    .activity-time { font-size: 0.65rem; }

    /* ── AUTH GATE ── */
    .auth-gate { padding: 40px 20px; margin: 24px 0; border-radius: 18px; }
    .auth-gate-icon  { font-size: 3rem; }
    .auth-gate-title { font-size: 1.6rem; }
    .auth-gate-btns  { flex-direction: column; align-items: center; }

    /* ── CTA BANNER ── */
    .cta-banner { padding: 28px 20px; border-radius: 18px; }
    .cta-banner h2 { font-size: 1.6rem; }
    .cta-banner p  { font-size: 0.85rem; }

    /* ── BOTTOM NAV ── */
    .bottom-hint { gap: 16px; padding-top: 16px; overflow-x: auto; }
    .hint-item   { font-size: 0.65rem; }
    .hint-icon   { font-size: 1.2rem; }
  }

  @media (max-width: 480px) {
    .page { padding: 0 12px 80px; }
    .hero-left h1 { font-size: 2rem; }
    .stats-grid   { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-num     { font-size: 1.6rem; }
    .section-title { font-size: 1.2rem; }
    .lb-row { grid-template-columns: 28px 1fr 50px; gap: 6px; padding: 10px 12px; }
    .lb-wins { display: none; }
  }`


// ─── Small helper components ──────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="lb-row">
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <div className="skeleton" style={{ width: 90, height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 70, height: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: 40, height: 18, margin: "0 auto" }} />
      <div className="skeleton" style={{ width: 36, height: 18, margin: "0 auto" }} />
      <div className="skeleton" style={{ width: 50, height: 12, margin: "0 auto" }} />
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-sub">{sub}</div>
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉", "4", "5"];
const STAT_META   = [
  { label: "Sessions Played",  icon: "🎉", bg: "#FFE135" },
  { label: "Active Players",   icon: "👥", bg: "#4ECDC4" },
  { label: "Games in Library", icon: "🎲", bg: "#FF9ECD" },
  { label: "Total Rounds",     icon: "🏁", bg: "#C8F135" },
];
const NAV_ITEMS: [string, string][] = [
  ["🏠","Home"],["📅","Sessions"],["🎲","Games"],["🏆","Standings"],["👤","Profile"],
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Tucheze254Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const _currentUser = useQuery(api.users.currentUser);
  const currentUser  = _currentUser as ConvexUser | null | undefined;

  // ── Real Convex queries ───────────────────────────────────────────────────
  const skip = currentUser ? {} : "skip";
  const leaderboard      = useQuery(api.users.leaderboard,      currentUser ? {} : "skip");
  const groupStatsRaw    = useQuery(api.sessions.groupStats,     skip) as GroupStats | null | undefined;
  const upcomingRaw      = useQuery(api.sessions.upcoming,       skip);
  const recentRaw        = useQuery(api.sessions.recent,         skip);
  const activityRaw      = useQuery(api.sessions.activityFeed,   skip) as ActivityItem[] | null | undefined;
  const pollRaw          = useQuery(api.polls.active,            skip);
  const castVote         = useMutation(api.polls.vote);
  const startPoll        = useMutation(api.polls.start);

  // Normalise — undefined = loading, null/[] = empty
  const groupStats       = groupStatsRaw   ?? undefined;
  const upcomingSessions = upcomingRaw     as any[] | undefined;
  const recentSessions   = recentRaw       as any[] | undefined;
  const activityFeed     = activityRaw     ?? undefined;
  const poll             = pollRaw         as any | null | undefined;
  const isAdmin          = useQuery(api.users.isAdmin,           skip) as boolean | undefined;

  // ── Live countdown (ticks every second client-side) ───────────────────────
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [startingPoll, setStartingPoll] = useState(false);

  useEffect(() => {
    if (!poll?.closesAt) { setSecondsLeft(0); return; }
    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(poll.closesAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [poll?.closesAt]);

  const pollExpired = poll ? secondsLeft === 0 : false;

  // Format mm:ss countdown
  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleVote = async (optionIndex: number) => {
    if (!poll || pollExpired) return;
    try {
      await castVote({ pollId: poll._id, optionIndex });
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  const handleStartPoll = async () => {
    setStartingPoll(true);
    try {
      await startPoll({});
    } catch (e) {
      console.error("Start poll failed:", e);
    } finally {
      setStartingPoll(false);
    }
  };

  return (
    <>
      <style>{FONTS}{styles}</style>
      <div className="page">

        {/* ── NAV ── */}
        <Navbar />

        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-left">
            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              <span style={{ background:"#FF6B6B", color:"white", border:"2.5px solid #1a1a2e", borderRadius:50, padding:"4px 14px", fontSize:"0.75rem", fontWeight:800, boxShadow:"2px 2px 0 #1a1a2e" }}>
                🔴 LIVE SESSION
              </span>
              <span style={{ background:"#C8F135", border:"2.5px solid #1a1a2e", borderRadius:50, padding:"4px 14px", fontSize:"0.75rem", fontWeight:800, boxShadow:"2px 2px 0 #1a1a2e" }}>
                Friday Game Night
              </span>
            </div>

            {currentUser ? (
              <h1>Hey <span>{currentUser.avatar ?? "🎲"} {currentUser.nickname ?? "Player"}</span>,<br />ready to play?</h1>
            ) : (
              <h1>Your crew.<br /><span>Your scores.</span><br />Your legends.</h1>
            )}

            <p>Track every W, every L, every legendary comeback. PlotnPlay is where your game nights live forever. 🎉</p>

            <div className="hero-actions">
              {currentUser ? (
                <>
                  <button className="btn btn-coral">🎮 Join Session</button>
                  <button className="btn btn-yellow">📊 See Standings</button>
                  <button className="btn btn-navy">🎲 Pick a Game</button>
                </>
              ) : (
                <>
                  <a className="btn btn-coral" href="/signup">🚀 Get Started Free</a>
                  <a className="btn btn-yellow" href="/signin">🔑 Log In</a>
                </>
              )}
            </div>
          </div>

          <div className="hero-right">
            <div className="sticker" style={{ top:-20, right:-10 }}>🎯</div>
            <div className="sticker" style={{ bottom:-15, right:-15 }}>🏆</div>
            <div className="hero-card">
              <div className="session-label">🟢 Live Now</div>
              <div className="session-title">Friday Game Night #42</div>
              <div className="session-meta">
                <div className="meta-chip">🎴 Exploding Kittens</div>
                <div className="meta-chip">🕐 Round 2/3</div>
                <div className="meta-chip">📍 Njoro's Place</div>
              </div>
              <div className="live-badge">
                <div className="live-dot" /> Live updates
              </div>
            </div>
          </div>
        </div>

        {/* ── AUTH GATE (logged-out users see a prompt instead of data) ── */}
        {!currentUser && (
          <div className="auth-gate">
            <div className="auth-gate-icon">🔐</div>
            <div className="auth-gate-title">Sign in to see your group's stats</div>
            <div className="auth-gate-sub">Leaderboards, sessions, and activity are visible to logged-in members.</div>
            <div className="auth-gate-btns">
              <a className="btn btn-coral"  href="/signup">✨ Create Account</a>
              <a className="btn btn-navy"   href="/signin">🔑 Sign In</a>

            </div>
          </div>
        )}

        {/* ── CONTENT (only shown when logged in) ── */}
        {currentUser && (
          <>
            {/* ── STAT CARDS ── */}
            <div className="stats-grid">
              {STAT_META.map((meta, i) => (
                <div key={i} className="stat-card" style={{ background: meta.bg }}>
                  <div className="stat-icon">{meta.icon}</div>
                  {groupStats === undefined ? (
                    <div className="skeleton" style={{ width: 60, height: 32, marginBottom: 4 }} />
                  ) : (
                    <div className="stat-num">
                      {[
                        groupStats.sessionsPlayed,
                        groupStats.activePlayers,
                        groupStats.gamesInLibrary,
                        groupStats.totalRounds,
                      ][i]}
                    </div>
                  )}
                  <div className="stat-label">{meta.label}</div>
                </div>
              ))}
            </div>

            {/* ── LEADERBOARD ── */}
            <div className="section-header">
              <div className="section-title">
                🏆 Leaderboard <span className="section-pill">Point Rankings</span>
              </div>
              <a href="/leaderboard" className="btn btn-navy" style={{ fontSize:"0.8rem", padding:"8px 16px", textDecoration:"none" }}>View Full →</a>
            </div>
            <div className="leaderboard-card">
              <div className="lb-header">
                <div className="lb-title">🎖️ Top Players</div>
                <div style={{ fontSize:"0.72rem", fontWeight:800, color:"rgba(255,255,255,0.4)" }}>Points · Wins · Win Rate</div>
              </div>

              {leaderboard === undefined || leaderboard === null ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : leaderboard.length === 0 ? (
                <div style={{ padding: 32 }}>
                  <EmptyState icon="🏆" title="No players yet" sub="Players will appear here once they join and play." />
                </div>
              ) : (
                (leaderboard as any[]).slice(0, 8).map((p: any, i: number) => {
                  const points  = p.points ?? 0;
const ptsSign = points > 0 ? "+" : "";
const ptsColor = points >= 100 ? "#0F6E56" : points >= 0 ? "#1a1a2e" : "#993C1D";
const isMe    = (currentUser as any)?._id === p._id;
const games   = (p.wins ?? 0) + (p.losses ?? 0);
const ptTag   = points >= 400 ? "G.O.A.T" : points >= 200 ? "Elite" : points >= 100 ? "Solid" : points >= 20 ? "Rising" : points > 0 ? "Legend in training" : points === 0 ? "Just started" : points >= -50 ? "Meh..." : points >= -100 ? "Trash" : points >= -150 ? "Are you even playing?" : "Delete the account";
return (
  <div key={p._id} className={`lb-row${i===0?" gold":""}`}
    style={isMe ? { borderLeft:"4px solid #4ECDC4", background:"#f0fdfb" } : {}}>
    <div className={`lb-rank rank-${i+1}`}>{(RANK_MEDALS as any)[i] ?? `#${i+1}`}</div>
    <div className="lb-player">
      <div className="lb-avatar" style={{ background: p.color }}>{p.avatar}</div>
      <div>
        <div className="lb-name">
          {p.nickname}
          {isMe && <span style={{ fontSize:"0.6rem", fontWeight:900, background:"#4ECDC4", color:"#1a1a2e", borderRadius:50, padding:"1px 6px", marginLeft:6 }}>You</span>}
        </div>
        <div className="lb-badge">{ptTag}</div>
      </div>
    </div>
    <div className="lb-elo" style={{ color: ptsColor, fontWeight: 800 }}>{ptsSign}{points}</div>
    <div className="lb-wins">{p.wins ?? 0}🏅</div>
    <div className="lb-rate">
      <div className="rate-bar"><div className="rate-fill" style={{ width:`${p.winRate ?? 0}%` }} /></div>
      <div className="rate-txt">{p.winRate ?? 0}%</div>
    </div>
  </div>
);
                })
              )}
            </div>

            {/* ── UPCOMING SESSIONS ── */}
            <div className="section-header">
              <div className="section-title">📅 Upcoming Sessions</div>
              {isAdmin && (
                <a href="/sessions/new" className="btn btn-lime" style={{ fontSize:"0.8rem", padding:"8px 16px", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6 }}>
                  + Schedule
                </a>
              )}
            </div>
            {upcomingSessions === undefined ? (
              <div className="upcoming-grid">
                {[0,1].map((i) => (
                  <div key={i} style={{ border:"3px solid #1a1a2e", borderRadius:20, padding:22, boxShadow:"4px 4px 0 #1a1a2e" }}>
                    <div className="skeleton" style={{ width:80,  height:11, marginBottom:10 }} />
                    <div className="skeleton" style={{ width:160, height:22, marginBottom:10 }} />
                    <div className="skeleton" style={{ width:130, height:12, marginBottom:16 }} />
                    <div style={{ display:"flex", gap:6 }}>
                      {[0,1,2].map((j) => <div key={j} className="skeleton" style={{ width:28, height:28, borderRadius:"50%" }} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div style={{ marginBottom:50 }}>
                <EmptyState icon="📅" title="No upcoming sessions" sub="Schedule your next game night!" />
              </div>
            ) : (
              <div className="upcoming-grid" style={{ marginBottom:50 }}>
                {upcomingSessions.map((s: any) => {
                  const bg = ["#FFE13533","#4ECDC433","#FF9ECD33","#C8F13533"][
                    Math.abs(s._id.charCodeAt(0)) % 4
                  ];
                  return (
                    <a key={s._id} href="/sessions" className="session-card" style={{ background: bg, textDecoration:"none", color:"inherit" }}>
                      <div className="corner-emoji">{s.games[0]?.emoji ?? "🎲"}</div>
                      <div className="session-type">Upcoming</div>
                      <div className="session-name">{s.name}</div>
                      <div className="session-info">📍 {s.location} · {new Date(s.date).toLocaleDateString("en-KE",{day:"numeric",month:"short"})}</div>
                      <div className="session-avatars">
                        {s.players.slice(0,4).map((p: any, j: number) => (
                          <div key={j} className="mini-avatar" style={{ background: p.color ?? "#4ECDC4" }}>{p.avatar ?? "🎲"}</div>
                        ))}
                        <div className="rsvp-chip">{s.players.length} going</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {/* ── POLL + ACTIVITY ── */}
            <div className="poll-activity-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* Poll */}
              <div>
                <div className="section-header">
                  <div className="section-title">🗳️ Tonight's Poll</div>
                  {/* Start Poll button — shown when no active poll or poll expired */}
                  {poll !== undefined && (!poll || pollExpired) && (
                    <button
                      className="btn btn-lime"
                      style={{ fontSize:"0.8rem", padding:"8px 16px" }}
                      disabled={startingPoll}
                      onClick={handleStartPoll}
                    >
                      {startingPoll ? "Starting…" : "▶ Start Poll"}
                    </button>
                  )}
                </div>
                <div className="poll-card">
                  {poll === undefined ? (
                    // Loading
                    <>
                      <div className="poll-header">
                        <div className="skeleton" style={{ width:180, height:18 }} />
                        <div className="skeleton" style={{ width:70, height:14 }} />
                      </div>
                      <div className="poll-options">
                        {[0,1,2].map(i => (
                          <div key={i} style={{ padding:"12px 0" }}>
                            <div className="skeleton" style={{ width:"100%", height:44, borderRadius:14 }} />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : !poll ? (
                    // No active poll
                    <>
                      <div className="poll-header">
                        <div className="poll-title">🎲 What should we play?</div>
                        <div className="poll-end">No active poll</div>
                      </div>
                      <div className="poll-options">
                        <div style={{ textAlign:"center", padding:"32px 16px", opacity:0.45 }}>
                          <div style={{ fontSize:"2.5rem", marginBottom:10 }}>🗳️</div>
                          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.1rem", marginBottom:6 }}>No active poll</div>
                          <div style={{ fontSize:"0.78rem", fontWeight:700 }}>Hit "▶ Start Poll" to kick one off — games are pulled straight from your library.</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Active poll
                    <>
                      <div className="poll-header" style={{ alignItems:"center" }}>
                        <div className="poll-title">🎲 {poll.question}</div>
                        {/* Live countdown */}
                        <div className="poll-end" style={{
                          display:"flex", alignItems:"center", gap:6,
                          color: pollExpired ? "#FF6B6B" : secondsLeft < 60 ? "#FF6B6B" : "inherit",
                          fontFamily: "'Fredoka One', cursive",
                          fontSize: "0.9rem",
                        }}>
                          {pollExpired ? (
                            <span>⏱ Closed</span>
                          ) : (
                            <>
                              <span style={{
                                display:"inline-block", minWidth:52,
                                background: secondsLeft < 60 ? "#FF6B6B" : "#1a1a2e",
                                color:"white", borderRadius:50, padding:"2px 10px",
                                fontSize:"0.82rem", textAlign:"center",
                                animation: secondsLeft < 30 ? "pulse 1s infinite" : "none",
                              }}>
                                {formatCountdown(secondsLeft)}
                              </span>
                              left
                            </>
                          )}
                        </div>
                      </div>
                      <div className="poll-options">
                        {poll.options.map((o: any, i: number) => {
                          const hasVoted  = poll.myVoteIndex >= 0;
                          const isMyVote  = poll.myVoteIndex === i;
                          const pct       = o.total > 0 ? Math.round((o.votes / o.total) * 100) : 0;
                          const canVote   = !pollExpired;
                          return (
                            <div key={i}
                              className={`poll-option${isMyVote ? " voted" : ""}`}
                              onClick={() => canVote && handleVote(i)}
                              style={{ cursor: canVote ? "pointer" : "default", opacity: pollExpired && !isMyVote ? 0.6 : 1 }}>
                              <div className="poll-fill" style={{ width: hasVoted || pollExpired ? `${pct}%` : "0%" }} />
                              <div className="poll-option-inner">
                                <div className="poll-game">
                                  <span style={{ fontSize:"1.2rem" }}>{o.emoji}</span>
                                  <div>
                                    <div>{o.game}</div>
                                    {isMyVote && !pollExpired && <div className="poll-votes">← your vote</div>}
                                  </div>
                                </div>
                                <div style={{ textAlign:"right" }}>
                                  {(hasVoted || pollExpired) && <div className="poll-pct">{pct}%</div>}
                                  <div className="poll-votes">{o.votes} vote{o.votes !== 1 ? "s" : ""}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {poll.myVoteIndex < 0 && !pollExpired && (
                          <p style={{ fontSize:"0.75rem", fontWeight:700, opacity:0.4, textAlign:"center", paddingBottom:4 }}>Tap to vote 👆</p>
                        )}
                        {pollExpired && (
                          <p style={{ fontSize:"0.75rem", fontWeight:700, color:"#FF6B6B", textAlign:"center", paddingBottom:4 }}>
                            ⏱ Poll closed · {poll.options.reduce((max: any, o: any) => o.votes > (max?.votes ?? -1) ? o : max, null)?.game ?? "—"} wins!
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Activity */}
              <div>
                <div className="section-header">
                  <div className="section-title">⚡ Recent Activity</div>
                </div>
                {activityFeed === undefined ? (
                  <div className="activity-list">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="activity-item">
                        <div className="skeleton" style={{ width:34, height:34, borderRadius:"50%", flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div className="skeleton" style={{ width:"80%", height:12, marginBottom:6 }} />
                          <div className="skeleton" style={{ width:"40%", height:10 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityFeed.length === 0 ? (
                  <EmptyState icon="⚡" title="No activity yet" sub="Things will show up here as your crew plays." />
                ) : (
                  <div className="activity-list">
                    {activityFeed.map((a, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-icon" style={{ background: a.bg }}>{a.icon}</div>
                        <div>
                          <div className="activity-text">{a.text}</div>
                          <div className="activity-time">{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RECENT SESSIONS ── */}
            <div className="section-header" style={{ marginTop:50 }}>
              <div className="section-title">🕹️ Recent Sessions</div>
              <a href="/sessions" className="btn btn-mint" style={{ fontSize:"0.8rem", padding:"8px 16px", textDecoration:"none" }}>View All →</a>
            </div>
            {recentSessions === undefined ? (
              <div className="recent-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:16, border:"3px solid #1a1a2e", borderRadius:16, padding:"16px 20px", boxShadow:"4px 4px 0 #1a1a2e", background:"white" }}>
                    <div className="skeleton" style={{ width:48, height:48, borderRadius:14, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div className="skeleton" style={{ width:140, height:14, marginBottom:8 }} />
                      <div className="skeleton" style={{ width:200, height:11 }} />
                    </div>
                    <div className="skeleton" style={{ width:90, height:28, borderRadius:50 }} />
                  </div>
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <EmptyState icon="🕹️" title="No sessions yet" sub="Play your first game night to see it here!" />
            ) : (
              <div className="recent-list">
                {recentSessions.map((s: any) => {
                  const game   = s.games[0];
                  const winner = s.teamWinner ? s.teamWinner.name : s.winner?.nickname;
                  const date   = new Date(s.date).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"});
                  return (
                    <a key={s._id} href="/sessions" className="recent-row" style={{ textDecoration:"none", color:"inherit" }}>
                      <div className="recent-game-icon" style={{ background:"#FFE13544" }}>
                        {game?.emoji ?? "🎮"}
                      </div>
                      <div className="recent-info">
                        <div className="recent-name">{s.name}</div>
                        <div className="recent-sub">
                          {game?.name ?? "Game night"} · {s.location} · {date} · {s.players.length} players
                        </div>
                      </div>
                      {winner && <div className="winner-tag">🏆 {winner}</div>}
                    </a>
                  );
                })}
              </div>
            )}

            {/* ── CTA ── */}
            <div className="cta-banner" style={{ marginTop:50 }}>
              <h2>Ready for the next one? 🎉</h2>
              <p>Create a session, invite your crew, and let the games begin.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                {isAdmin && (<button className="btn btn-yellow">🎮 Start Session</button>)}
                <button className="btn btn-coral">👥 Invite Players</button>
                <button className="btn btn-mint">🎲 Pick Random Game</button>
              </div>
            </div>
          </>
        )}

        {/* ── BOTTOM NAV ── */}
        <div className="bottom-hint">
          {NAV_ITEMS.map(([icon, label], i) => (
            <div key={i} className={`hint-item${i===0?" active":""}`}>
              <div className="hint-icon">{icon}</div>
              {label}
            </div>
          ))}
        </div>

      </div>
    </>
  );
}