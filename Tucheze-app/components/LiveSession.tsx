"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player { id: string; name: string; emoji: string; color: string; }
interface Team   { id: string; name: string; emoji: string; color: string; playerIds: string[]; }

interface PlayerScore extends Player {
  score: number; prevRank: number; rank: number; delta: number | null;
}
interface TeamScore {
  id: string; name: string; emoji: string; color: string;
  score: number; prevRank: number; rank: number; delta: number | null;
  members: PlayerScore[];
}
interface Game { name: string; emoji: string; gameType?: "individual" | "team" | "both"; }

interface RoundResult {
  roundIndex: number;
  game: Game;
  winnerName: string;
  winnerEmoji: string;
  winnerColor: string;
}

interface SessionData {
  convexId?: string;
  name: string;
  location: string;
  players: Player[];
  games: Game[];
  playFormat?: "individual" | "teams";
  teams?: Team[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;
const RANK_COLORS = ["#FFB800","#C0C0C0","#CD7F32","#4ECDC4","#FF9ECD","#C8F135","#A8DAFF","#FFE135"];
const RANK_BG     = ["#fffbea","#f5f5f5","#fdf6ee","#f0fdfb","#fff0f8","#f8ffe0","#f0f8ff","#fffde0"];
const QUICK_PTS   = [1, 2, 3, 5, 10];

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #1a1a2e; --coral: #FF6B6B; --yellow: #FFE135;
    --mint: #4ECDC4; --lime: #C8F135; --white: #FFFDF5;
    --border: 3px solid #1a1a2e; --shadow: 4px 4px 0 #1a1a2e; --shadow-lg: 6px 6px 0 #1a1a2e;
  }
  .ls-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px; min-height: 100vh; color: var(--navy);
  }
  .ls-header {
    background: var(--navy); border-bottom: var(--border);
    padding: 16px 36px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; position: relative; overflow: hidden;
  }
  .ls-header::before {
    content:''; position:absolute; inset:0;
    background-image: radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px);
    background-size:24px 24px; pointer-events:none;
  }
  .ls-header-left { position:relative; z-index:1; flex:1; min-width:0; }
  .ls-live-badge {
    display:inline-flex; align-items:center; gap:6px;
    background:var(--coral); color:white; border:2px solid white; border-radius:50px;
    padding:3px 12px; font-size:0.68rem; font-weight:800;
    letter-spacing:1px; text-transform:uppercase; margin-bottom:5px;
    animation: pulseBadge 2s ease-in-out infinite;
  }
  @keyframes pulseBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  .ls-live-dot { width:7px; height:7px; border-radius:50%; background:white; animation:blinkDot 1s infinite; }
  @keyframes blinkDot { 0%,100%{opacity:1} 50%{opacity:0.2} }
  .ls-session-name { font-family:'Fredoka One',cursive; font-size:1.55rem; color:white; line-height:1.1; }
  .ls-session-meta { font-size:0.73rem; font-weight:700; color:rgba(255,255,255,0.4); margin-top:3px; }
  .ls-round-pill {
    display:inline-flex; align-items:center; gap:8px; flex-wrap:wrap;
    background:rgba(255,255,255,0.1); border:2px solid rgba(255,255,255,0.2);
    border-radius:50px; padding:5px 14px; margin-top:7px;
    position:relative; z-index:1;
  }
  .ls-round-pill-game { font-family:'Fredoka One',cursive; font-size:0.88rem; color:var(--yellow); }
  .ls-round-pill-count { font-size:0.68rem; font-weight:800; color:rgba(255,255,255,0.4); }
  .ls-round-dots { display:flex; gap:5px; align-items:center; }
  .ls-round-dot { width:8px; height:8px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); transition:all .2s; }
  .ls-round-dot.done    { background:var(--lime); border-color:var(--lime); }
  .ls-round-dot.active  { background:var(--yellow); border-color:var(--yellow); width:10px; height:10px; }
  .ls-round-dot.pending { background:transparent; }
  .ls-header-right { display:flex; align-items:center; gap:12px; position:relative; z-index:1; flex-wrap:wrap; }
  .ls-header-stats { display:flex; gap:9px; flex-wrap:wrap; }
  .ls-header-stat {
    background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.15);
    border-radius:12px; padding:7px 13px; text-align:center;
  }
  .ls-header-stat-num { font-family:'Fredoka One',cursive; font-size:1.15rem; color:var(--yellow); }
  .ls-header-stat-label { font-size:0.58rem; font-weight:800; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px; }
  .ls-header-btns { display:flex; gap:8px; align-items:center; }
  .ls-end-round-btn {
    font-family:'Fredoka One',cursive; font-size:0.88rem;
    padding:9px 18px; border:2px solid var(--yellow); border-radius:50px;
    background:var(--yellow); color:var(--navy); cursor:pointer; transition:all .15s;
    box-shadow:3px 3px 0 rgba(255,255,255,0.15);
  }
  .ls-end-round-btn:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 rgba(255,255,255,0.25); }
  .ls-end-btn {
    font-family:'Nunito',sans-serif; font-weight:800; font-size:0.82rem;
    padding:9px 16px; border:2.5px solid rgba(255,255,255,0.25); border-radius:50px;
    background:transparent; color:rgba(255,255,255,0.5); cursor:pointer; transition:all .15s;
  }
  .ls-end-btn:hover { border-color:var(--coral); color:var(--coral); }
  .ls-body {
    max-width:960px; margin:0 auto; padding:28px 22px 80px;
    display:grid; grid-template-columns:1fr 330px; gap:24px; align-items:start;
  }
  .ls-board-title {
    font-family:'Fredoka One',cursive; font-size:1.3rem;
    margin-bottom:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  }
  .ls-board-title-pill {
    font-size:0.68rem; font-weight:800; background:var(--yellow);
    border:2px solid var(--navy); border-radius:50px; padding:2px 9px; box-shadow:2px 2px 0 var(--navy);
  }
  .ls-board-sub { font-size:0.7rem; font-weight:800; opacity:0.38; margin-bottom:12px; margin-top:-10px; }
  .ls-board { position:relative; min-height:60px; }
  .ls-player-row { position:absolute; left:0; right:0; transition: top 0.55s cubic-bezier(0.34,1.56,0.64,1); }
  .ls-player-card {
    display:flex; align-items:center; gap:12px;
    border:3px solid var(--navy); border-radius:16px;
    padding:9px 14px; box-shadow:var(--shadow); transition:box-shadow .15s, transform .15s;
  }
  .ls-player-card:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-rank-badge { font-family:'Fredoka One',cursive; font-size:1.2rem; width:34px; text-align:center; flex-shrink:0; }
  .ls-player-avatar { width:38px; height:38px; border-radius:50%; border:2.5px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
  .ls-player-name { font-family:'Fredoka One',cursive; font-size:0.98rem; flex:1; }
  .ls-player-score { font-family:'Fredoka One',cursive; font-size:1.35rem; color:var(--navy); }
  .ls-score-delta { font-family:'Fredoka One',cursive; font-size:0.82rem; color:var(--mint); min-width:30px; text-align:right; animation: deltaFade 2s ease forwards; }
  @keyframes deltaFade { 0%{opacity:1;transform:translateY(0)} 70%{opacity:1;transform:translateY(-6px)} 100%{opacity:0;transform:translateY(-12px)} }
  .ls-rank-up { font-size:0.65rem; color:var(--mint); font-weight:800; animation:rankPop .4s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes rankPop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
  .ls-team-row { position:absolute; left:0; right:0; transition: top 0.55s cubic-bezier(0.34,1.56,0.64,1); }
  .ls-team-card { border:3px solid var(--navy); border-radius:16px; box-shadow:var(--shadow); overflow:hidden; transition:box-shadow .15s, transform .15s; }
  .ls-team-card:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-team-card-head { display:flex; align-items:center; gap:11px; padding:9px 14px; }
  .ls-team-emoji-badge { width:38px; height:38px; border-radius:50%; border:2.5px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
  .ls-team-name { font-family:'Fredoka One',cursive; font-size:1rem; flex:1; }
  .ls-team-score { font-family:'Fredoka One',cursive; font-size:1.35rem; }
  .ls-team-members-strip { display:flex; padding:6px 14px 9px; border-top:2px solid rgba(26,26,46,0.1); background:rgba(0,0,0,0.03); flex-wrap:wrap; gap:5px; }
  .ls-member-chip { display:flex; align-items:center; gap:4px; font-size:0.68rem; font-weight:800; background:white; border:1.5px solid rgba(26,26,46,0.2); border-radius:50px; padding:2px 7px; }
  .ls-member-dot { width:15px; height:15px; border-radius:50%; border:1.5px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:0.55rem; }
  .ls-member-score { font-family:'Fredoka One',cursive; opacity:0.5; }
  .ls-round-history { margin-bottom:16px; display:flex; gap:7px; flex-wrap:wrap; }
  .ls-round-chip { display:flex; align-items:center; gap:5px; border:2.5px solid var(--navy); border-radius:50px; padding:4px 11px; background:white; box-shadow:2px 2px 0 var(--navy); font-size:0.72rem; font-weight:800; }
  .ls-round-chip-winner { display:inline-flex; align-items:center; gap:3px; background:var(--yellow); border-radius:50px; padding:1px 7px; font-size:0.65rem; font-weight:900; border:1.5px solid var(--navy); }
  .ls-panel-title { font-family:'Fredoka One',cursive; font-size:1.25rem; margin-bottom:11px; }
  .ls-panel-card { border:var(--border); border-radius:18px; box-shadow:var(--shadow-lg); background:white; overflow:hidden; }
  .ls-panel-head { background:var(--navy); padding:11px 16px; font-family:'Fredoka One',cursive; font-size:0.92rem; color:white; display:flex; align-items:center; gap:7px; }
  .ls-multi-hint { font-size:0.65rem; font-weight:800; color:rgba(255,255,255,0.4); margin-left:auto; }
  .ls-selected-chip { margin:9px 12px 0; padding:5px 11px; background:var(--yellow); border:2px solid var(--navy); border-radius:50px; font-size:0.72rem; font-weight:800; box-shadow:2px 2px 0 var(--navy); display:flex; align-items:center; justify-content:space-between; }
  .ls-deselect-all { background:none; border:none; cursor:pointer; font-size:0.72rem; font-weight:800; color:var(--navy); opacity:0.6; }
  .ls-deselect-all:hover { opacity:1; }
  .ls-player-select-list { padding:11px; display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto; }
  .ls-select-btn { display:flex; align-items:center; gap:9px; width:100%; padding:8px 11px; border:2.5px solid var(--navy); border-radius:12px; background:white; cursor:pointer; transition:all .12s; font-family:'Nunito',sans-serif; box-shadow:3px 3px 0 var(--navy); }
  .ls-select-btn:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--navy); }
  .ls-select-btn.selected { background:var(--navy); color:white; box-shadow:2px 2px 0 rgba(0,0,0,0.3); }
  .ls-team-select-btn { display:flex; flex-direction:column; width:100%; padding:9px 11px; border:2.5px solid var(--navy); border-radius:12px; background:white; cursor:pointer; transition:all .12s; font-family:'Nunito',sans-serif; box-shadow:3px 3px 0 var(--navy); text-align:left; gap:5px; }
  .ls-team-select-btn:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--navy); }
  .ls-team-select-btn.selected { background:var(--navy); color:white; box-shadow:2px 2px 0 rgba(0,0,0,0.3); }
  .ls-team-select-top { display:flex; align-items:center; gap:9px; }
  .ls-team-select-avatar { width:26px; height:26px; border-radius:50%; border:2px solid currentColor; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; }
  .ls-team-select-name { font-weight:800; font-size:0.85rem; flex:1; }
  .ls-team-select-score { font-family:'Fredoka One',cursive; font-size:0.9rem; }
  .ls-team-select-members { display:flex; gap:3px; flex-wrap:wrap; padding-left:35px; }
  .ls-team-select-member { font-size:0.6rem; font-weight:800; border:1.5px solid currentColor; border-radius:50px; padding:1px 6px; opacity:0.7; }
  .ls-select-btn-avatar { width:26px; height:26px; border-radius:50%; border:2px solid currentColor; display:flex; align-items:center; justify-content:center; font-size:0.9rem; flex-shrink:0; }
  .ls-select-btn-name { font-weight:800; font-size:0.83rem; flex:1; text-align:left; }
  .ls-select-btn-score { font-family:'Fredoka One',cursive; font-size:0.88rem; }
  .ls-points-section { padding:11px; border-top:2.5px solid #eee; }
  .ls-points-label { font-size:0.68rem; font-weight:800; opacity:0.42; text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; }
  .ls-quick-pts { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:9px; }
  .ls-quick-btn { font-family:'Fredoka One',cursive; font-size:0.88rem; padding:7px 12px; border:2.5px solid var(--navy); border-radius:11px; background:white; cursor:pointer; box-shadow:3px 3px 0 var(--navy); transition:all .12s; }
  .ls-quick-btn:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--navy); background:var(--yellow); }
  .ls-quick-btn:disabled { opacity:0.35; cursor:not-allowed; }
  .ls-custom-row { display:flex; gap:7px; align-items:center; }
  .ls-custom-input { flex:1; font-family:'Fredoka One',cursive; font-size:0.98rem; padding:8px 11px; border:2.5px solid var(--navy); border-radius:11px; background:white; color:var(--navy); outline:none; box-shadow:3px 3px 0 var(--navy); transition:box-shadow .15s; text-align:center; }
  .ls-custom-input:focus { box-shadow:5px 5px 0 var(--navy); }
  .ls-add-btn { font-family:'Fredoka One',cursive; font-size:0.92rem; padding:8px 16px; border:var(--border); border-radius:11px; background:var(--coral); color:white; cursor:pointer; box-shadow:var(--shadow); transition:all .12s; }
  .ls-add-btn:hover:not(:disabled) { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-add-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .ls-deduct-row { display:flex; gap:7px; margin-top:7px; }
  .ls-deduct-btn { font-family:'Nunito',sans-serif; font-weight:800; font-size:0.73rem; padding:6px 12px; border:2px solid var(--navy); border-radius:9px; background:white; cursor:pointer; box-shadow:2px 2px 0 var(--navy); transition:all .12s; flex:1; }
  .ls-deduct-btn:hover:not(:disabled) { background:#fff0f0; border-color:var(--coral); color:var(--coral); transform:translate(-1px,-1px); }
  .ls-deduct-btn:disabled { opacity:0.35; cursor:not-allowed; }
  .ls-toast-wrap { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); z-index:999; pointer-events:none; display:flex; flex-direction:column-reverse; gap:7px; align-items:center; }
  .ls-toast { font-family:'Fredoka One',cursive; font-size:0.97rem; background:var(--navy); color:white; border:2.5px solid var(--navy); border-radius:50px; padding:9px 22px; box-shadow:var(--shadow-lg); animation: toastIn .35s cubic-bezier(0.34,1.56,0.64,1) forwards, toastOut .3s ease 2.5s forwards; white-space:nowrap; }
  @keyframes toastIn  { from{opacity:0;transform:translateY(16px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes toastOut { from{opacity:1} to{opacity:0;transform:translateY(-8px)} }

  /* ── OVERLAYS ── */
  .ls-overlay-bg { position:fixed; inset:0; background:rgba(26,26,46,0.82); z-index:500; display:flex; align-items:center; justify-content:center; animation:fadeIn .25s ease; }
  .ls-overlay-bg.z-600 { z-index:600; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .ls-modal-card { background:var(--white); border:var(--border); border-radius:26px; box-shadow:0 20px 60px rgba(0,0,0,0.3); padding:36px 32px; max-width:480px; width:92%; text-align:center; animation:popIn .4s cubic-bezier(0.34,1.56,0.64,1); max-height:90vh; overflow-y:auto; }
  @keyframes popIn { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
  .ls-modal-emoji  { font-size:3.8rem; margin-bottom:10px; }
  .ls-modal-title  { font-family:'Fredoka One',cursive; font-size:1.9rem; margin-bottom:5px; }
  .ls-modal-sub    { font-size:0.83rem; font-weight:700; opacity:0.4; margin-bottom:22px; }
  .ls-winner-banner { background:var(--yellow); border:3px solid var(--navy); border-radius:16px; padding:13px 18px; margin-bottom:20px; box-shadow:var(--shadow); display:flex; align-items:center; gap:12px; }
  .ls-winner-avatar { width:50px; height:50px; border-radius:50%; border:3px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:1.6rem; flex-shrink:0; }
  .ls-winner-label  { font-size:0.68rem; font-weight:800; opacity:0.5; text-transform:uppercase; letter-spacing:1px; }
  .ls-winner-name   { font-family:'Fredoka One',cursive; font-size:1.2rem; }
  .ls-scores-label  { font-size:0.7rem; font-weight:800; opacity:0.4; text-transform:uppercase; letter-spacing:1px; margin-bottom:9px; text-align:left; }
  .ls-scores-list   { display:flex; flex-direction:column; gap:5px; margin-bottom:22px; }
  .ls-score-row { display:flex; align-items:center; gap:9px; padding:8px 11px; border:2.5px solid var(--navy); border-radius:11px; background:white; box-shadow:2px 2px 0 var(--navy); text-align:left; }
  .ls-score-medal  { font-family:'Fredoka One',cursive; font-size:0.95rem; width:22px; text-align:center; flex-shrink:0; }
  .ls-score-avatar { width:26px; height:26px; border-radius:50%; border:2px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:0.85rem; flex-shrink:0; }
  .ls-score-name   { font-weight:800; font-size:0.82rem; flex:1; }
  .ls-score-pts    { font-family:'Fredoka One',cursive; font-size:0.9rem; color:var(--coral); }
  .ls-next-btn { font-family:'Fredoka One',cursive; font-size:0.98rem; padding:12px 28px; border:var(--border); border-radius:50px; background:var(--coral); color:white; cursor:pointer; box-shadow:var(--shadow); transition:transform .1s, box-shadow .1s; width:100%; }
  .ls-next-btn:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }

  /* end screen */
  .ls-end-trophy   { font-size:4.5rem; margin-bottom:10px; animation:wobble 2s ease-in-out infinite; }
  @keyframes wobble { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
  .ls-end-podium   { display:flex; justify-content:center; align-items:flex-end; gap:10px; margin-bottom:20px; }
  .ls-podium-place { display:flex; flex-direction:column; align-items:center; gap:5px; }
  .ls-podium-avatar { width:48px; height:48px; border-radius:50%; border:3px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:1.45rem; box-shadow:var(--shadow); }
  .ls-podium-name   { font-weight:800; font-size:0.76rem; max-width:78px; text-align:center; line-height:1.2; }
  .ls-podium-score  { font-family:'Fredoka One',cursive; font-size:0.95rem; color:var(--coral); }
  .ls-podium-block  { border:var(--border); border-radius:9px 9px 0 0; display:flex; align-items:center; justify-content:center; font-family:'Fredoka One',cursive; font-size:1.3rem; box-shadow:var(--shadow); }
  .ls-podium-members { display:flex; gap:3px; justify-content:center; flex-wrap:wrap; max-width:86px; }
  .ls-podium-member-dot { width:17px; height:17px; border-radius:50%; border:2px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:0.52rem; }
  .ls-rounds-recap { margin-bottom:18px; text-align:left; }
  .ls-rounds-recap-title { font-size:0.68rem; font-weight:800; opacity:0.4; text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; }
  .ls-recap-row { display:flex; align-items:center; gap:7px; padding:6px 11px; border:2px solid rgba(26,26,46,0.1); border-radius:9px; background:white; margin-bottom:4px; }
  .ls-recap-game { font-size:0.78rem; font-weight:800; flex:1; }
  .ls-recap-winner { display:flex; align-items:center; gap:4px; font-size:0.72rem; font-weight:800; }
  .ls-recap-winner-avatar { width:18px; height:18px; border-radius:50%; border:1.5px solid var(--navy); display:flex; align-items:center; justify-content:center; font-size:0.55rem; }
  .ls-mvp-banner { background:var(--yellow); border:2.5px solid var(--navy); border-radius:12px; padding:9px 13px; margin-bottom:18px; display:flex; align-items:center; gap:9px; box-shadow:3px 3px 0 var(--navy); }
  .ls-end-actions { display:flex; gap:9px; justify-content:center; flex-wrap:wrap; }
  .ls-end-action-btn { font-family:'Fredoka One',cursive; font-size:0.92rem; padding:10px 24px; border:var(--border); border-radius:50px; cursor:pointer; box-shadow:var(--shadow); transition:transform .1s, box-shadow .1s; }
  .ls-end-action-btn:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-saving-indicator { font-size:0.73rem; font-weight:800; opacity:0.5; display:flex; align-items:center; gap:5px; justify-content:center; margin-bottom:9px; }
  .ls-saving-spinner { width:12px; height:12px; border:2px solid rgba(26,26,46,0.2); border-top-color:var(--coral); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to{transform:rotate(360deg)} }
  .ls-confirm-card { background:white; border:var(--border); border-radius:22px; padding:32px 28px; max-width:360px; width:90%; box-shadow:var(--shadow-lg); text-align:center; animation:popIn .3s cubic-bezier(0.34,1.56,0.64,1); }
  .ls-confirm-actions { display:flex; gap:9px; justify-content:center; }
  .ls-confirm-btn { font-family:'Fredoka One',cursive; font-size:0.92rem; padding:10px 22px; border:var(--border); border-radius:50px; cursor:pointer; box-shadow:var(--shadow); transition:transform .1s, box-shadow .1s; }
  .ls-confirm-btn:hover { transform:translate(-1px,-1px); box-shadow:var(--shadow-lg); }

  @media (max-width: 768px) {
    .ls-header { padding:13px 16px; }
    .ls-body { grid-template-columns:1fr; padding:18px 13px 80px; gap:16px; }
    .ls-header-stats { gap:6px; }
    .ls-session-name { font-size:1.25rem; }
    .ls-header-btns { flex-direction:column; gap:5px; align-items:stretch; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rankMedal = (r: number) => ["🥇","🥈","🥉"][r-1] ?? `#${r}`;

function assignRanks(scores: PlayerScore[]): PlayerScore[] {
  return [...scores].sort((a,b) => b.score - a.score).map((p,i) => ({...p, rank: i+1}));
}
function assignTeamRanks(teams: TeamScore[]): TeamScore[] {
  return [...teams].sort((a,b) => b.score - a.score).map((t,i) => ({...t, rank: i+1}));
}
function buildTeamScores(teams: Team[], playerScores: PlayerScore[], prevTeams: TeamScore[]): TeamScore[] {
  const prevMap = new Map(prevTeams.map(t => [t.id, t]));
  return assignTeamRanks(teams.map(team => {
    const members = playerScores.filter(p => team.playerIds.includes(p.id));
    const score   = members.reduce((s,p) => s + p.score, 0);
    return { id: team.id, name: team.name, emoji: team.emoji, color: team.color,
      score, prevRank: prevMap.get(team.id)?.rank ?? 0, rank: 0, delta: null, members };
  }));
}
function freshScores(players: Player[]): PlayerScore[] {
  return assignRanks(players.map(p => ({...p, score:0, prevRank:0, rank:0, delta:null})));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; }
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return <div className="ls-toast-wrap">{toasts.map(t => <div key={t.id} className="ls-toast">{t.msg}</div>)}</div>;
}

// ─── Leaderboards ─────────────────────────────────────────────────────────────

const ROW_H = 72, TEAM_ROW_H = 104;

function Leaderboard({ scores, subtitle }: { scores: PlayerScore[]; subtitle?: string }) {
  const sorted = [...scores].sort((a,b) => a.rank - b.rank);
  return (
    <>
      {subtitle && <div className="ls-board-sub">{subtitle}</div>}
      <div className="ls-board" style={{ height: sorted.length * ROW_H }}>
        {sorted.map(p => {
          const bg = RANK_BG[(p.rank-1) % RANK_BG.length];
          const rc = RANK_COLORS[(p.rank-1) % RANK_COLORS.length];
          return (
            <div key={p.id} className="ls-player-row" style={{ top: (p.rank-1)*ROW_H, height: ROW_H-8 }}>
              <div className="ls-player-card" style={{ background: bg, height:"100%" }}>
                <div className="ls-rank-badge" style={{ color: rc }}>{rankMedal(p.rank)}</div>
                <div className="ls-player-avatar" style={{ background: p.color }}>{p.emoji}</div>
                <div className="ls-player-name" style={{ flex:1 }}>
                  {p.name}{p.prevRank > p.rank && p.prevRank !== 0 && <span className="ls-rank-up"> ↑{p.prevRank-p.rank}</span>}
                </div>
                {p.delta !== null && <span key={`${p.id}-${p.score}`} className="ls-score-delta">{p.delta>0?"+":""}{p.delta}</span>}
                <div className="ls-player-score">{p.score}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TeamLeaderboard({ teamScores, subtitle }: { teamScores: TeamScore[]; subtitle?: string }) {
  const sorted = [...teamScores].sort((a,b) => a.rank - b.rank);
  return (
    <>
      {subtitle && <div className="ls-board-sub">{subtitle}</div>}
      <div className="ls-board" style={{ height: sorted.length * TEAM_ROW_H }}>
        {sorted.map(t => {
          const bg = RANK_BG[(t.rank-1) % RANK_BG.length];
          const rc = RANK_COLORS[(t.rank-1) % RANK_COLORS.length];
          return (
            <div key={t.id} className="ls-team-row" style={{ top: (t.rank-1)*TEAM_ROW_H, height: TEAM_ROW_H-8 }}>
              <div className="ls-team-card" style={{ background: bg, height:"100%" }}>
                <div className="ls-team-card-head">
                  <div className="ls-rank-badge" style={{ color: rc }}>{rankMedal(t.rank)}</div>
                  <div className="ls-team-emoji-badge" style={{ background: t.color }}>{t.emoji}</div>
                  <div className="ls-team-name" style={{ flex:1 }}>
                    {t.name}{t.prevRank > t.rank && t.prevRank !== 0 && <span className="ls-rank-up"> ↑{t.prevRank-t.rank}</span>}
                  </div>
                  {t.delta !== null && <span key={`${t.id}-${t.score}`} className="ls-score-delta">{t.delta>0?"+":""}{t.delta}</span>}
                  <div className="ls-team-score">{t.score}</div>
                </div>
                <div className="ls-team-members-strip">
                  {t.members.map(m => (
                    <div key={m.id} className="ls-member-chip">
                      <div className="ls-member-dot" style={{ background: m.color }}>{m.emoji}</div>
                      {m.name}<span className="ls-member-score"> {m.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Points Panels ────────────────────────────────────────────────────────────

function IndividualPointsPanel({ scores, onAdd }: { scores: PlayerScore[]; onAdd: (ids:string[], pts:number)=>void; }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const has = sel.size > 0;
  const toggle = (id: string) => setSel(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const award  = (pts: number) => { if (!has||!pts) return; onAdd([...sel], pts); setCustom(""); };
  const deduct = () => { if (!has) return; onAdd([...sel], -(parseInt(custom)||1)); setCustom(""); };
  return (
    <div className="ls-panel-card">
      <div className="ls-panel-head">🎯 Award Points <span className="ls-multi-hint">tap to multi-select</span></div>
      {sel.size > 0 && <div className="ls-selected-chip"><span>{sel.size} selected</span><button className="ls-deselect-all" onClick={() => setSel(new Set())}>✕ Clear</button></div>}
      <div className="ls-player-select-list">
        {[...scores].sort((a,b)=>a.rank-b.rank).map(p => {
          const isSel = sel.has(p.id);
          return (
            <button key={p.id} className={`ls-select-btn${isSel?" selected":""}`} onClick={() => toggle(p.id)}>
              <div className="ls-select-btn-avatar" style={{ background: isSel?"rgba(255,255,255,0.2)":p.color }}>{p.emoji}</div>
              <span className="ls-select-btn-name">{p.name}</span>
              <span className="ls-select-btn-score">{p.score}pts</span>
            </button>
          );
        })}
      </div>
      <div className="ls-points-section">
        <div className="ls-points-label">Quick Add</div>
        <div className="ls-quick-pts">{QUICK_PTS.map(pts => <button key={pts} className="ls-quick-btn" disabled={!has} onClick={() => award(pts)}>+{pts}</button>)}</div>
        <div className="ls-points-label">Custom</div>
        <div className="ls-custom-row">
          <input className="ls-custom-input" type="number" min={1} placeholder="pts" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key==="Enter" && award(parseInt(custom)||0)} />
          <button className="ls-add-btn" disabled={!has||!custom} onClick={() => award(parseInt(custom)||0)}>＋ Add</button>
        </div>
        <div className="ls-deduct-row"><button className="ls-deduct-btn" disabled={!has} onClick={deduct}>− Deduct {custom||"1"}pt{sel.size>1?"s each":""}</button></div>
      </div>
    </div>
  );
}

function TeamPointsPanel({ teamScores, onAdd }: { teamScores: TeamScore[]; onAdd: (ids:string[], pts:number)=>void; }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const has = sel.size > 0;
  const toggle = (id: string) => setSel(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const memberIds = () => teamScores.filter(t => sel.has(t.id)).flatMap(t => t.members.map(m => m.id));
  const award  = (pts: number) => { if (!has||!pts) return; const ids=memberIds(); if(ids.length) onAdd(ids,pts); setCustom(""); };
  const deduct = () => { const ids=memberIds(); if(ids.length) onAdd(ids, -(parseInt(custom)||1)); setCustom(""); };
  return (
    <div className="ls-panel-card">
      <div className="ls-panel-head">🎯 Award Points <span className="ls-multi-hint">select teams</span></div>
      {sel.size > 0 && <div className="ls-selected-chip"><span>{sel.size} team{sel.size>1?"s":""} selected</span><button className="ls-deselect-all" onClick={() => setSel(new Set())}>✕ Clear</button></div>}
      <div className="ls-player-select-list">
        {[...teamScores].sort((a,b)=>a.rank-b.rank).map(t => {
          const isSel = sel.has(t.id);
          return (
            <button key={t.id} className={`ls-team-select-btn${isSel?" selected":""}`} onClick={() => toggle(t.id)}>
              <div className="ls-team-select-top">
                <div className="ls-team-select-avatar" style={{ background: isSel?"rgba(255,255,255,0.2)":t.color }}>{t.emoji}</div>
                <span className="ls-team-select-name">{t.name}</span>
                <span className="ls-team-select-score">{t.score}pts</span>
              </div>
              <div className="ls-team-select-members">{t.members.map(m => <span key={m.id} className="ls-team-select-member">{m.emoji} {m.name}</span>)}</div>
            </button>
          );
        })}
      </div>
      <div className="ls-points-section">
        <div className="ls-points-label">Quick Add (all members)</div>
        <div className="ls-quick-pts">{QUICK_PTS.map(pts => <button key={pts} className="ls-quick-btn" disabled={!has} onClick={() => award(pts)}>+{pts}</button>)}</div>
        <div className="ls-points-label">Custom</div>
        <div className="ls-custom-row">
          <input className="ls-custom-input" type="number" min={1} placeholder="pts" value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key==="Enter" && award(parseInt(custom)||0)} />
          <button className="ls-add-btn" disabled={!has||!custom} onClick={() => award(parseInt(custom)||0)}>＋ Add</button>
        </div>
        <div className="ls-deduct-row"><button className="ls-deduct-btn" disabled={!has} onClick={deduct}>− Deduct {custom||"1"}pt{sel.size>1?"s each":""}</button></div>
      </div>
    </div>
  );
}

// ─── Round End Modal ──────────────────────────────────────────────────────────

function RoundEndModal({ result, roundScores, teams, isTeams, nextGame, isLast, onNext }: {
  result: RoundResult; roundScores: PlayerScore[];
  teams?: Team[]; isTeams: boolean;
  nextGame?: Game; isLast: boolean; onNext: () => void;
}) {
  const sorted = [...roundScores].sort((a,b) => b.score - a.score);
  const teamRows = isTeams && teams
    ? teams.map(t => ({ team: t, total: t.playerIds.reduce((s,pid) => s+(roundScores.find(p=>p.id===pid)?.score??0), 0) })).sort((a,b)=>b.total-a.total)
    : [];

  return (
    <div className="ls-overlay-bg">
      <div className="ls-modal-card">
        <div className="ls-modal-emoji">{result.game.emoji}</div>
        <div className="ls-modal-title">Round {result.roundIndex + 1} Done!</div>
        <div className="ls-modal-sub">{result.game.name} · Round Winner</div>
        <div className="ls-winner-banner">
          <div className="ls-winner-avatar" style={{ background: result.winnerColor }}>{result.winnerEmoji}</div>
          <div style={{ textAlign:"left" }}>
            <div className="ls-winner-label">🏆 Round Winner</div>
            <div className="ls-winner-name">{result.winnerName}</div>
          </div>
        </div>
        <div className="ls-scores-label">Round Scores</div>
        <div className="ls-scores-list">
          {isTeams
            ? teamRows.map(({ team, total }, i) => (
                <div key={team.id} className="ls-score-row" style={{ background: i===0?"#fffbea":"white" }}>
                  <div className="ls-score-medal">{rankMedal(i+1)}</div>
                  <div className="ls-score-avatar" style={{ background: team.color }}>{team.emoji}</div>
                  <div className="ls-score-name">{team.name}</div>
                  <div className="ls-score-pts">{total}pts</div>
                </div>
              ))
            : sorted.map((p, i) => (
                <div key={p.id} className="ls-score-row" style={{ background: i===0?"#fffbea":"white" }}>
                  <div className="ls-score-medal">{rankMedal(i+1)}</div>
                  <div className="ls-score-avatar" style={{ background: p.color }}>{p.emoji}</div>
                  <div className="ls-score-name">{p.name}</div>
                  <div className="ls-score-pts">{p.score}pts</div>
                </div>
              ))
          }
        </div>
        <button className="ls-next-btn" onClick={onNext}>
          {isLast ? "🏁 See Final Results" : `➡️ Next: ${nextGame?.emoji} ${nextGame?.name}`}
        </button>
      </div>
    </div>
  );
}

// ─── End Screens ──────────────────────────────────────────────────────────────

function EndScreen({ scores, teamScores, isTeams, sessionName, roundResults, saving, onPlayAgain, onHome }: {
  scores: PlayerScore[]; teamScores: TeamScore[]; isTeams: boolean;
  sessionName: string; roundResults: RoundResult[];
  saving: boolean; onPlayAgain: () => void; onHome: () => void;
}) {
  const entities = isTeams ? [...teamScores].sort((a,b)=>a.rank-b.rank) : [...scores].sort((a,b)=>a.rank-b.rank);
  const podium = [entities[1], entities[0], entities[2]].filter(Boolean);
  const heights = [80, 108, 60];
  const medals  = ["🥈","🥇","🥉"];
  const mvp = isTeams ? [...scores].sort((a,b)=>b.score-a.score)[0] : null;
  const mvpTeam = mvp ? teamScores.find(t => t.members.some(m=>m.id===mvp.id)) : null;

  return (
    <div className="ls-overlay-bg" style={{ zIndex: 510 }}>
      <div className="ls-modal-card" style={{ maxWidth: 560 }}>
        <div className="ls-end-trophy">🏆</div>
        <div className="ls-modal-title">Game Over!</div>
        <div className="ls-modal-sub">{sessionName} · {isTeams ? "Final Team Scores" : "Final Scores"}</div>

        <div className="ls-end-podium">
          {podium.map((e, i) => e && (
            <div key={(e as any).id} className="ls-podium-place">
              <div className="ls-podium-avatar" style={{ background: (e as any).color }}>{(e as any).emoji}</div>
              <div className="ls-podium-name">{(e as any).name}</div>
              <div className="ls-podium-score">{(e as any).score}pts</div>
              {isTeams && (
                <div className="ls-podium-members" style={{ marginBottom: 3 }}>
                  {(e as TeamScore).members?.map(m => (
                    <div key={m.id} className="ls-podium-member-dot" style={{ background: m.color }}>{m.emoji}</div>
                  ))}
                </div>
              )}
              <div className="ls-podium-block" style={{ width:68, height:heights[i], background:RANK_COLORS[i] }}>{medals[i]}</div>
            </div>
          ))}
        </div>

        {mvp && mvpTeam && (
          <div className="ls-mvp-banner">
            <span style={{ fontSize:"1.3rem" }}>⭐</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.78rem" }}>MVP</div>
              <div style={{ fontWeight:800, fontSize:"0.78rem" }}>{mvp.emoji} {mvp.name} · {mvp.score}pts ({mvpTeam.name})</div>
            </div>
          </div>
        )}

        {roundResults.length > 1 && (
          <div className="ls-rounds-recap">
            <div className="ls-rounds-recap-title">Round by Round</div>
            {roundResults.map(r => (
              <div key={r.roundIndex} className="ls-recap-row">
                <span style={{ fontSize:"1rem" }}>{r.game.emoji}</span>
                <div className="ls-recap-game">{r.game.name}</div>
                <div className="ls-recap-winner">
                  <div className="ls-recap-winner-avatar" style={{ background: r.winnerColor }}>{r.winnerEmoji}</div>
                  {r.winnerName}
                </div>
              </div>
            ))}
          </div>
        )}

        {saving && <div className="ls-saving-indicator"><div className="ls-saving-spinner" /> Saving…</div>}
        <div className="ls-end-actions">
          <button className="ls-end-action-btn" style={{ background:"#C8F135" }} onClick={onPlayAgain}>🔄 Play Again</button>
          <button className="ls-end-action-btn" style={{ background:"#FF6B6B", color:"white" }} onClick={onHome}>🏠 Back Home</button>
        </div>
      </div>
    </div>
  );
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

const DEMO_SESSION: SessionData = {
  name: "Friday Game Night 🎮",
  location: "Njoro's Place",
  players: [
    { id:"d1", name:"Wanjiku", emoji:"😎", color:"#FF6B6B" },
    { id:"d2", name:"Otieno",  emoji:"🤠", color:"#4ECDC4" },
    { id:"d3", name:"Amara",   emoji:"🦁", color:"#FFE135" },
    { id:"d4", name:"Njoro",   emoji:"🐉", color:"#FF9ECD" },
  ],
  games: [
    { name:"Exploding Kittens", emoji:"🐱", gameType: "individual" },
    { name:"Catan",             emoji:"🏝️", gameType: "both"       },
  ],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveSession({ sessionData }: { sessionData?: SessionData }) {
  const router          = useRouter();
  const session         = sessionData ?? DEMO_SESSION;

  // Session has teams configured at all
  const hasTeams        = session.playFormat === "teams" && (session.teams?.length ?? 0) > 0;
  const isMultiGame     = session.games.length > 1;
  const completeSession = useMutation(api.sessions.complete);

  // ── Per-round score sheets ────────────────────────────────────────────────
  const [currentRound, setCurrentRound] = useState(0);
  const [roundScores, setRoundScores]   = useState<PlayerScore[][]>(() =>
    session.games.map(() => freshScores(session.players))
  );
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [pendingResult, setPendingResult] = useState<RoundResult | null>(null);

  // Current round's scores
  const curScores = roundScores[currentRound] ?? freshScores(session.players);

  // ── Per-round team mode ───────────────────────────────────────────────────
  // Resolves whether the CURRENT round runs as teams or individual,
  // based on the game's gameType and whether teams were set up at all.
  const getRoundIsTeams = useCallback((roundIndex: number): boolean => {
    if (!hasTeams) return false;
    const gt = session.games[roundIndex]?.gameType ?? "both";
    if (gt === "individual") return false;   // override: always individual
    if (gt === "team")       return true;    // override: always team
    return true; // "both" → use session's team setup
  }, [hasTeams, session.games]);

  const isTeams = getRoundIsTeams(currentRound);

  // Team scores for current round
  const [teamScores, setTeamScores] = useState<TeamScore[]>(() =>
    hasTeams ? buildTeamScores(session.teams!, freshScores(session.players), []) : []
  );
  useEffect(() => {
    if (!hasTeams || !session.teams) return;
    setTeamScores(prev => buildTeamScores(session.teams!, curScores, prev));
  }, [curScores, hasTeams, session.teams]);

  // Aggregate totals across ALL rounds
  const totalScores: PlayerScore[] = (() => {
    const map = new Map<string, number>();
    session.players.forEach(p => map.set(p.id, 0));
    roundScores.forEach(rnd => rnd.forEach(p => map.set(p.id, (map.get(p.id)??0) + p.score)));
    return assignRanks(session.players.map(p => ({...p, score: map.get(p.id)??0, prevRank:0, rank:0, delta:null})));
  })();
  const totalTeamScores = hasTeams ? buildTeamScores(session.teams!, totalScores, []) : [];

  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [showEnd, setShowEnd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving]       = useState(false);
  const toastId   = useRef(0);
  const lastToast = useRef("");

  const pushToast = useCallback((msg: string) => {
    if (msg === lastToast.current) return;
    lastToast.current = msg;
    setTimeout(() => { lastToast.current = ""; }, 100);
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800);
  }, []);

  const handleAddPoints = useCallback((playerIds: string[], pts: number) => {
    const targets = curScores.filter(p => playerIds.includes(p.id));
    setRoundScores(prev => prev.map((rnd, i) => {
      if (i !== currentRound) return rnd;
      const withPrev = rnd.map(p => ({...p, prevRank: p.rank}));
      return assignRanks(withPrev.map(p =>
        playerIds.includes(p.id) ? {...p, score: Math.max(0, p.score+pts), delta: pts} : {...p, delta:null}
      ));
    }));
    if (isTeams) {
      const awardedTeams = (session.teams??[]).filter(t => t.playerIds.some(pid => playerIds.includes(pid)));
      if (awardedTeams.length===1) pushToast(`${awardedTeams[0].emoji} ${awardedTeams[0].name} ${pts>=0?"+":""}${pts}pts`);
      else if (awardedTeams.length>1) pushToast(`${awardedTeams.map(t=>t.emoji).join("")} ${pts>=0?"+":""}${pts}pts each`);
    } else {
      if (targets.length===1) pushToast(`${targets[0].emoji} ${targets[0].name} ${pts>=0?"+":""}${pts}pts`);
      else if (targets.length>1) pushToast(`${targets.map(p=>p.emoji).join("")} ${pts>=0?"+":""}${pts}pts each`);
    }
    setTimeout(() => setRoundScores(prev => prev.map((rnd,i) => i===currentRound ? rnd.map(p=>({...p,delta:null})) : rnd)), 2200);
  }, [curScores, currentRound, isTeams, session.teams, pushToast]);

  const handleEndRound = useCallback(() => {
    const game = session.games[currentRound];
    const rnd  = roundScores[currentRound];
    const isLast = currentRound === session.games.length - 1;
    let winnerName: string, winnerEmoji: string, winnerColor: string;
    if (isTeams && session.teams) {
      const sorted = session.teams.map(t => ({
        team: t,
        total: t.playerIds.reduce((s,pid) => s+(rnd.find(p=>p.id===pid)?.score??0), 0)
      })).sort((a,b)=>b.total-a.total);
      const w = sorted[0]?.team;
      winnerName=w?.name??"Unknown"; winnerEmoji=w?.emoji??"🏆"; winnerColor=w?.color??"#FFE135";
    } else {
      const w = [...rnd].sort((a,b)=>b.score-a.score)[0];
      winnerName=w?.name??"Unknown"; winnerEmoji=w?.emoji??"🏆"; winnerColor=w?.color??"#FFE135";
    }
    const result: RoundResult = { roundIndex: currentRound, game, winnerName, winnerEmoji, winnerColor };
    setRoundResults(prev => [...prev, result]);
    setPendingResult(result);
  }, [currentRound, session.games, session.teams, roundScores, isTeams]);

  const handleConfirmEnd = useCallback(async () => {
    setShowConfirm(false);
    setShowEnd(true);
    setSaving(true);
    try {
      if (session.convexId) {
        // Compute final scores fresh — never rely on stale totalScores closure.
        // This ensures the last round's points are always included.
        const scoreMap = new Map<string, number>();
        session.players.forEach(p => scoreMap.set(p.id, 0));
        roundScores.forEach(rnd => rnd.forEach(p => scoreMap.set(p.id, (scoreMap.get(p.id) ?? 0) + p.score)));
        const freshTotals = assignRanks(
          session.players.map(p => ({ ...p, score: scoreMap.get(p.id) ?? 0, prevRank: 0, rank: 0, delta: null }))
        );

        const freshTeamTotals = hasTeams
          ? buildTeamScores(session.teams!, freshTotals, [])
          : [];

        const winningTeam = hasTeams ? [...freshTeamTotals].sort((a,b) => a.rank - b.rank)[0] : null;

        // Build per-game round winners
        const roundWinners = session.games.map((game, idx) => {
          const scores = roundScores[idx] ?? [];
          const top = [...scores].sort((a, b) => b.score - a.score)[0];
          if (!top) return null;
          return {
            gameIndex: idx,
            gameName:  game.name,
            gameEmoji: game.emoji,
            nickname:  top.name,
            avatar:    top.emoji,
            color:     top.color,
            score:     top.score,
          };
        }).filter(Boolean) as any[];

        await completeSession({
          sessionId: session.convexId as any,
          players: freshTotals.map(p => ({
            userId:   p.id as any,
            nickname: p.name,
            avatar:   p.emoji,
            color:    p.color,
            score:    p.score,
            rank:     p.rank,
          })),
          winningTeam: winningTeam
            ? { name: winningTeam.name, emoji: winningTeam.emoji, color: winningTeam.color, memberNicknames: winningTeam.members.map(m => m.name) }
            : undefined,
          roundWinners: roundWinners.length > 0 ? roundWinners : undefined,
          totalRounds: session.games.length,
        });
      }
    } catch (e) { console.error("Failed to save session:", e); }
    finally { setSaving(false); }
  }, [session, hasTeams, roundScores, completeSession]);

  const handleAdvanceRound = useCallback(() => {
    setPendingResult(null);
    const isLast = currentRound === session.games.length - 1;
    if (isLast) {
      handleConfirmEnd();
    } else {
      setCurrentRound(r => r + 1);
    }
  }, [currentRound, session.games.length, handleConfirmEnd]);

  const handlePlayAgain = () => {
    setRoundScores(session.games.map(() => freshScores(session.players)));
    setRoundResults([]); setCurrentRound(0); setShowEnd(false);
  };

  const curGame  = session.games[currentRound];
  const isLast   = currentRound === session.games.length - 1;
  const curPts   = curScores.reduce((s,p)=>s+p.score, 0);
  const totalPts = totalScores.reduce((s,p)=>s+p.score, 0);
  const leadEmoji = isTeams
    ? [...totalTeamScores].sort((a,b)=>a.rank-b.rank)[0]?.emoji ?? ""
    : [...totalScores].sort((a,b)=>a.rank-b.rank)[0]?.emoji ?? "";

  // Label shown in header/round-pill when mode switches mid-session
  const roundModeLabel = (() => {
    const gt = curGame?.gameType ?? "both";
    if (!hasTeams)          return null;                    // no teams configured — never show
    if (gt === "individual") return "🧍 Individual Round";  // forced individual
    if (gt === "team")       return "🫂 Team Round";        // forced team
    return null;                                            // "both" — no label needed
  })();

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="ls-root">

        {/* ── HEADER ── */}
        <div className="ls-header">
          <div className="ls-header-left">
            <div className="ls-live-badge"><div className="ls-live-dot" /> Live Session</div>
            <div className="ls-session-name">{session.name}</div>
            <div className="ls-session-meta">
              📍 {session.location}
              {hasTeams && " · 🫂 Teams"}
              {roundModeLabel && (
                <span style={{
                  marginLeft: 8, background: isTeams ? "#4ECDC4" : "#FFE135",
                  color: "#1a1a2e", border: "1.5px solid rgba(255,255,255,0.4)",
                  borderRadius: 50, padding: "1px 9px", fontSize: "0.65rem", fontWeight: 800,
                }}>
                  {roundModeLabel}
                </span>
              )}
            </div>
            {isMultiGame && (
              <div className="ls-round-pill">
                <span className="ls-round-pill-game">{curGame.emoji} {curGame.name}</span>
                <span className="ls-round-pill-count">Round {currentRound+1}/{session.games.length}</span>
                <div className="ls-round-dots">
                  {session.games.map((_,i) => (
                    <div key={i} className={`ls-round-dot ${i<currentRound?"done":i===currentRound?"active":"pending"}`} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ls-header-right">
            <div className="ls-header-stats">
              <div className="ls-header-stat">
                <div className="ls-header-stat-num">{isTeams ? teamScores.length : curScores.length}</div>
                <div className="ls-header-stat-label">{isTeams?"Teams":"Players"}</div>
              </div>
              {isMultiGame ? (
                <>
                  <div className="ls-header-stat">
                    <div className="ls-header-stat-num">{curPts}</div>
                    <div className="ls-header-stat-label">Round Pts</div>
                  </div>
                  <div className="ls-header-stat">
                    <div className="ls-header-stat-num">{totalPts}</div>
                    <div className="ls-header-stat-label">Total Pts</div>
                  </div>
                </>
              ) : (
                <div className="ls-header-stat">
                  <div className="ls-header-stat-num">{curPts}</div>
                  <div className="ls-header-stat-label">Total Pts</div>
                </div>
              )}
              {leadEmoji && <div className="ls-header-stat"><div className="ls-header-stat-num">{leadEmoji}</div><div className="ls-header-stat-label">Leading</div></div>}
            </div>

            <div className="ls-header-btns">
              {isMultiGame ? (
                <>
                  <button className="ls-end-round-btn" onClick={handleEndRound}>
                    {isLast ? "🏁 End Last Round" : `✅ End Round ${currentRound+1}`}
                  </button>
                  <button className="ls-end-btn" onClick={() => setShowConfirm(true)}>End Session</button>
                </>
              ) : (
                <button className="ls-end-btn" onClick={() => setShowConfirm(true)}>🏁 End Session</button>
              )}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="ls-body">
          <div>
            {isMultiGame ? (
              <>
                {/* Current round leaderboard */}
                <div className="ls-board-title">
                  {curGame.emoji} Round {currentRound+1} · {curGame.name}
                  <span className="ls-board-title-pill">Current Round</span>
                </div>
                {isTeams
                  ? <TeamLeaderboard teamScores={teamScores} subtitle="Points scored this round" />
                  : <Leaderboard scores={curScores} subtitle="Points scored this round" />
                }

                {/* Completed round chips */}
                {roundResults.length > 0 && (
                  <div className="ls-round-history" style={{ marginTop: 20 }}>
                    {roundResults.map(r => (
                      <div key={r.roundIndex} className="ls-round-chip">
                        <span>{r.game.emoji}</span>
                        <span>{r.game.name}</span>
                        <span className="ls-round-chip-winner">{r.winnerEmoji} {r.winnerName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Overall standings */}
                <div className="ls-board-title" style={{ marginTop: 24 }}>
                  🏆 Overall Standings
                  <span className="ls-board-title-pill">All Rounds</span>
                </div>
                {isTeams
                  ? <TeamLeaderboard teamScores={totalTeamScores} subtitle="Cumulative across all rounds" />
                  : <Leaderboard scores={totalScores} subtitle="Cumulative across all rounds" />
                }
              </>
            ) : (
              <>
                <div className="ls-board-title">
                  🏆 Leaderboard
                  <span className="ls-board-title-pill">{isTeams?`${teamScores.length} teams`:`${curScores.length} players`}</span>
                </div>
                {isTeams
                  ? <TeamLeaderboard teamScores={teamScores} />
                  : <Leaderboard scores={curScores} />
                }
              </>
            )}
          </div>

          <div>
            <div className="ls-panel-title">🎯 Add Points</div>
            {isTeams
              ? <TeamPointsPanel teamScores={teamScores} onAdd={handleAddPoints} />
              : <IndividualPointsPanel scores={curScores} onAdd={handleAddPoints} />
            }
          </div>
        </div>

        <ToastStack toasts={toasts} />

        {/* ── ROUND END MODAL ── */}
        {pendingResult && (
          <RoundEndModal
            result={pendingResult}
            roundScores={roundScores[pendingResult.roundIndex]}
            teams={session.teams}
            isTeams={getRoundIsTeams(pendingResult.roundIndex)}
            nextGame={session.games[currentRound + 1]}
            isLast={isLast}
            onNext={handleAdvanceRound}
          />
        )}

        {/* ── CONFIRM END SESSION ── */}
        {showConfirm && (
          <div className="ls-overlay-bg z-600">
            <div className="ls-confirm-card">
              <div style={{ fontSize:"2.8rem", marginBottom:10 }}>🏁</div>
              <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.5rem", marginBottom:8 }}>End the session?</div>
              <div style={{ fontSize:"0.82rem", fontWeight:700, opacity:0.45, marginBottom:22 }}>
                {isMultiGame && currentRound < session.games.length - 1
                  ? `You're on round ${currentRound+1} of ${session.games.length}. Scores so far will be saved.`
                  : "Scores will be saved and final standings shown."}
              </div>
              <div className="ls-confirm-actions">
                <button className="ls-confirm-btn" style={{ background:"#eee" }} onClick={() => setShowConfirm(false)}>Keep Playing</button>
                <button className="ls-confirm-btn" style={{ background:"#FF6B6B", color:"white" }} onClick={handleConfirmEnd}>End It 🏁</button>
              </div>
            </div>
          </div>
        )}

        {/* ── END SCREEN ── */}
        {showEnd && (
          <EndScreen
            scores={totalScores} teamScores={totalTeamScores} isTeams={hasTeams}
            sessionName={session.name} roundResults={roundResults} saving={saving}
            onPlayAgain={handlePlayAgain} onHome={() => router.push("/sessions")}
          />
        )}
      </div>
    </>
  );
}