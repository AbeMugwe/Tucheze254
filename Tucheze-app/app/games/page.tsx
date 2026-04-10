"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Game {
  _id: string;
  name: string;
  emoji: string;
  category: string;
  players: string;
  duration: string;
  difficulty: 1 | 2 | 3;
  tags: string[];
  rating: number;
  timesPlayed: number;
  ownedByUserIds: string[];
  color: string;
  description: string;
  lastPlayed?: string;
  trending?: boolean;
  gameType?: "individual" | "team" | "both";
}

interface UserProfile {
  _id: string;
  nickname?: string;
  avatar?: string;
  color?: string;
}

type SortKey = "name" | "rating" | "timesPlayed" | "difficulty";
type ViewMode = "grid" | "list";

const CATEGORIES = ["All", "Strategy", "Social", "Card", "Word", "Dexterity", "Cooperative", "Abstract", "Creative"];
const TAGS       = ["Quick", "Party", "Bluffing", "Teams", "Classic", "Family", "Coop", "Intense", "1v1", "Trading", "Creative"];
const DIFFICULTY = ["Any", "Easy", "Medium", "Hard"];

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --yellow: #FFE135; --coral: #FF6B6B; --mint: #4ECDC4;
    --navy: #1a1a2e;   --lime: #C8F135;  --pink: #FF9ECD;
    --sky: #A8DAFF;    --white: #FFFDF5;
    --border: 2.5px solid #1a1a2e;
    --shadow: 4px 4px 0 #1a1a2e;
    --shadow-lg: 6px 6px 0 #1a1a2e;
  }

  .gl-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh;
    color: var(--navy);
  }

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

  /* ── HEADER ── */
  .gl-header {
    background: var(--navy); padding: 48px 40px 56px;
    position: relative; overflow: hidden;
    border-bottom: 3px solid var(--navy);
  }
  .gl-header-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px; pointer-events: none;
  }
  .gl-header-glow {
    position: absolute; width: 350px; height: 350px;
    border-radius: 50%; filter: blur(70px); opacity: 0.12; pointer-events: none;
  }
  .gl-header-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; }
  .gl-header-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,225,53,0.12); border: 2px solid rgba(255,225,53,0.3);
    color: var(--yellow); border-radius: 50px; padding: 4px 14px;
    font-size: 0.7rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 16px;
  }
  .gl-header h1 {
    font-family: 'Fredoka One', cursive; font-size: 3rem;
    color: white; line-height: 1.05; margin-bottom: 10px;
  }
  .gl-header h1 span { color: var(--coral); }
  .gl-header-sub {
    font-size: 0.95rem; font-weight: 700;
    color: rgba(255,255,255,0.4); max-width: 500px;
  }
  .gl-header-stats {
    display: flex; gap: 24px; margin-top: 28px; flex-wrap: wrap;
  }
  .gl-header-stat {
    background: rgba(255,255,255,0.06);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 14px; padding: 12px 20px;
    display: flex; align-items: center; gap: 10px;
  }
  .gl-header-stat-num {
    font-family: 'Fredoka One', cursive; font-size: 1.4rem; color: var(--yellow);
  }
  .gl-header-stat-label {
    font-size: 0.7rem; font-weight: 800;
    color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px;
  }
  .gl-add-btn {
    position: absolute; right: 40px; bottom: 60px; z-index: 2;
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    background: var(--coral); color: white;
    border: var(--border); border-radius: 50px;
    padding: 12px 28px; cursor: pointer;
    box-shadow: var(--shadow-lg);
    transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; gap: 8px;
  }
  .gl-add-btn:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 var(--navy); }

  /* ── BODY ── */
  .gl-body { max-width: 1200px; margin: 0 auto; padding: 48px 40px 80px; }

  /* ── TOOLBAR ── */
  .gl-toolbar {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; flex-wrap: wrap;
  }
  .gl-search-wrap { flex: 1; min-width: 220px; position: relative; }
  .gl-search-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 1rem; pointer-events: none;
  }
  .gl-search {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem;
    padding: 11px 14px 11px 40px;
    border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); transition: box-shadow .15s;
  }
  .gl-search:focus { box-shadow: 6px 6px 0 var(--navy); }
  .gl-sort-select {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 11px 14px; border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); cursor: pointer; appearance: none;
    padding-right: 32px;
  }
  .gl-sort-wrap { position: relative; }
  .gl-sort-wrap::after {
    content: "▾"; position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%); pointer-events: none; font-size: 0.8rem;
  }
  .gl-view-toggle {
    display: flex; border: var(--border); border-radius: 12px;
    overflow: hidden; box-shadow: var(--shadow);
  }
  .gl-view-btn {
    padding: 10px 14px; background: white; border: none;
    cursor: pointer; font-size: 1rem; transition: background .15s;
  }
  .gl-view-btn.active { background: var(--navy); color: white; }

  /* ── FILTERS ── */
  .gl-filters { display: flex; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; align-items: center; }
  .gl-filter-label {
    font-size: 0.72rem; font-weight: 800; opacity: 0.4;
    text-transform: uppercase; letter-spacing: 1px; margin-right: 4px;
  }
  .gl-chip {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.78rem;
    padding: 6px 14px; border: 2px solid var(--navy); border-radius: 50px;
    cursor: pointer; background: white; color: var(--navy);
    box-shadow: 2px 2px 0 var(--navy); transition: all .12s; white-space: nowrap;
  }
  .gl-chip:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 var(--navy); }
  .gl-chip.active { background: var(--navy); color: white; box-shadow: 2px 2px 0 rgba(0,0,0,0.3); }
  .gl-chip.coral.active  { background: var(--coral); border-color: var(--coral); }
  .gl-chip.yellow.active { background: var(--yellow); border-color: var(--yellow); color: var(--navy); }
  .gl-chip.mint.active   { background: var(--mint);   border-color: var(--mint);   color: var(--navy); }

  /* ── RESULTS BAR ── */
  .gl-results-bar {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 20px; flex-wrap: wrap; gap: 8px;
  }
  .gl-results-count { font-size: 0.82rem; font-weight: 800; opacity: 0.45; }
  .gl-results-count span { color: var(--coral); opacity: 1; }
  .gl-clear-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.78rem;
    padding: 5px 12px; border: 2px solid var(--coral); border-radius: 50px;
    background: white; color: var(--coral); cursor: pointer;
    box-shadow: 2px 2px 0 var(--coral); transition: all .12s;
  }
  .gl-clear-btn:hover { background: var(--coral); color: white; }

  /* ── GRID VIEW ── */
  .gl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  .gl-card {
    background: white; border: var(--border); border-radius: 20px;
    box-shadow: var(--shadow-lg); overflow: hidden;
    cursor: pointer; transition: transform .15s, box-shadow .15s;
    display: flex; flex-direction: column;
    animation: cardPop .3s cubic-bezier(.34,1.56,.64,1) both;
  }
  .gl-card:hover { transform: translate(-3px,-3px); box-shadow: 9px 9px 0 var(--navy); }
  @keyframes cardPop {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .gl-card-banner {
    height: 80px; display: flex; align-items: center; justify-content: center;
    font-size: 2.8rem; position: relative; border-bottom: var(--border);
  }
  .gl-card-trending {
    position: absolute; top: 8px; right: 8px;
    background: var(--coral); color: white;
    border: 2px solid var(--navy); border-radius: 50px;
    font-size: 0.62rem; font-weight: 800; padding: 2px 8px;
    letter-spacing: 0.5px; text-transform: uppercase;
  }
  .gl-card-body { padding: 16px; flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .gl-card-name { font-family: 'Fredoka One', cursive; font-size: 1.2rem; line-height: 1.1; }
  .gl-card-desc { font-size: 0.78rem; font-weight: 600; opacity: 0.5; line-height: 1.5; flex: 1; }
  .gl-card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
  .gl-card-meta-pill {
    font-size: 0.68rem; font-weight: 800;
    background: var(--white); border: 2px solid rgba(26,26,46,0.12);
    border-radius: 50px; padding: 2px 8px; color: var(--navy);
  }
  .gl-card-footer {
    padding: 10px 16px; border-top: 2px solid rgba(26,26,46,0.07);
    display: flex; align-items: center; justify-content: space-between;
  }
  .gl-card-rating { display: flex; align-items: center; gap: 4px; }
  .gl-card-rating-num { font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--coral); }
  .gl-card-plays { font-size: 0.72rem; font-weight: 800; opacity: 0.35; }
  .gl-difficulty { display: flex; gap: 3px; }
  .gl-diff-dot { width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid var(--navy); }
  .gl-diff-dot.filled { background: var(--navy); }
  .gl-card-owners { display: flex; align-items: center; }
  .gl-owner-avatar {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--mint); border: 2px solid white;
    font-size: 0.6rem; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    margin-left: -4px; color: var(--navy);
  }
  .gl-owner-avatar:first-child { margin-left: 0; }

  /* ── LIST VIEW ── */
  .gl-list { display: flex; flex-direction: column; gap: 10px; }
  .gl-list-row {
    background: white; border: var(--border); border-radius: 16px;
    box-shadow: var(--shadow); padding: 14px 18px;
    display: flex; align-items: center; gap: 16px;
    cursor: pointer; transition: transform .15s, box-shadow .15s;
    animation: cardPop .25s ease both;
  }
  .gl-list-row:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--navy); }
  .gl-list-emoji {
    width: 48px; height: 48px; border-radius: 14px;
    border: var(--border); display: flex; align-items: center;
    justify-content: center; font-size: 1.6rem; flex-shrink: 0;
  }
  .gl-list-name { font-family: 'Fredoka One', cursive; font-size: 1.05rem; min-width: 130px; }
  .gl-list-desc {
    font-size: 0.78rem; font-weight: 600; opacity: 0.4;
    flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gl-list-meta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .gl-list-stat { text-align: center; }
  .gl-list-stat-val { font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--coral); }
  .gl-list-stat-lbl { font-size: 0.62rem; font-weight: 800; opacity: 0.35; text-transform: uppercase; }

  /* ── DETAIL DRAWER ── */
  .gl-overlay {
    position: fixed; inset: 0; background: rgba(26,26,46,0.6);
    z-index: 200; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .gl-drawer {
    background: var(--white); width: 100%; max-width: 640px;
    max-height: 90vh; border-radius: 24px 24px 0 0;
    border: 3px solid var(--navy); border-bottom: none;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.2);
    overflow-y: auto;
    animation: slideUp .3s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .gl-drawer-handle {
    width: 40px; height: 4px; border-radius: 2px;
    background: rgba(26,26,46,0.2); margin: 14px auto 0;
  }
  .gl-drawer-banner {
    height: 120px; display: flex; align-items: center; justify-content: center;
    font-size: 4rem; border-bottom: 3px solid var(--navy); position: relative;
  }
  .gl-drawer-close {
    position: absolute; top: 14px; right: 14px;
    width: 32px; height: 32px; border-radius: 50%;
    background: white; border: 2px solid var(--navy);
    cursor: pointer; font-size: 0.9rem;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 2px 2px 0 var(--navy); transition: all .12s;
  }
  .gl-drawer-close:hover { background: var(--coral); color: white; }
  .gl-drawer-body { padding: 24px; }
  .gl-drawer-title { font-family: 'Fredoka One', cursive; font-size: 2rem; margin-bottom: 4px; }
  .gl-drawer-cat {
    font-size: 0.75rem; font-weight: 800; opacity: 0.4;
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;
  }
  .gl-drawer-desc { font-size: 0.9rem; font-weight: 700; opacity: 0.6; line-height: 1.6; margin-bottom: 20px; }
  .gl-drawer-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 10px; margin-bottom: 20px;
  }
  .gl-drawer-stat {
    background: white; border: var(--border); border-radius: 14px;
    padding: 12px; text-align: center; box-shadow: var(--shadow);
  }
  .gl-drawer-stat-val { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: var(--coral); }
  .gl-drawer-stat-lbl {
    font-size: 0.62rem; font-weight: 800; opacity: 0.4;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .gl-drawer-section-title {
    font-size: 0.72rem; font-weight: 800; opacity: 0.4;
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;
  }
  .gl-drawer-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .gl-drawer-tag {
    font-size: 0.75rem; font-weight: 800;
    background: white; border: 2px solid var(--navy);
    border-radius: 50px; padding: 4px 12px; box-shadow: 2px 2px 0 var(--navy);
  }
  .gl-drawer-owners { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .gl-drawer-owner {
    display: flex; align-items: center; gap: 6px;
    background: white; border: var(--border); border-radius: 50px;
    padding: 5px 12px; font-size: 0.78rem; font-weight: 800; box-shadow: var(--shadow);
  }
  .gl-drawer-actions { display: flex; gap: 10px; }
  .gl-drawer-btn {
    flex: 1; font-family: 'Fredoka One', cursive; font-size: 0.95rem;
    padding: 13px; border: var(--border); border-radius: 14px;
    cursor: pointer; box-shadow: var(--shadow);
    transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .gl-drawer-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--navy); }
  .gl-drawer-btn.primary { background: var(--coral); color: white; }
  .gl-drawer-btn.secondary { background: white; color: var(--navy); }

  /* ── EMPTY STATE ── */
  .gl-empty { text-align: center; padding: 80px 40px; }
  .gl-empty-icon { font-size: 4rem; margin-bottom: 16px; }
  .gl-empty-title { font-family: 'Fredoka One', cursive; font-size: 1.6rem; margin-bottom: 8px; }
  .gl-empty-sub { font-size: 0.88rem; font-weight: 700; opacity: 0.4; }

  /* ── TRENDING STRIP ── */
  .gl-trending { margin-bottom: 36px; }
  .gl-trending-title {
    font-family: 'Fredoka One', cursive; font-size: 1.3rem;
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .gl-trending-strip {
    display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none;
  }
  .gl-trending-strip::-webkit-scrollbar { display: none; }
  .gl-trending-card {
    flex-shrink: 0; width: 140px;
    background: white; border: var(--border); border-radius: 16px;
    box-shadow: var(--shadow); padding: 14px;
    cursor: pointer; transition: transform .15s, box-shadow .15s;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .gl-trending-card:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--navy); }
  .gl-trending-emoji { font-size: 2.2rem; }
  .gl-trending-name { font-family: 'Fredoka One', cursive; font-size: 0.9rem; text-align: center; line-height: 1.2; }
  .gl-trending-plays { font-size: 0.68rem; font-weight: 800; opacity: 0.35; }

  /* ── MODAL FORM FIELDS ── */
  .gl-form-field { display: flex; flex-direction: column; gap: 6px; }
  .gl-form-input {
    font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.9rem;
    padding: 11px 14px; border: var(--border); border-radius: 12px;
    background: white; color: var(--navy); outline: none;
    box-shadow: var(--shadow); transition: box-shadow .15s; width: 100%;
  }
  .gl-form-input:focus { box-shadow: 6px 6px 0 var(--navy); }

  @media (max-width: 768px) {
    .gl-header { padding: 32px 20px 48px; }
    .gl-header h1 { font-size: 2.2rem; }
    .gl-body { padding: 32px 20px 60px; }
    .gl-nav { padding: 0 20px; }
    .gl-add-btn { right: 20px; }
    .gl-drawer-stats { grid-template-columns: repeat(2, 1fr); }
    .gl-list-desc { display: none; }
  }
`;

// ─── Trending ─────────────────────────────────────────────────────────────────
// Only games played MORE than 5 times are eligible for the Trending strip.
// Among those, show the top 4 by play count.

function computeTrending(games: Game[]): Set<string> {
  const eligible = games.filter((g) => g.timesPlayed > 5);
  const sorted   = [...eligible].sort((a, b) => b.timesPlayed - a.timesPlayed);
  return new Set(sorted.slice(0, 4).map((g) => g._id));
}

// ─── Helper Components ────────────────────────────────────────────────────────

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="gl-difficulty">
      {[1, 2, 3].map((d) => (
        <div key={d} className={`gl-diff-dot${d <= level ? " filled" : ""}`} />
      ))}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="gl-card-rating">
      <span style={{ fontSize: "0.8rem" }}>⭐</span>
      <span className="gl-card-rating-num">{rating.toFixed(1)}</span>
    </div>
  );
}

function OwnerAvatars({ ownerIds, userMap }: { ownerIds: string[]; userMap: Map<string, UserProfile> }) {
  const shown = ownerIds.slice(0, 3);
  const extra = ownerIds.length - 3;
  return (
    <div className="gl-card-owners">
      {shown.map((id) => {
        const u = userMap.get(id);
        const label = u?.nickname ? u.nickname[0].toUpperCase() : "?";
        const title = u?.nickname ?? id;
        return (
          <div key={id} className="gl-owner-avatar"
            style={{ background: u?.color ?? "var(--mint)" }}
            title={title}>
            {label}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="gl-owner-avatar" style={{ background: "#FFE135" }}>+{extra}</div>
      )}
    </div>
  );
}

// ─── Game Card (Grid) ─────────────────────────────────────────────────────────

function GameCard({ game, trending, userMap, onClick, style }: {
  game: Game; trending: boolean; userMap: Map<string, UserProfile>;
  onClick: () => void; style?: React.CSSProperties;
}) {
  return (
    <div className="gl-card" onClick={onClick} style={style}>
      <div className="gl-card-banner" style={{ background: game.color + "22" }}>
        <span style={{ fontSize: "2.8rem" }}>{game.emoji}</span>
        {trending && <div className="gl-card-trending">🔥 Hot</div>}
      </div>
      <div className="gl-card-body">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div className="gl-card-name">{game.name}</div>
          <DifficultyDots level={game.difficulty} />
        </div>
        <div className="gl-card-desc">{game.description}</div>
        <div className="gl-card-meta">
          <span className="gl-card-meta-pill">👥 {game.players}</span>
          <span className="gl-card-meta-pill">⏱ {game.duration}</span>
          <span className="gl-card-meta-pill">{game.category}</span>
        </div>
      </div>
      <div className="gl-card-footer">
        <StarRating rating={game.rating} />
        <span className="gl-card-plays">{game.timesPlayed}× played</span>
        <OwnerAvatars ownerIds={game.ownedByUserIds} userMap={userMap} />
      </div>
    </div>
  );
}

// ─── Game Row (List) ──────────────────────────────────────────────────────────

function GameRow({ game, trending, onClick, style }: {
  game: Game; trending: boolean; onClick: () => void; style?: React.CSSProperties;
}) {
  return (
    <div className="gl-list-row" onClick={onClick} style={style}>
      <div className="gl-list-emoji" style={{ background: game.color + "22" }}>{game.emoji}</div>
      <div className="gl-list-name">{game.name}</div>
      <div className="gl-list-desc">{game.description}</div>
      <div className="gl-list-meta">
        <div className="gl-list-stat">
          <div className="gl-list-stat-val">{game.rating.toFixed(1)}</div>
          <div className="gl-list-stat-lbl">Rating</div>
        </div>
        <div className="gl-list-stat">
          <div className="gl-list-stat-val">{game.timesPlayed}</div>
          <div className="gl-list-stat-lbl">Played</div>
        </div>
        <div className="gl-list-stat">
          <div className="gl-list-stat-val">{game.players}</div>
          <div className="gl-list-stat-lbl">Players</div>
        </div>
        <DifficultyDots level={game.difficulty} />
        {trending && <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--coral)" }}>🔥</span>}
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function GameDrawer({ game, trending, userMap, onClose, onEdit, isAdmin }: {
  game: Game; trending: boolean; userMap: Map<string, UserProfile>;
  onClose: () => void; onEdit: () => void; isAdmin?: boolean;
}) {
  return (
    <div className="gl-overlay" onClick={onClose}>
      <div className="gl-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="gl-drawer-handle" />
        <div className="gl-drawer-banner" style={{ background: game.color + "33" }}>
          <span>{game.emoji}</span>
          <button className="gl-drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="gl-drawer-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <div className="gl-drawer-title" style={{ marginBottom: 0 }}>{game.name}</div>
            {trending && (
              <span style={{ background: "var(--coral)", color: "white", border: "2px solid var(--navy)", borderRadius: 50, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 800 }}>
                🔥 Trending
              </span>
            )}
          </div>
          <div className="gl-drawer-cat">{game.category} · {game.players} players · {game.duration}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {game.gameType && (
              <span style={{
                background: game.gameType === "team" ? "#4ECDC4" : game.gameType === "individual" ? "#FFE135" : "#C8F135",
                border: "2px solid var(--navy)", borderRadius: 50, padding: "3px 12px",
                fontSize: "0.72rem", fontWeight: 800, boxShadow: "2px 2px 0 var(--navy)",
              }}>
                {game.gameType === "team" ? "🫂 Team Game" : game.gameType === "individual" ? "🧍 Individual Game" : "🔀 Individual or Teams"}
              </span>
            )}
          </div>
          <div className="gl-drawer-desc">{game.description}</div>

          <div className="gl-drawer-stats">
            <div className="gl-drawer-stat">
              <div className="gl-drawer-stat-val">⭐ {game.rating}</div>
              <div className="gl-drawer-stat-lbl">Rating</div>
            </div>
            <div className="gl-drawer-stat">
              <div className="gl-drawer-stat-val">{game.timesPlayed}×</div>
              <div className="gl-drawer-stat-lbl">Played</div>
            </div>
            <div className="gl-drawer-stat">
              <div className="gl-drawer-stat-val">{game.duration.split(" ")[0]}</div>
              <div className="gl-drawer-stat-lbl">Minutes</div>
            </div>
            <div className="gl-drawer-stat">
              <div className="gl-drawer-stat-val" style={{ display: "flex", justifyContent: "center" }}>
                <DifficultyDots level={game.difficulty} />
              </div>
              <div className="gl-drawer-stat-lbl">Difficulty</div>
            </div>
          </div>

          <div className="gl-drawer-section-title">Tags</div>
          <div className="gl-drawer-tags">
            {game.tags.map((t) => <span key={t} className="gl-drawer-tag">{t}</span>)}
          </div>

          <div className="gl-drawer-section-title">Owned By</div>
          <div className="gl-drawer-owners">
            {game.ownedByUserIds.map((id) => {
              const u = userMap.get(id);
              return (
                <div key={id} className="gl-drawer-owner">
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: u?.color ?? "var(--mint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900 }}>
                    {u?.avatar ?? (u?.nickname?.[0] ?? "?")}
                  </div>
                  {u?.nickname ?? "Unknown"}
                </div>
              );
            })}
          </div>

          {game.lastPlayed && (
            <div style={{ fontSize: "0.78rem", fontWeight: 800, opacity: 0.35, marginBottom: 20 }}>
              🕐 Last played {game.lastPlayed}
            </div>
          )}

          <div className="gl-drawer-actions">
            {isAdmin && (
              <Link
                href={`/sessions/new?gameId=${game._id}`}
                className="gl-drawer-btn primary"
                onClick={(e) => e.stopPropagation()}
                style={{ textDecoration: "none" }}
              >
                🎲 Play
              </Link>
            )}
            {isAdmin && (
              <button className="gl-drawer-btn secondary" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                ✏️ Edit Game
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Game Form ─────────────────────────────────────────────────────────

interface GameFormValues {
  name: string;
  emoji: string;
  category: string;
  players: string;
  duration: string;
  difficulty: 1 | 2 | 3;
  tagsText: string;
  rating: number;
  color: string;
  description: string;
  lastPlayed: string;
  gameType: "individual" | "team" | "both";
}

const DEFAULT_FORM: GameFormValues = {
  name: "", emoji: "🎲", category: "Strategy", players: "2–4",
  duration: "30 min", difficulty: 1, tagsText: "", rating: 4,
  color: "#FFE135", description: "", lastPlayed: "", gameType: "both",
};

function GameFormFields({ form, update }: {
  form: GameFormValues;
  update: <K extends keyof GameFormValues>(k: K, v: GameFormValues[K]) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Game Name</div>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)}
            placeholder="Catan" className="gl-form-input" />
        </div>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Emoji</div>
          <input value={form.emoji} onChange={(e) => update("emoji", e.target.value)}
            className="gl-form-input" style={{ textAlign: "center", fontSize: "1.2rem" }} maxLength={4} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Category</div>
          <select value={form.category} onChange={(e) => update("category", e.target.value)}
            className="gl-form-input" style={{ cursor: "pointer" }}>
            {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Players</div>
          <input value={form.players} onChange={(e) => update("players", e.target.value)}
            placeholder="2–6" className="gl-form-input" />
        </div>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Duration</div>
          <input value={form.duration} onChange={(e) => update("duration", e.target.value)}
            placeholder="45 min" className="gl-form-input" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Difficulty</div>
          <select value={form.difficulty}
            onChange={(e) => update("difficulty", Number(e.target.value) as 1 | 2 | 3)}
            className="gl-form-input" style={{ cursor: "pointer" }}>
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
          </select>
        </div>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Rating (0–5)</div>
          <input type="number" min={0} max={5} step={0.1} value={form.rating}
            onChange={(e) => update("rating", Number(e.target.value))} className="gl-form-input" />
        </div>
      </div>

      <div className="gl-form-field">
        <div className="gl-drawer-section-title">Description</div>
        <textarea required value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Describe the game..." className="gl-form-input"
          style={{ minHeight: 80, resize: "vertical" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Tags (comma-separated)</div>
          <input value={form.tagsText} onChange={(e) => update("tagsText", e.target.value)}
            placeholder="Quick, Party, Classic" className="gl-form-input" />
        </div>
        <div className="gl-form-field">
          <div className="gl-drawer-section-title">Last Played</div>
          <input value={form.lastPlayed} onChange={(e) => update("lastPlayed", e.target.value)}
            placeholder="Yesterday" className="gl-form-input" />
        </div>
      </div>

      <div className="gl-form-field">
        <div className="gl-drawer-section-title">Card Colour</div>
        <input type="color" value={form.color} onChange={(e) => update("color", e.target.value)}
          style={{ width: "100%", height: 44, border: "var(--border)", borderRadius: 12,
            background: "white", boxShadow: "var(--shadow)", cursor: "pointer" }} />
      </div>

      <div className="gl-form-field">
        <div className="gl-drawer-section-title">Game Type</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {(["individual", "team", "both"] as const).map((type) => {
            const labels = { individual: "🧍 Individual", team: "🫂 Team", both: "🔀 Both" };
            const descs  = { individual: "Solo scoring", team: "Team scoring", both: "Works either way" };
            const active = form.gameType === type;
            return (
              <div key={type} onClick={() => update("gameType", type)}
                style={{
                  border: `2.5px solid ${active ? "var(--mint)" : "var(--navy)"}`,
                  borderRadius: 12, padding: "10px 8px", textAlign: "center", cursor: "pointer",
                  background: active ? "rgba(78,205,196,0.1)" : "white",
                  boxShadow: active ? "3px 3px 0 var(--mint)" : "2px 2px 0 var(--navy)",
                  transition: "all .12s",
                }}>
                <div style={{ fontWeight: 800, fontSize: "0.8rem" }}>{labels[type]}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, opacity: 0.5, marginTop: 2 }}>{descs[type]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Add Game Modal ───────────────────────────────────────────────────────────

function AddGameModal({ open, onClose, onSubmit }: {
  open: boolean; onClose: () => void;
  onSubmit: (v: Omit<GameFormValues, "tagsText"> & { tags: string[] }) => Promise<void>;
}) {
  const [form, setForm] = useState<GameFormValues>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof GameFormValues>(k: K, v: GameFormValues[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      setSubmitting(true);
      await onSubmit({ ...form, tags });
      setForm(DEFAULT_FORM);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gl-overlay" onClick={onClose}>
      <div className="gl-drawer" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, borderRadius: 24, borderBottom: "3px solid var(--navy)", maxHeight: "92vh" }}>
        <div className="gl-drawer-handle" />
        <div className="gl-drawer-banner"
          style={{ background: form.color + "33", height: 100, flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: "2.2rem" }}>{form.emoji || "🎲"}</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.1rem" }}>Add New Game</div>
          <button className="gl-drawer-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="gl-drawer-body">
          <form onSubmit={handleSubmit}>
            <GameFormFields form={form} update={update} />
            <div className="gl-drawer-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="gl-drawer-btn primary" disabled={submitting}>
                {submitting ? "Saving…" : "🎲 Add Game"}
              </button>
              <button type="button" className="gl-drawer-btn secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Game Modal ──────────────────────────────────────────────────────────

function EditGameModal({ game, onClose, onSave }: {
  game: Game; onClose: () => void;
  onSave: (id: string, v: Omit<GameFormValues, "tagsText"> & { tags: string[] }) => Promise<void>;
}) {
  const [form, setForm] = useState<GameFormValues>({
    name:        game.name,
    emoji:       game.emoji,
    category:    game.category,
    players:     game.players,
    duration:    game.duration,
    difficulty:  game.difficulty,
    tagsText:    game.tags.join(", "),
    rating:      game.rating,
    color:       game.color,
    description: game.description,
    lastPlayed:  game.lastPlayed ?? "",
    gameType:    game.gameType ?? "both",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof GameFormValues>(k: K, v: GameFormValues[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = form.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      setSubmitting(true);
      await onSave(game._id, { ...form, tags });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gl-overlay" onClick={onClose}>
      <div className="gl-drawer" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, borderRadius: 24, borderBottom: "3px solid var(--navy)", maxHeight: "92vh" }}>
        <div className="gl-drawer-handle" />
        <div className="gl-drawer-banner"
          style={{ background: form.color + "33", height: 100, flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: "2.2rem" }}>{form.emoji || "🎲"}</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.1rem" }}>Edit {game.name}</div>
          <button className="gl-drawer-close" onClick={onClose} type="button">✕</button>
        </div>
        <div className="gl-drawer-body">
          <form onSubmit={handleSubmit}>
            <GameFormFields form={form} update={update} />
            <div className="gl-drawer-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="gl-drawer-btn primary" disabled={submitting}>
                {submitting ? "Saving…" : "💾 Save Changes"}
              </button>
              <button type="button" className="gl-drawer-btn secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GamesPage() {
  const currentUser = useQuery(api.users.currentUser) as { _id: string; nickname?: string; avatar?: string; color?: string } | null | undefined;
  const games       = useQuery(api.games.list);
  const allUsers    = useQuery(api.users.leaderboard, currentUser ? {} : "skip") as UserProfile[] | undefined;
  const isAdmin     = useQuery(api.users.isAdmin, currentUser ? {} : "skip") as boolean | undefined;
  const addGame     = useMutation(api.games.add);
  const updateGame  = useMutation(api.games.update);

  const [search,      setSearch]      = useState("");
  const [category,    setCategory]    = useState("All");
  const [difficulty,  setDifficulty]  = useState("Any");
  const [activeTags,  setActiveTags]  = useState<string[]>([]);
  const [sortBy,      setSortBy]      = useState<SortKey>("timesPlayed");
  const [viewMode,    setViewMode]    = useState<ViewMode>("grid");
  const [selected,    setSelected]    = useState<Game | null>(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    (allUsers ?? []).forEach((u) => map.set(u._id, u));
    if (currentUser) map.set(currentUser._id, currentUser);
    return map;
  }, [allUsers, currentUser]);

  // Only games with >5 plays are eligible; show top 4 among those
  const trendingIds   = useMemo(() => computeTrending(games ?? []), [games]);
  const trendingGames = useMemo(() => (games ?? []).filter((g) => trendingIds.has(g._id)), [games, trendingIds]);

  const toggleTag   = (tag: string) =>
    setActiveTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const clearFilters = () => { setSearch(""); setCategory("All"); setDifficulty("Any"); setActiveTags([]); };
  const hasFilters   = search || category !== "All" || difficulty !== "Any" || activeTags.length > 0;

  const filtered = useMemo(() => {
    let result = [...(games ?? [])];
    if (search)
      result = result.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.description.toLowerCase().includes(search.toLowerCase()) ||
        g.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      );
    if (category !== "All") result = result.filter((g) => g.category === category);
    if (difficulty !== "Any") {
      const map: Record<string, 1 | 2 | 3> = { Easy: 1, Medium: 2, Hard: 3 };
      result = result.filter((g) => g.difficulty === map[difficulty]);
    }
    if (activeTags.length > 0)
      result = result.filter((g) => activeTags.every((t) => g.tags.includes(t)));
    result.sort((a, b) => {
      if (sortBy === "name")       return a.name.localeCompare(b.name);
      if (sortBy === "rating")     return b.rating - a.rating;
      if (sortBy === "difficulty") return a.difficulty - b.difficulty;
      return b.timesPlayed - a.timesPlayed;
    });
    return result;
  }, [games, search, category, difficulty, activeTags, sortBy]);

  const handleAddGame = async (values: Omit<GameFormValues, "tagsText"> & { tags: string[] }) => {
    await addGame({
      name: values.name, emoji: values.emoji, category: values.category,
      players: values.players, duration: values.duration, difficulty: values.difficulty,
      tags: values.tags, rating: values.rating, color: values.color, description: values.description,
      lastPlayed: values.lastPlayed || undefined,
      gameType: values.gameType,
    });
  };

  const handleEditGame = async (_id: string, values: Omit<GameFormValues, "tagsText"> & { tags: string[] }) => {
    await updateGame({
      id: _id as any,
      name: values.name, emoji: values.emoji, category: values.category,
      players: values.players, duration: values.duration, difficulty: values.difficulty,
      tags: values.tags, rating: values.rating,
      color: values.color, description: values.description,
      lastPlayed: values.lastPlayed || undefined,
      gameType: values.gameType,
    });
  };

  const avgRating = (games ?? []).length > 0
    ? ((games ?? []).reduce((s, g) => s + g.rating, 0) / (games ?? []).length).toFixed(1)
    : "—";

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="gl-root">

        <Navbar />

        {/* ── HEADER ── */}
        <div className="gl-header">
          <div className="gl-header-pattern" />
          <div className="gl-header-glow" style={{ background: "#FF6B6B", top: "-80px", right: "-80px" }} />
          <div className="gl-header-glow" style={{ background: "#4ECDC4", bottom: "-80px", left: "-60px" }} />
          <div className="gl-header-inner">
            <div className="gl-header-tag">🎲 Game Library</div>
            <h1>Your crew&apos;s<br /><span>game shelf.</span></h1>
            <p className="gl-header-sub">
              Every game you own, every session you&apos;ve played, every stat worth bragging about.
            </p>
            <div className="gl-header-stats">
              <div className="gl-header-stat">
                <div className="gl-header-stat-num">{(games ?? []).length}</div>
                <div className="gl-header-stat-label">Games</div>
              </div>
              <div className="gl-header-stat">
                <div className="gl-header-stat-num">
                  {(games ?? []).reduce((s, g) => s + g.timesPlayed, 0)}
                </div>
                <div className="gl-header-stat-label">Total Plays</div>
              </div>
              <div className="gl-header-stat">
                <div className="gl-header-stat-num">{avgRating}</div>
                <div className="gl-header-stat-label">Avg Rating</div>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button className="gl-add-btn" onClick={() => setShowAdd(true)}>＋ Add Game</button>
          )}
        </div>

        {/* ── BODY ── */}
        <div className="gl-body">

          {/* Trending strip — only shown when no filters active and ≥1 game has >5 plays */}
          {!hasFilters && trendingGames.length > 0 && (
            <div className="gl-trending">
              <div className="gl-trending-title">🔥 Trending this week</div>
              <div className="gl-trending-strip">
                {trendingGames.map((g) => (
                  <div key={g._id} className="gl-trending-card" onClick={() => setSelected(g)}>
                    <div className="gl-trending-emoji">{g.emoji}</div>
                    <div className="gl-trending-name">{g.name}</div>
                    <div className="gl-trending-plays">{g.timesPlayed}× played</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="gl-toolbar">
            <div className="gl-search-wrap">
              <span className="gl-search-icon">🔍</span>
              <input className="gl-search" placeholder="Search games, tags…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="gl-sort-wrap">
              <select className="gl-sort-select" value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}>
                <option value="timesPlayed">Most Played</option>
                <option value="rating">Top Rated</option>
                <option value="name">A → Z</option>
                <option value="difficulty">Easiest First</option>
              </select>
            </div>
            <div className="gl-view-toggle">
              <button className={`gl-view-btn${viewMode === "grid" ? " active" : ""}`}
                onClick={() => setViewMode("grid")} title="Grid view">⊞</button>
              <button className={`gl-view-btn${viewMode === "list" ? " active" : ""}`}
                onClick={() => setViewMode("list")} title="List view">☰</button>
            </div>
          </div>

          {/* Filters */}
          <div className="gl-filters">
            <span className="gl-filter-label">Category</span>
            {CATEGORIES.map((c) => (
              <button key={c} className={`gl-chip coral${category === c ? " active" : ""}`}
                onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <div className="gl-filters">
            <span className="gl-filter-label">Difficulty</span>
            {DIFFICULTY.map((d) => (
              <button key={d} className={`gl-chip yellow${difficulty === d ? " active" : ""}`}
                onClick={() => setDifficulty(d)}>{d}</button>
            ))}
            <span className="gl-filter-label" style={{ marginLeft: 8 }}>Tags</span>
            {TAGS.map((t) => (
              <button key={t} className={`gl-chip mint${activeTags.includes(t) ? " active" : ""}`}
                onClick={() => toggleTag(t)}>{t}</button>
            ))}
          </div>

          {/* Results bar */}
          <div className="gl-results-bar">
            <div className="gl-results-count">
              Showing <span>{filtered.length}</span> of {(games ?? []).length} games
            </div>
            {hasFilters && (
              <button className="gl-clear-btn" onClick={clearFilters}>✕ Clear filters</button>
            )}
          </div>

          {/* Games */}
          {filtered.length === 0 ? (
            <div className="gl-empty">
              <div className="gl-empty-icon">🎲</div>
              <div className="gl-empty-title">No games found</div>
              <div className="gl-empty-sub">Try adjusting your filters or search term.</div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="gl-grid">
              {filtered.map((g, i) => (
                <GameCard key={g._id} game={g} trending={trendingIds.has(g._id)}
                  userMap={userMap} onClick={() => setSelected(g)}
                  style={{ animationDelay: `${i * 0.04}s` }} />
              ))}
            </div>
          ) : (
            <div className="gl-list">
              {filtered.map((g, i) => (
                <GameRow key={g._id} game={g} trending={trendingIds.has(g._id)}
                  onClick={() => setSelected(g)} style={{ animationDelay: `${i * 0.03}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* ── MODALS ── */}
        {selected && !editingGame && (
          <GameDrawer
            game={selected} trending={trendingIds.has(selected._id)}
            userMap={userMap}
            isAdmin={isAdmin}
            onClose={() => setSelected(null)}
            onEdit={() => { setEditingGame(selected); setSelected(null); }}
          />
        )}

        {showAdd && (
          <AddGameModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleAddGame} />
        )}

        {editingGame && (
          <EditGameModal
            game={editingGame}
            onClose={() => setEditingGame(null)}
            onSave={handleEditGame}
          />
        )}

      </div>
    </>
  );
}