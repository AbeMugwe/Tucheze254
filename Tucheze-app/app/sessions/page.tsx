"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionPlayer {
  userId: string;
  nickname: string;
  avatar: string;
  color: string;
  score: number;
  rank: number;
}

interface Session {
  _id: string;
  _creationTime: number;
  name: string;
  location: string;
  date: string;               // ISO string
  status: "upcoming" | "live" | "completed";
  games: { name: string; emoji: string }[];
  players: SessionPlayer[];
  winner?: { nickname: string; avatar: string; color: string };
  totalRounds?: number;
  durationMinutes?: number;
  createdBy: string;
}

type FilterTab = "all" | "upcoming" | "completed";
type SortKey   = "date" | "players" | "game";

// ─── Fonts & CSS ─────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --yellow: #FFE135; --coral: #FF6B6B; --mint: #4ECDC4;
    --navy:   #1a1a2e; --lime:  #C8F135; --pink: #FF9ECD;
    --sky:    #A8DAFF; --white: #FFFDF5;
    --border: 3px solid #1a1a2e;
    --shadow: 4px 4px 0 #1a1a2e;
    --shadow-lg: 6px 6px 0 #1a1a2e;
  }

  .sp-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh;
    color: var(--navy);
  }
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

  /* ── HEADER ── */
  .sp-header {
    background: var(--navy);
    border-bottom: var(--border);
    padding: 48px 40px 56px;
    position: relative; overflow: hidden;
  }
  .sp-header-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px; pointer-events: none;
  }
  .sp-header-glow {
    position: absolute; width: 350px; height: 350px;
    border-radius: 50%; filter: blur(70px); opacity: 0.12; pointer-events: none;
  }
  .sp-header-inner {
    position: relative; z-index: 1;
    max-width: 1100px; margin: 0 auto;
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 24px; flex-wrap: wrap;
  }
  .sp-header-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,225,53,0.12); border: 2px solid rgba(255,225,53,0.3);
    color: var(--yellow); border-radius: 50px; padding: 4px 14px;
    font-size: 0.7rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 14px;
  }
  .sp-header h1 {
    font-family: 'Fredoka One', cursive; font-size: 2.8rem;
    color: white; line-height: 1.05; margin-bottom: 8px;
  }
  .sp-header h1 span { color: var(--coral); }
  .sp-header-sub {
    font-size: 0.9rem; font-weight: 700;
    color: rgba(255,255,255,0.4); max-width: 440px;
  }
  .sp-header-stats {
    display: flex; gap: 14px; flex-wrap: wrap;
  }
  .sp-header-stat {
    background: rgba(255,255,255,0.07);
    border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 14px; padding: 12px 18px;
    text-align: center; min-width: 80px;
  }
  .sp-stat-num {
    font-family: 'Fredoka One', cursive; font-size: 1.5rem; color: var(--yellow);
  }
  .sp-stat-label {
    font-size: 0.66rem; font-weight: 800;
    color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px;
  }

  /* New Session CTA button in header */
  .sp-new-btn {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    background: var(--coral); color: white;
    border: var(--border); border-radius: 50px;
    padding: 13px 30px; cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition: transform .1s, box-shadow .1s;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    white-space: nowrap;
  }
  .sp-new-btn:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 var(--navy); }

  /* ── BODY ── */
  .sp-body { max-width: 1100px; margin: 0 auto; padding: 40px 40px 80px; }

  /* ── TOOLBAR ── */
  .sp-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; flex-wrap: wrap;
  }
  .sp-search-wrap { flex: 1; min-width: 200px; position: relative; }
  .sp-search-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    pointer-events: none; font-size: 1rem;
  }
  .sp-search {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem;
    padding: 11px 14px 11px 40px;
    border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); transition: box-shadow .15s;
  }
  .sp-search:focus { box-shadow: 6px 6px 0 var(--navy); }
  .sp-sort-wrap { position: relative; }
  .sp-sort-wrap::after {
    content: "▾"; position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%); pointer-events: none; font-size: 0.8rem;
  }
  .sp-sort-select {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 11px 32px 11px 14px; border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); cursor: pointer; appearance: none;
  }

  /* ── FILTER TABS ── */
  .sp-tabs {
    display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap;
  }
  .sp-tab {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
    padding: 8px 20px; border: 2.5px solid var(--navy); border-radius: 50px;
    cursor: pointer; background: white; color: var(--navy);
    box-shadow: 3px 3px 0 var(--navy); transition: all .12s;
  }
  .sp-tab:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--navy); }
  .sp-tab.active { background: var(--navy); color: white; box-shadow: 2px 2px 0 rgba(0,0,0,0.3); }
  .sp-tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--coral); color: white; border-radius: 50px;
    font-size: 0.65rem; font-weight: 900; padding: 1px 7px; margin-left: 5px;
  }
  .sp-tab.active .sp-tab-count { background: rgba(255,255,255,0.25); }

  /* ── RESULTS BAR ── */
  .sp-results-bar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 8px;
  }
  .sp-results-count { font-size: 0.82rem; font-weight: 800; opacity: 0.45; }
  .sp-results-count span { color: var(--coral); opacity: 1; }

  /* ── SESSION CARDS ── */
  .sp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }

  .sp-card {
    background: white; border: var(--border); border-radius: 22px;
    box-shadow: var(--shadow-lg); overflow: hidden;
    transition: transform .15s, box-shadow .15s; cursor: pointer;
    display: flex; flex-direction: column;
    animation: cardPop .3s cubic-bezier(.34,1.56,.64,1) both;
  }
  .sp-card:hover { transform: translate(-3px,-3px); box-shadow: 9px 9px 0 var(--navy); }
  @keyframes cardPop {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)   scale(1); }
  }

  .sp-card-banner {
    padding: 18px 20px 14px;
    border-bottom: var(--border);
    position: relative; overflow: hidden;
  }
  .sp-card-banner-pattern {
    position: absolute; inset: 0; opacity: 0.08;
    background-image: radial-gradient(circle, #000 1px, transparent 1px);
    background-size: 18px 18px; pointer-events: none;
  }
  .sp-status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    border: 2px solid var(--navy); border-radius: 50px;
    padding: 3px 10px; font-size: 0.65rem; font-weight: 800;
    letter-spacing: 0.5px; text-transform: uppercase;
    margin-bottom: 8px; position: relative; z-index: 1;
  }
  .sp-status-dot {
    width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  }
  .sp-card-name {
    font-family: 'Fredoka One', cursive; font-size: 1.35rem;
    line-height: 1.1; position: relative; z-index: 1;
    margin-bottom: 4px;
  }
  .sp-card-meta {
    font-size: 0.78rem; font-weight: 700; opacity: 0.5;
    position: relative; z-index: 1;
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  }
  .sp-card-meta-sep { opacity: 0.3; }

  .sp-card-body { padding: 16px 20px; flex: 1; display: flex; flex-direction: column; gap: 14px; }

  /* Games played */
  .sp-games-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .sp-game-chip {
    display: flex; align-items: center; gap: 5px;
    background: var(--white); border: 2px solid rgba(26,26,46,0.12);
    border-radius: 50px; padding: 3px 10px;
    font-size: 0.72rem; font-weight: 800;
  }

  /* Players strip */
  .sp-players-strip { display: flex; align-items: center; gap: 6px; }
  .sp-player-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    border: 2.5px solid var(--navy);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.9rem; margin-left: -8px; transition: transform .1s;
  }
  .sp-player-avatar:first-child { margin-left: 0; }
  .sp-player-avatar:hover { transform: translateY(-3px); z-index: 1; }
  .sp-players-more {
    font-size: 0.7rem; font-weight: 800; opacity: 0.45; margin-left: 4px;
  }

  /* Stats row inside card */
  .sp-card-stats {
    display: flex; gap: 8px;
  }
  .sp-card-stat {
    flex: 1; background: var(--white); border: 2px solid rgba(26,26,46,0.1);
    border-radius: 12px; padding: 8px 10px; text-align: center;
  }
  .sp-card-stat-val {
    font-family: 'Fredoka One', cursive; font-size: 1.1rem; color: var(--coral);
  }
  .sp-card-stat-lbl {
    font-size: 0.6rem; font-weight: 800; opacity: 0.4;
    text-transform: uppercase; letter-spacing: 0.4px;
  }

  /* Winner banner */
  .sp-winner-row {
    display: flex; align-items: center; gap: 8px;
    background: var(--yellow); border: 2px solid var(--navy);
    border-radius: 12px; padding: 8px 12px;
    box-shadow: 2px 2px 0 var(--navy);
  }
  .sp-winner-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid var(--navy);
    display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
  }
  .sp-winner-label { font-size: 0.7rem; font-weight: 800; opacity: 0.5; }
  .sp-winner-name  { font-family: 'Fredoka One', cursive; font-size: 0.95rem; }

  /* Card footer */
  .sp-card-footer {
    padding: 12px 20px;
    border-top: 2px solid rgba(26,26,46,0.07);
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
  }
  .sp-card-date { font-size: 0.75rem; font-weight: 800; opacity: 0.35; }
  .sp-live-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--coral); color: white;
    border: 2px solid var(--navy); border-radius: 50px;
    font-size: 0.65rem; font-weight: 800; padding: 3px 10px;
    animation: pulseLive 2s ease-in-out infinite;
  }
  @keyframes pulseLive { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  .sp-live-dot { width: 6px; height: 6px; border-radius: 50%; background: white; animation: blinkLive 1s infinite; }
  @keyframes blinkLive { 0%,100%{opacity:1} 50%{opacity:0.2} }
  .sp-view-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.75rem;
    padding: 6px 14px; border: 2px solid var(--navy); border-radius: 50px;
    background: white; cursor: pointer;
    box-shadow: 2px 2px 0 var(--navy); transition: all .12s;
    text-decoration: none; color: var(--navy);
  }
  .sp-view-btn:hover { background: var(--navy); color: white; }

  /* ── EMPTY STATE ── */
  .sp-empty {
    text-align: center; padding: 80px 40px;
    border: 3px dashed rgba(26,26,46,0.2); border-radius: 24px;
    background: rgba(255,255,255,0.5);
  }
  .sp-empty-icon  { font-size: 4rem; margin-bottom: 16px; opacity: 0.5; }
  .sp-empty-title { font-family: 'Fredoka One', cursive; font-size: 1.6rem; margin-bottom: 8px; opacity: 0.5; }
  .sp-empty-sub   { font-size: 0.88rem; font-weight: 700; opacity: 0.35; margin-bottom: 28px; }

  /* ── SKELETON ── */
  .sp-skeleton {
    background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* ── DETAIL DRAWER ── */
  .sp-overlay {
    position: fixed; inset: 0; background: rgba(26,26,46,0.6);
    z-index: 200; display: flex; align-items: flex-end; justify-content: center;
    animation: overlayIn .2s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .sp-drawer {
    background: var(--white); width: 100%; max-width: 680px;
    max-height: 90vh; border-radius: 24px 24px 0 0;
    border: var(--border); border-bottom: none;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
    overflow-y: auto;
    animation: drawerUp .32s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes drawerUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
  .sp-drawer-handle {
    width: 40px; height: 4px; background: rgba(26,26,46,0.2);
    border-radius: 2px; margin: 14px auto 0;
  }
  .sp-drawer-banner {
    height: 110px; border-bottom: var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 3.5rem; position: relative;
  }
  .sp-drawer-close {
    position: absolute; top: 14px; right: 14px;
    width: 32px; height: 32px; border-radius: 50%;
    background: white; border: 2px solid var(--navy);
    cursor: pointer; font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 2px 2px 0 var(--navy); transition: all .12s;
  }
  .sp-drawer-close:hover { background: var(--coral); color: white; }
  .sp-drawer-body { padding: 24px 28px 32px; }
  .sp-drawer-title { font-family: 'Fredoka One', cursive; font-size: 1.9rem; margin-bottom: 4px; }
  .sp-drawer-sub { font-size: 0.8rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
  .sp-drawer-section { font-size: 0.7rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .sp-drawer-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 22px; }
  .sp-drawer-stat {
    background: white; border: var(--border); border-radius: 14px;
    padding: 12px 8px; text-align: center; box-shadow: var(--shadow);
  }
  .sp-drawer-stat-val { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: var(--coral); }
  .sp-drawer-stat-lbl { font-size: 0.58rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.4px; }

  /* Final scores table in drawer */
  .sp-scores-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
  .sp-score-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; border: var(--border); border-radius: 14px;
    background: white; box-shadow: var(--shadow);
  }
  .sp-score-rank { font-family: 'Fredoka One', cursive; font-size: 1.1rem; width: 28px; text-align: center; flex-shrink: 0; }
  .sp-score-avatar {
    width: 32px; height: 32px; border-radius: 50%; border: 2.5px solid var(--navy);
    display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;
  }
  .sp-score-name { font-weight: 800; font-size: 0.9rem; flex: 1; }
  .sp-score-pts  { font-family: 'Fredoka One', cursive; font-size: 1.1rem; color: var(--coral); }

  @media (max-width: 768px) {
    .sp-header { padding: 28px 20px 36px; }
    .sp-header h1 { font-size: 2rem; }
    .sp-body { padding: 28px 16px 60px; }
    .sp-grid { grid-template-columns: 1fr; }
    .sp-header-inner { flex-direction: column; align-items: flex-start; }
    .sp-drawer-stats { grid-template-columns: repeat(2,1fr); }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function rankMedal(rank: number) {
  return RANK_MEDALS[rank - 1] ?? `${rank}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function statusStyle(status: Session["status"]) {
  if (status === "live")      return { bg: "#FF6B6B22", color: "#FF6B6B", label: "Live" };
  if (status === "upcoming")  return { bg: "#4ECDC422", color: "#4ECDC4", label: "Upcoming" };
  return                             { bg: "#C8F13522", color: "#5a7a00", label: "Completed" };
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ background: "white", border: "3px solid #1a1a2e", borderRadius: 22, boxShadow: "4px 4px 0 #1a1a2e", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px 14px", borderBottom: "3px solid #1a1a2e" }}>
        <div className="sp-skeleton" style={{ width: 70, height: 12, marginBottom: 10 }} />
        <div className="sp-skeleton" style={{ width: 160, height: 22, marginBottom: 8 }} />
        <div className="sp-skeleton" style={{ width: 120, height: 11 }} />
      </div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="sp-skeleton" style={{ width: "100%", height: 32, borderRadius: 50 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => <div key={i} className="sp-skeleton" style={{ width: 30, height: 30, borderRadius: "50%" }} />)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => <div key={i} className="sp-skeleton" style={{ flex: 1, height: 48, borderRadius: 12 }} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, onClick, style }: {
  session: Session; onClick: () => void; style?: React.CSSProperties;
}) {
  const st = statusStyle(session.status);
  const shownPlayers = session.players.slice(0, 5);
  const extraPlayers = session.players.length - 5;

  // BG tint based on status
  const bannerBg = session.status === "live"
    ? "#FF6B6B18"
    : session.status === "upcoming"
      ? "#4ECDC418"
      : "#FFE13518";

  return (
    <div className="sp-card" onClick={onClick} style={style}>
      {/* Banner */}
      <div className="sp-card-banner" style={{ background: bannerBg }}>
        <div className="sp-card-banner-pattern" />
        <div className="sp-status-badge" style={{ background: st.bg, color: st.color }}>
          <div className="sp-status-dot" />
          {st.label}
        </div>
        <div className="sp-card-name">{session.name}</div>
        <div className="sp-card-meta">
          <span>📍 {session.location}</span>
          <span className="sp-card-meta-sep">·</span>
          <span>📅 {formatDate(session.date)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="sp-card-body">
        {/* Games */}
        {session.games.length > 0 && (
          <div className="sp-games-row">
            {session.games.map((g, i) => (
              <div key={i} className="sp-game-chip">
                <span>{g.emoji}</span> {g.name}
              </div>
            ))}
          </div>
        )}

        {/* Players */}
        <div className="sp-players-strip">
          {shownPlayers.map((p) => (
            <div key={p.userId} className="sp-player-avatar"
              style={{ background: p.color }} title={p.nickname}>
              {p.avatar}
            </div>
          ))}
          {extraPlayers > 0 && (
            <span className="sp-players-more">+{extraPlayers} more</span>
          )}
        </div>

        {/* Stats (only for completed) */}
        {session.status === "completed" && (
          <div className="sp-card-stats">
            <div className="sp-card-stat">
              <div className="sp-card-stat-val">{session.players.length}</div>
              <div className="sp-card-stat-lbl">Players</div>
            </div>
            {session.totalRounds !== undefined && (
              <div className="sp-card-stat">
                <div className="sp-card-stat-val">{session.totalRounds}</div>
                <div className="sp-card-stat-lbl">Rounds</div>
              </div>
            )}
            {session.durationMinutes !== undefined && (
              <div className="sp-card-stat">
                <div className="sp-card-stat-val">{session.durationMinutes}m</div>
                <div className="sp-card-stat-lbl">Duration</div>
              </div>
            )}
          </div>
        )}

        {/* Winner */}
        {session.winner && (
          <div className="sp-winner-row">
            <span style={{ fontSize: "1rem" }}>🏆</span>
            <div className="sp-winner-avatar" style={{ background: session.winner.color }}>
              {session.winner.avatar}
            </div>
            <div>
              <div className="sp-winner-label">Winner</div>
              <div className="sp-winner-name">{session.winner.nickname}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sp-card-footer">
        <span className="sp-card-date">{relativeTime(session.date)}</span>
        {session.status === "live"
          ? <div className="sp-live-chip"><div className="sp-live-dot" /> Live now</div>
          : <div className="sp-view-btn">View Details →</div>
        }
      </div>
    </div>
  );
}

// ─── Session Drawer ───────────────────────────────────────────────────────────

function SessionDrawer({ session, onClose }: { session: Session; onClose: () => void }) {
  const st = statusStyle(session.status);
  const bannerBg = session.status === "live" ? "#FF6B6B33"
    : session.status === "upcoming" ? "#4ECDC433" : "#FFE13533";

  const sortedPlayers = [...session.players].sort((a, b) => a.rank - b.rank);

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sp-drawer-handle" />
        <div className="sp-drawer-banner" style={{ background: bannerBg }}>
          <span>{session.games[0]?.emoji ?? "🎲"}</span>
          <button className="sp-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-drawer-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div className="sp-drawer-title">{session.name}</div>
            <div className="sp-status-badge" style={{ background: st.bg, color: st.color, flexShrink: 0 }}>
              <div className="sp-status-dot" />{st.label}
            </div>
          </div>
          <div className="sp-drawer-sub">
            📍 {session.location} &nbsp;·&nbsp; 📅 {formatDate(session.date)}
          </div>

          {/* Stats */}
          <div className="sp-drawer-stats">
            <div className="sp-drawer-stat">
              <div className="sp-drawer-stat-val">{session.players.length}</div>
              <div className="sp-drawer-stat-lbl">Players</div>
            </div>
            <div className="sp-drawer-stat">
              <div className="sp-drawer-stat-val">{session.games.length}</div>
              <div className="sp-drawer-stat-lbl">Games</div>
            </div>
            <div className="sp-drawer-stat">
              <div className="sp-drawer-stat-val">{session.totalRounds ?? "—"}</div>
              <div className="sp-drawer-stat-lbl">Rounds</div>
            </div>
            <div className="sp-drawer-stat">
              <div className="sp-drawer-stat-val">{session.durationMinutes ? `${session.durationMinutes}m` : "—"}</div>
              <div className="sp-drawer-stat-lbl">Duration</div>
            </div>
          </div>

          {/* Games */}
          <div className="sp-drawer-section">Games Played</div>
          <div className="sp-games-row" style={{ marginBottom: 20 }}>
            {session.games.map((g, i) => (
              <div key={i} className="sp-game-chip" style={{ fontSize: "0.82rem", padding: "5px 14px" }}>
                {g.emoji} {g.name}
              </div>
            ))}
          </div>

          {/* Final scores */}
          {session.status === "completed" && sortedPlayers.length > 0 && (
            <>
              <div className="sp-drawer-section">Final Standings</div>
              <div className="sp-scores-list">
                {sortedPlayers.map((p) => (
                  <div key={p.userId} className="sp-score-row"
                    style={{ background: p.rank === 1 ? "#fffbea" : "white" }}>
                    <div className="sp-score-rank" style={{
                      color: p.rank === 1 ? "#FFB800" : p.rank === 2 ? "#999" : p.rank === 3 ? "#cd7f32" : "#1a1a2e"
                    }}>
                      {rankMedal(p.rank)}
                    </div>
                    <div className="sp-score-avatar" style={{ background: p.color }}>{p.avatar}</div>
                    <div className="sp-score-name">{p.nickname}</div>
                    <div className="sp-score-pts">{p.score} pts</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CTA for live sessions */}
          {session.status === "live" && (
            <Link href="/sessions/live"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FF6B6B", color: "white", border: "3px solid #1a1a2e", borderRadius: 14, padding: "13px 20px", fontFamily: "'Fredoka One', cursive", fontSize: "1rem", textDecoration: "none", boxShadow: "4px 4px 0 #1a1a2e", transition: "transform .1s, box-shadow .1s" }}
              onClick={onClose}
            >
              🔴 Join Live Session →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mock data (replace with useQuery(api.sessions.list) once backend is built) ──

const MOCK_SESSIONS: Session[] = [
  {
    _id: "s1", _creationTime: Date.now() - 86400000 * 2,
    name: "Friday Game Night #42", location: "Njoro's Place",
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "completed",
    games: [{ name: "Exploding Kittens", emoji: "🐱" }, { name: "UNO Extreme", emoji: "🎴" }],
    players: [
      { userId: "1", nickname: "Wanjiku", avatar: "😎", color: "#FF6B6B", score: 42, rank: 1 },
      { userId: "2", nickname: "Otieno",  avatar: "🤠", color: "#4ECDC4", score: 38, rank: 2 },
      { userId: "3", nickname: "Amara",   avatar: "🦁", color: "#FFE135", score: 31, rank: 3 },
      { userId: "4", nickname: "Njoro",   avatar: "🐉", color: "#FF9ECD", score: 25, rank: 4 },
    ],
    winner: { nickname: "Wanjiku", avatar: "😎", color: "#FF6B6B" },
    totalRounds: 8, durationMinutes: 95, createdBy: "1",
  },
  {
    _id: "s2", _creationTime: Date.now() - 86400000 * 9,
    name: "Saturday Chill #41", location: "Zawadi's Flat",
    date: new Date(Date.now() - 86400000 * 9).toISOString(),
    status: "completed",
    games: [{ name: "Catan", emoji: "🏝️" }],
    players: [
      { userId: "5", nickname: "Zawadi", avatar: "🌟", color: "#C8F135", score: 55, rank: 1 },
      { userId: "2", nickname: "Otieno", avatar: "🤠", color: "#4ECDC4", score: 48, rank: 2 },
      { userId: "6", nickname: "Baraka", avatar: "🦊", color: "#A8DAFF", score: 39, rank: 3 },
    ],
    winner: { nickname: "Zawadi", avatar: "🌟", color: "#C8F135" },
    totalRounds: 5, durationMinutes: 120, createdBy: "5",
  },
  {
    _id: "s3", _creationTime: Date.now() - 86400000 * 15,
    name: "Game Night #40", location: "Baraka's Spot",
    date: new Date(Date.now() - 86400000 * 15).toISOString(),
    status: "completed",
    games: [{ name: "Codenames", emoji: "🕵️" }, { name: "Jenga", emoji: "🪵" }],
    players: [
      { userId: "3", nickname: "Amara",  avatar: "🦁", color: "#FFE135", score: 66, rank: 1 },
      { userId: "1", nickname: "Wanjiku",avatar: "😎", color: "#FF6B6B", score: 61, rank: 2 },
      { userId: "4", nickname: "Njoro",  avatar: "🐉", color: "#FF9ECD", score: 53, rank: 3 },
      { userId: "5", nickname: "Zawadi", avatar: "🌟", color: "#C8F135", score: 44, rank: 4 },
      { userId: "6", nickname: "Baraka", avatar: "🦊", color: "#A8DAFF", score: 33, rank: 5 },
    ],
    winner: { nickname: "Amara", avatar: "🦁", color: "#FFE135" },
    totalRounds: 12, durationMinutes: 145, createdBy: "3",
  },
  {
    _id: "s4", _creationTime: Date.now() + 86400000 * 3,
    name: "Next Friday #43", location: "Wanjiku's Place",
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: "upcoming",
    games: [{ name: "Pandemic", emoji: "🦠" }],
    players: [
      { userId: "1", nickname: "Wanjiku", avatar: "😎", color: "#FF6B6B", score: 0, rank: 1 },
      { userId: "2", nickname: "Otieno",  avatar: "🤠", color: "#4ECDC4", score: 0, rank: 2 },
    ],
    createdBy: "1",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [filter,   setFilter]   = useState<FilterTab>("all");
  const [search,   setSearch]   = useState("");
  const [sortBy,   setSortBy]   = useState<SortKey>("date");
  const [selected, setSelected] = useState<Session | null>(null);

  // TODO: replace MOCK_SESSIONS with: const sessions = useQuery(api.sessions.list) ?? []
  const sessions: Session[] = MOCK_SESSIONS;
  const loading = false; // set to: sessions === undefined

  // Aggregate stats
  const totalSessions  = sessions.filter((s) => s.status === "completed").length;
  const totalPlays     = sessions.filter((s) => s.status === "completed")
    .reduce((acc, s) => acc + s.players.length, 0);
  const uniquePlayers  = new Set(
    sessions.flatMap((s) => s.players.map((p) => p.userId))
  ).size;
  const upcomingCount  = sessions.filter((s) => s.status === "upcoming").length;

  const filtered = useMemo(() => {
    let result = [...sessions];

    if (filter === "upcoming")  result = result.filter((s) => s.status === "upcoming");
    if (filter === "completed") result = result.filter((s) => s.status === "completed");

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.games.some((g) => g.name.toLowerCase().includes(q)) ||
        s.players.some((p) => p.nickname.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === "players") return b.players.length - a.players.length;
      if (sortBy === "game")    return (a.games[0]?.name ?? "").localeCompare(b.games[0]?.name ?? "");
      // default: date descending (most recent first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [sessions, filter, search, sortBy]);

  const tabCounts = {
    all:       sessions.length,
    upcoming:  sessions.filter((s) => s.status === "upcoming").length,
    completed: sessions.filter((s) => s.status === "completed").length,
  };

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="sp-root">
        <Navbar />

        {/* ── HEADER ── */}
        <div className="sp-header">
          <div className="sp-header-pattern" />
          <div className="sp-header-glow" style={{ background: "#4ECDC4", top: "-80px", right: "-80px" }} />
          <div className="sp-header-glow" style={{ background: "#FF6B6B", bottom: "-80px", left: "-60px" }} />
          <div className="sp-header-inner">
            <div>
              <div className="sp-header-tag">📅 Session History</div>
              <h1>Every night,<br /><span>remembered.</span></h1>
              <p className="sp-header-sub">
                Every session, every score, every comeback. Your crew's game night archive.
              </p>
              <div className="sp-header-stats" style={{ marginTop: 24 }}>
                <div className="sp-header-stat">
                  <div className="sp-stat-num">{totalSessions}</div>
                  <div className="sp-stat-label">Sessions</div>
                </div>
                <div className="sp-header-stat">
                  <div className="sp-stat-num">{uniquePlayers}</div>
                  <div className="sp-stat-label">Players</div>
                </div>
                <div className="sp-header-stat">
                  <div className="sp-stat-num">{totalPlays}</div>
                  <div className="sp-stat-label">Total Plays</div>
                </div>
                <div className="sp-header-stat">
                  <div className="sp-stat-num">{upcomingCount}</div>
                  <div className="sp-stat-label">Upcoming</div>
                </div>
              </div>
            </div>

            {/* ── NEW SESSION CTA ── */}
            <Link href="/sessions/new" className="sp-new-btn">
              ＋ New Session
            </Link>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="sp-body">

          {/* Toolbar */}
          <div className="sp-toolbar">
            <div className="sp-search-wrap">
              <span className="sp-search-icon">🔍</span>
              <input
                className="sp-search"
                placeholder="Search sessions, games, players…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sp-sort-wrap">
              <select className="sp-sort-select" value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}>
                <option value="date">Most Recent</option>
                <option value="players">Most Players</option>
                <option value="game">Game A→Z</option>
              </select>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="sp-tabs">
            {(["all", "upcoming", "completed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                className={`sp-tab${filter === tab ? " active" : ""}`}
                onClick={() => setFilter(tab)}
              >
                {tab === "all" ? "All Sessions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="sp-tab-count">{tabCounts[tab]}</span>
              </button>
            ))}
          </div>

          {/* Results bar */}
          <div className="sp-results-bar">
            <div className="sp-results-count">
              Showing <span>{filtered.length}</span> session{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="sp-grid">
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="sp-empty">
              <div className="sp-empty-icon">📅</div>
              <div className="sp-empty-title">No sessions found</div>
              <div className="sp-empty-sub">Try adjusting your filters or search.</div>
              <Link href="/sessions/new" className="sp-new-btn" style={{ marginTop: 0 }}>
                ＋ Start your first session
              </Link>
            </div>
          ) : (
            <div className="sp-grid">
              {filtered.map((s, i) => (
                <SessionCard
                  key={s._id} session={s}
                  onClick={() => setSelected(s)}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── DETAIL DRAWER ── */}
        {selected && (
          <SessionDrawer session={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}