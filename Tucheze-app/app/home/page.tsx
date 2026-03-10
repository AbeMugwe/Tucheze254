"use client";

import { useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";



// ─── Types ────────────────────────────────────────────────────────────────────

// Mirrors your Convex `users` table schema
interface ConvexUser {
  _id: string;
  nickname: string;
  avatar: string;       // emoji e.g. "😎"
  color: string;        // hex e.g. "#FF6B6B"
  elo: number;
  wins: number;
  winRate: number;      // 0–100
  badge: string;        // e.g. "🔥 Comeback King"
}

// Mirrors your Convex `sessions` table
interface ConvexSession {
  _id: string;
  name: string;
  date: string;
  location: string;
  emoji: string;
  playerAvatars: string[];
  rsvpCount: number;
  bg: string;
  type: "upcoming" | "recent";
  game?: string;
  winner?: string;
  gameIcon?: string;
  gameBg?: string;
}

// Mirrors your Convex `stats` table (group-level aggregate)
interface GroupStats {
  sessionsPlayed: number;
  activePlayers: number;
  gamesInLibrary: number;
  totalRounds: number;
}

interface PollOption {
  game: string;
  emoji: string;
  votes: number;
  total: number;
}

interface ActivityItem {
  icon: string;
  text: ReactNode;
  time: string;
  bg: string;
}

type LeaderboardTab = "season" | "all-time" | "monthly";





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

  /* ── NAV ── */
  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 0; position: sticky; top: 0; z-index: 100;
    background: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    border-bottom: var(--border);
  }
  .logo {
    font-family: 'Fredoka One', cursive; font-size: 1.8rem;
    color: var(--coral); text-shadow: 3px 3px 0 var(--ink);
    letter-spacing: 1px; display: flex; align-items: center; gap: 8px;
  }
  .logo-badge {
    background: var(--yellow); border: var(--border); border-radius: 50%;
    width: 36px; height: 36px; display: flex; align-items: center;
    justify-content: center; font-size: 1.1rem; box-shadow: var(--shadow);
  }
  .nav-links { display: flex; gap: 10px; align-items: center; }
  .nav-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 8px 18px; border: var(--border); border-radius: 50px; cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s; text-decoration: none;
    background: var(--white); color: var(--ink); box-shadow: var(--shadow);
  }
  .nav-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--ink); }
  .nav-btn.primary { background: var(--coral); color: white; }
  .nav-btn.logout  { background: var(--navy);  color: white; }

  /* user chip in nav */
  .nav-user-chip {
    display: flex; align-items: center; gap: 8px;
    border: var(--border); border-radius: 50px;
    padding: 4px 14px 4px 4px;
    background: var(--white); box-shadow: var(--shadow);
    cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
  }
  .nav-user-chip:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--ink); }
  .nav-user-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    border: 2px solid var(--ink);
    display: flex; align-items: center; justify-content: center; font-size: 1rem;
  }
  .nav-user-name { font-weight: 800; font-size: 0.82rem; }

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
    .hero           { grid-template-columns: 1fr; }
    .stats-grid     { grid-template-columns: repeat(2,1fr); }
    .upcoming-grid  { grid-template-columns: 1fr; }
    .lb-row         { grid-template-columns: 36px 1fr 70px 60px; }
    .lb-rate        { display: none; }
  }
`;

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
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("season");
  const [votedFor,  setVotedFor]  = useState<number | null>(null);

  // ── Auth (real Convex) ────────────────────────────────────────────────────
  const { signOut: _signOut } = useAuthActions();
  const currentUser = useQuery(api.users.currentUser);
  // undefined = still loading, null = logged out, object = logged in

  const signOut = async () => {
    await _signOut();
  };

  // ── Suppress the unused useEffect warning — no longer needed ──────────────
  useEffect(() => {}, []);

  // ── Data queries ─────────────────────────────────────────────────────────
  // These return undefined while loading, null when unauthenticated, or data.
  const leaderboard      = useQuery(api.users.leaderboard, currentUser ? {} : "skip");
  // Sessions, stats, polls and activity will use their own query files once built.
  // For now they stay as undefined (showing skeleton/empty states).
  const upcomingSessions  = undefined as ConvexSession[] | undefined;
  const recentSessions    = undefined as ConvexSession[] | undefined;
  const groupStats        = undefined as GroupStats     | undefined;
  const pollOptions       = undefined as PollOption[]   | undefined;
  const activityFeed      = undefined as ActivityItem[] | undefined;

  const handleVote = (idx: number) => setVotedFor(idx);

  return (
    <>
      <style>{FONTS}{styles}</style>
      <div className="page">

        {/* ── NAV ── */}
        <nav>
          <div className="logo">
            <div className="logo-badge">🎲</div>
            Tucheze254
          </div>

          <div className="nav-links">
            <a className="nav-btn" href="#">Sessions</a>
            <a className="nav-btn" href="#">Games</a>
            <a className="nav-btn" href="#">Leaderboard</a>

            {currentUser ? (
              // ── LOGGED IN ──
              <>
                <button className="nav-btn primary">+ New Session</button>

                {/* User avatar chip */}
                <div className="nav-user-chip" title={currentUser.nickname}>
                  <div className="nav-user-avatar" style={{ background: currentUser.color }}>
                    {currentUser.avatar}
                  </div>
                  <span className="nav-user-name">{currentUser.nickname}</span>
                </div>

                {/* Log out */}
                <button className="nav-btn logout" onClick={signOut}>
                  👋 Log Out
                </button>
              </>
            ) : (
              // ── LOGGED OUT ──
              <>
                {/* TODO: replace href with router Link to="/signin" */}
                <a className="nav-btn" href="/signin">Log In</a>
                <a className="nav-btn primary" href="/signup">Sign Up →</a>
              </>
            )}
          </div>
        </nav>

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
              <h1>Hey <span>{currentUser.avatar} {currentUser.nickname}</span>,<br />ready to play?</h1>
            ) : (
              <h1>Your crew.<br /><span>Your scores.</span><br />Your legends.</h1>
            )}

            <p>Track every W, every L, every legendary comeback. Tucheze254 is where your game nights live forever. 🎉</p>

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
                🏆 Leaderboard <span className="section-pill">Season 4</span>
              </div>
              <button className="btn btn-navy" style={{ fontSize:"0.8rem", padding:"8px 16px" }}>View All →</button>
            </div>
            <div className="leaderboard-card">
              <div className="lb-header">
                <div className="lb-title">🎖️ Top Players</div>
                <div className="lb-tabs">
                  {(["season","all-time","monthly"] as LeaderboardTab[]).map((t) => (
                    <button key={t} className={`lb-tab${activeTab===t?" active":""}`} onClick={() => setActiveTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1).replace("-"," ")}
                    </button>
                  ))}
                </div>
              </div>

              {leaderboard === undefined || leaderboard === null ? (
                // Loading skeletons (undefined = loading, null = not yet authed)
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : leaderboard.length === 0 ? (
                <div style={{ padding: 32 }}>
                  <EmptyState icon="🏆" title="No players yet" sub="Players will appear here once they join and play." />
                </div>
              ) : (
                leaderboard.map((p, i) => (
                  <div key={p._id} className={`lb-row${i===0?" gold":""}`}>
                    <div className={`lb-rank rank-${i+1}`}>{RANK_MEDALS[i] ?? i+1}</div>
                    <div className="lb-player">
                      <div className="lb-avatar" style={{ background: p.color }}>{p.avatar}</div>
                      <div>
                        <div className="lb-name">{p.nickname}</div>
                        <div className="lb-badge">{p.badge}</div>
                      </div>
                    </div>
                    <div className="lb-elo">{p.elo}</div>
                    <div className="lb-wins">{p.wins}W</div>
                    <div className="lb-rate">
                      <div className="rate-bar"><div className="rate-fill" style={{ width:`${p.winRate}%` }} /></div>
                      <div className="rate-txt">{p.winRate}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ── UPCOMING SESSIONS ── */}
            <div className="section-header">
              <div className="section-title">📅 Upcoming Sessions</div>
              <button className="btn btn-lime" style={{ fontSize:"0.8rem", padding:"8px 16px" }}>+ Schedule</button>
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
              <EmptyState icon="📅" title="No upcoming sessions" sub="Schedule your next game night!" />
            ) : (
              <div className="upcoming-grid">
                {upcomingSessions.map((s) => (
                  <div key={s._id} className="session-card" style={{ background: s.bg }}>
                    <div className="corner-emoji">{s.emoji}</div>
                    <div className="session-type">{s.type === "upcoming" ? "Next Up" : "This Month"}</div>
                    <div className="session-name">{s.name}</div>
                    <div className="session-info">📍 {s.date} · {s.location}</div>
                    <div className="session-avatars">
                      {s.playerAvatars.slice(0,4).map((av, j) => (
                        <div key={j} className="mini-avatar" style={{ background:"white", border:"2px solid #1a1a2e" }}>{av}</div>
                      ))}
                      <div className="rsvp-chip">{s.rsvpCount} going</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── POLL + ACTIVITY ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

              {/* Poll */}
              <div>
                <div className="section-header">
                  <div className="section-title">🗳️ Tonight's Poll</div>
                </div>
                <div className="poll-card">
                  <div className="poll-header">
                    <div className="poll-title">🎲 What should we play?</div>
                    <div className="poll-end">Closes in 2h</div>
                  </div>
                  <div className="poll-options">
                    {pollOptions === undefined ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} style={{ padding:"12px 0" }}>
                          <div className="skeleton" style={{ width:"100%", height:44, borderRadius:14 }} />
                        </div>
                      ))
                    ) : pollOptions.length === 0 ? (
                      <EmptyState icon="🗳️" title="No active poll" sub="The host hasn't started a vote yet." />
                    ) : (
                      <>
                        {pollOptions.map((o, i) => (
                          <div key={i} className={`poll-option${votedFor===i?" voted":""}`} onClick={() => handleVote(i)}>
                            <div className="poll-fill" style={{ width: votedFor!==null ? `${Math.round((o.votes/o.total)*100)}%` : "0%" }} />
                            <div className="poll-option-inner">
                              <div className="poll-game">
                                <span>{o.emoji}</span>
                                <div>
                                  {o.game}
                                  {votedFor===i && <div className="poll-votes">← your vote</div>}
                                </div>
                              </div>
                              <div>
                                {votedFor!==null && <div className="poll-pct">{Math.round((o.votes/o.total)*100)}%</div>}
                                <div className="poll-votes">{o.votes} votes</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {votedFor===null && (
                          <p style={{ fontSize:"0.75rem", fontWeight:700, opacity:0.4, textAlign:"center", paddingBottom:4 }}>Tap to vote 👆</p>
                        )}
                      </>
                    )}
                  </div>
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
              <button className="btn btn-mint" style={{ fontSize:"0.8rem", padding:"8px 16px" }}>View All →</button>
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
                {recentSessions.map((r) => (
                  <div key={r._id} className="recent-row">
                    <div className="recent-game-icon" style={{ background: r.gameBg ?? "#FFE135" }}>{r.gameIcon ?? "🎮"}</div>
                    <div className="recent-info">
                      <div className="recent-name">{r.game}</div>
                      <div className="recent-sub">{r.name} · {r.date}</div>
                    </div>
                    {r.winner && <div className="winner-tag">🏆 {r.winner}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* ── CTA ── */}
            <div className="cta-banner" style={{ marginTop:50 }}>
              <h2>Ready for the next one? 🎉</h2>
              <p>Create a session, invite your crew, and let the games begin.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
                <button className="btn btn-yellow">🎮 Start Session</button>
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