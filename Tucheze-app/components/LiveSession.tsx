"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface PlayerScore extends Player {
  score: number;
  prevRank: number;
  rank: number;
  delta: number | null;
}

interface Game { name: string; emoji: string }

interface SessionData {
  // If coming from Convex the session already has an _id
  convexId?: string;
  name: string;
  location: string;
  players: Player[];
  games: Game[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const RANK_COLORS = ["#FFB800","#C0C0C0","#CD7F32","#4ECDC4","#FF9ECD","#C8F135","#A8DAFF","#FFE135"];
const RANK_BG     = ["#fffbea","#f5f5f5","#fdf6ee","#f0fdfb","#fff0f8","#f8ffe0","#f0f8ff","#fffde0"];

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --navy: #1a1a2e; --coral: #FF6B6B; --yellow: #FFE135;
    --mint: #4ECDC4; --lime: #C8F135; --white: #FFFDF5;
    --border: 3px solid #1a1a2e;
    --shadow: 4px 4px 0 #1a1a2e;
    --shadow-lg: 6px 6px 0 #1a1a2e;
  }
  .ls-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh; color: var(--navy);
  }

  /* ── HEADER ── */
  .ls-header {
    background: var(--navy); border-bottom: var(--border);
    padding: 20px 40px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 20px; flex-wrap: wrap; position: relative; overflow: hidden;
  }
  .ls-header::before {
    content:''; position:absolute; inset:0;
    background-image: radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px);
    background-size:24px 24px; pointer-events:none;
  }
  .ls-header-left { position:relative; z-index:1; }
  .ls-live-badge {
    display:inline-flex; align-items:center; gap:6px;
    background:var(--coral); color:white;
    border:2px solid white; border-radius:50px;
    padding:3px 12px; font-size:0.7rem; font-weight:800;
    letter-spacing:1px; text-transform:uppercase; margin-bottom:8px;
    animation: pulseBadge 2s ease-in-out infinite;
  }
  @keyframes pulseBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
  .ls-live-dot { width:7px; height:7px; border-radius:50%; background:white; animation:blinkDot 1s infinite; }
  @keyframes blinkDot { 0%,100%{opacity:1} 50%{opacity:0.2} }
  .ls-session-name { font-family:'Fredoka One',cursive; font-size:1.8rem; color:white; line-height:1.1; }
  .ls-session-meta { font-size:0.8rem; font-weight:700; color:rgba(255,255,255,0.45); margin-top:4px; }
  .ls-header-stats { display:flex; gap:14px; position:relative; z-index:1; flex-wrap:wrap; }
  .ls-header-stat {
    background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.15);
    border-radius:14px; padding:10px 18px; text-align:center;
  }
  .ls-header-stat-num { font-family:'Fredoka One',cursive; font-size:1.3rem; color:var(--yellow); }
  .ls-header-stat-label { font-size:0.65rem; font-weight:800; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.5px; }
  .ls-end-btn {
    font-family:'Nunito',sans-serif; font-weight:800; font-size:0.85rem;
    padding:10px 20px; border:2.5px solid rgba(255,255,255,0.3); border-radius:50px;
    background:transparent; color:rgba(255,255,255,0.6);
    cursor:pointer; transition:all .15s; position:relative; z-index:1;
  }
  .ls-end-btn:hover { border-color:var(--coral); color:var(--coral); }

  /* ── BODY ── */
  .ls-body {
    max-width:900px; margin:0 auto;
    padding:40px 24px 80px;
    display:grid; grid-template-columns:1fr 340px;
    gap:28px; align-items:start;
  }

  /* ── LEADERBOARD ── */
  .ls-board-title {
    font-family:'Fredoka One',cursive; font-size:1.4rem;
    margin-bottom:16px; display:flex; align-items:center; gap:10px;
  }
  .ls-board-title-pill {
    font-size:0.7rem; font-weight:800; background:var(--yellow);
    border:2px solid var(--navy); border-radius:50px;
    padding:2px 10px; box-shadow:2px 2px 0 var(--navy);
  }
  .ls-board { position:relative; min-height:60px; }
  .ls-player-row {
    position:absolute; left:0; right:0;
    transition: top 0.55s cubic-bezier(0.34,1.56,0.64,1);
    height:72px;
  }
  .ls-player-card {
    display:flex; align-items:center; gap:14px;
    border:3px solid var(--navy); border-radius:18px;
    padding:10px 16px; box-shadow:var(--shadow);
    transition:box-shadow .15s, transform .15s;
    height:100%;
  }
  .ls-player-card:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-rank-badge { font-family:'Fredoka One',cursive; font-size:1.3rem; width:40px; text-align:center; flex-shrink:0; }
  .ls-player-avatar {
    width:42px; height:42px; border-radius:50%;
    border:2.5px solid var(--navy); display:flex;
    align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0;
  }
  .ls-player-name { font-family:'Fredoka One',cursive; font-size:1.05rem; flex:1; }
  .ls-player-score { font-family:'Fredoka One',cursive; font-size:1.5rem; color:var(--navy); }
  .ls-score-delta {
    font-family:'Fredoka One',cursive; font-size:0.85rem;
    color:var(--mint); min-width:36px; text-align:right;
    animation: deltaFade 2s ease forwards;
  }
  @keyframes deltaFade {
    0%   { opacity:1; transform:translateY(0); }
    70%  { opacity:1; transform:translateY(-6px); }
    100% { opacity:0; transform:translateY(-12px); }
  }
  .ls-rank-up {
    font-size:0.7rem; color:var(--mint); font-weight:800;
    animation:rankPop .4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes rankPop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }

  /* ── PANEL ── */
  .ls-panel-title { font-family:'Fredoka One',cursive; font-size:1.4rem; margin-bottom:16px; display:flex; align-items:center; gap:10px; }
  .ls-panel-card { border:var(--border); border-radius:20px; box-shadow:var(--shadow-lg); background:white; overflow:hidden; }
  .ls-panel-head { background:var(--navy); padding:14px 18px; font-family:'Fredoka One',cursive; font-size:1rem; color:white; display:flex; align-items:center; gap:8px; }

  /* multi-select hint */
  .ls-multi-hint { font-size:0.7rem; font-weight:800; color:rgba(255,255,255,0.4); margin-left:auto; }

  .ls-player-select-list { padding:14px; display:flex; flex-direction:column; gap:8px; max-height:300px; overflow-y:auto; }
  .ls-select-btn {
    display:flex; align-items:center; gap:10px;
    width:100%; padding:10px 12px;
    border:2.5px solid var(--navy); border-radius:14px;
    background:white; cursor:pointer;
    transition:all .12s; font-family:'Nunito',sans-serif;
    box-shadow:3px 3px 0 var(--navy);
  }
  .ls-select-btn:hover { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--navy); }
  .ls-select-btn.selected { background:var(--navy); color:white; box-shadow:2px 2px 0 rgba(0,0,0,0.3); }
  .ls-select-btn-avatar {
    width:30px; height:30px; border-radius:50%;
    border:2px solid currentColor; display:flex;
    align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;
  }
  .ls-select-btn-name { font-weight:800; font-size:0.88rem; flex:1; text-align:left; }
  .ls-select-btn-score { font-family:'Fredoka One',cursive; font-size:0.95rem; }

  /* selected count chip */
  .ls-selected-chip {
    margin:0 14px 10px; padding:6px 12px;
    background:var(--yellow); border:2px solid var(--navy); border-radius:50px;
    font-size:0.75rem; font-weight:800; box-shadow:2px 2px 0 var(--navy);
    display:flex; align-items:center; justify-content:space-between;
  }
  .ls-deselect-all { background:none; border:none; cursor:pointer; font-size:0.75rem; font-weight:800; color:var(--navy); opacity:0.6; }
  .ls-deselect-all:hover { opacity:1; }

  .ls-points-section { padding:14px; border-top:2.5px solid #eee; }
  .ls-points-label { font-size:0.72rem; font-weight:800; opacity:0.45; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .ls-quick-pts { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
  .ls-quick-btn {
    font-family:'Fredoka One',cursive; font-size:0.95rem;
    padding:8px 14px; border:2.5px solid var(--navy); border-radius:12px;
    background:white; cursor:pointer;
    box-shadow:3px 3px 0 var(--navy); transition:all .12s;
  }
  .ls-quick-btn:hover:not(:disabled) { transform:translate(-1px,-1px); box-shadow:4px 4px 0 var(--navy); background:var(--yellow); }
  .ls-quick-btn:disabled { opacity:0.35; cursor:not-allowed; }
  .ls-custom-row { display:flex; gap:8px; align-items:center; }
  .ls-custom-input {
    flex:1; font-family:'Fredoka One',cursive; font-size:1.1rem;
    padding:10px 14px; border:2.5px solid var(--navy); border-radius:12px;
    background:white; color:var(--navy); outline:none;
    box-shadow:3px 3px 0 var(--navy); transition:box-shadow .15s; text-align:center;
  }
  .ls-custom-input:focus { box-shadow:5px 5px 0 var(--navy); }
  .ls-add-btn {
    font-family:'Fredoka One',cursive; font-size:1rem;
    padding:10px 20px; border:var(--border); border-radius:12px;
    background:var(--coral); color:white; cursor:pointer;
    box-shadow:var(--shadow); transition:all .12s;
    display:flex; align-items:center; gap:6px;
  }
  .ls-add-btn:hover:not(:disabled) { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }
  .ls-add-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .ls-deduct-row { display:flex; align-items:center; gap:8px; margin-top:10px; }
  .ls-deduct-btn {
    font-family:'Nunito',sans-serif; font-weight:800; font-size:0.78rem;
    padding:7px 14px; border:2px solid var(--navy); border-radius:10px;
    background:white; cursor:pointer;
    box-shadow:2px 2px 0 var(--navy); transition:all .12s; flex:1;
  }
  .ls-deduct-btn:hover:not(:disabled) { background:#fff0f0; border-color:var(--coral); color:var(--coral); transform:translate(-1px,-1px); }
  .ls-deduct-btn:disabled { opacity:0.35; cursor:not-allowed; }

  /* ── TOAST ── */
  .ls-toast-wrap {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    z-index:999; pointer-events:none;
    display:flex; flex-direction:column-reverse; gap:8px; align-items:center;
  }
  .ls-toast {
    font-family:'Fredoka One',cursive; font-size:1rem;
    background:var(--navy); color:white;
    border:2.5px solid var(--navy); border-radius:50px;
    padding:10px 24px; box-shadow:var(--shadow-lg);
    animation: toastIn .35s cubic-bezier(0.34,1.56,0.64,1) forwards,
               toastOut .3s ease 2.5s forwards;
    white-space:nowrap;
  }
  @keyframes toastIn  { from{opacity:0;transform:translateY(16px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes toastOut { from{opacity:1} to{opacity:0;transform:translateY(-8px)} }

  /* ── END SCREEN ── */
  .ls-end-overlay {
    position:fixed; inset:0; background:rgba(26,26,46,0.85);
    z-index:500; display:flex; align-items:center; justify-content:center;
    animation:fadeIn .3s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .ls-end-card {
    background:var(--white); border:var(--border); border-radius:28px;
    box-shadow:0 20px 60px rgba(0,0,0,0.3);
    padding:48px 40px; max-width:520px; width:90%;
    text-align:center;
    animation:popIn .4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
  .ls-end-trophy { font-size:5rem; margin-bottom:12px; animation:wobble 2s ease-in-out infinite; }
  @keyframes wobble { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
  .ls-end-title { font-family:'Fredoka One',cursive; font-size:2.4rem; margin-bottom:6px; }
  .ls-end-sub { font-size:0.9rem; font-weight:700; opacity:0.45; margin-bottom:32px; }
  .ls-end-podium { display:flex; justify-content:center; align-items:flex-end; gap:12px; margin-bottom:32px; }
  .ls-podium-place { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .ls-podium-avatar {
    width:52px; height:52px; border-radius:50%;
    border:3px solid var(--navy); display:flex;
    align-items:center; justify-content:center; font-size:1.6rem; box-shadow:var(--shadow);
  }
  .ls-podium-name  { font-weight:800; font-size:0.82rem; }
  .ls-podium-score { font-family:'Fredoka One',cursive; font-size:1.1rem; color:var(--coral); }
  .ls-podium-block {
    border:var(--border); border-radius:10px 10px 0 0;
    display:flex; align-items:center; justify-content:center;
    font-family:'Fredoka One',cursive; font-size:1.4rem; box-shadow:var(--shadow);
  }
  .ls-end-actions { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .ls-end-action-btn {
    font-family:'Fredoka One',cursive; font-size:1rem;
    padding:12px 28px; border:var(--border); border-radius:50px;
    cursor:pointer; box-shadow:var(--shadow); transition:transform .1s, box-shadow .1s;
  }
  .ls-end-action-btn:hover { transform:translate(-2px,-2px); box-shadow:var(--shadow-lg); }

  /* ── CONFIRM END ── */
  .ls-confirm-overlay {
    position:fixed; inset:0; background:rgba(26,26,46,0.7);
    z-index:600; display:flex; align-items:center; justify-content:center;
  }
  .ls-confirm-card {
    background:white; border:var(--border); border-radius:24px;
    padding:36px 32px; max-width:380px; width:90%;
    box-shadow:var(--shadow-lg); text-align:center;
    animation:popIn .3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .ls-confirm-icon  { font-size:3rem; margin-bottom:12px; }
  .ls-confirm-title { font-family:'Fredoka One',cursive; font-size:1.6rem; margin-bottom:8px; }
  .ls-confirm-sub   { font-size:0.85rem; font-weight:700; opacity:0.45; margin-bottom:24px; }
  .ls-confirm-actions { display:flex; gap:10px; justify-content:center; }
  .ls-confirm-btn {
    font-family:'Fredoka One',cursive; font-size:0.95rem;
    padding:11px 24px; border:var(--border); border-radius:50px;
    cursor:pointer; box-shadow:var(--shadow); transition:transform .1s, box-shadow .1s;
  }
  .ls-confirm-btn:hover { transform:translate(-1px,-1px); box-shadow:var(--shadow-lg); }

  .ls-saving-indicator {
    font-size:0.78rem; font-weight:800; opacity:0.5;
    display:flex; align-items:center; gap:6px; justify-content:center; margin-top:12px;
  }
  .ls-saving-spinner {
    width:14px; height:14px; border:2px solid rgba(26,26,46,0.2);
    border-top-color:var(--coral); border-radius:50%;
    animation:spin .7s linear infinite;
  }
  @keyframes spin { to{transform:rotate(360deg)} }

  @media (max-width: 768px) {
    .ls-header { padding:16px 20px; }
    .ls-body { grid-template-columns:1fr; padding:24px 16px 80px; gap:20px; }
    .ls-header-stats { gap:8px; }
    .ls-session-name { font-size:1.4rem; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rankMedal(rank: number): string {
  return ["🥇","🥈","🥉"][rank - 1] ?? `${rank}`;
}

function assignRanks(scores: PlayerScore[]): PlayerScore[] {
  return [...scores]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string }

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="ls-toast-wrap">
      {toasts.map((t) => <div key={t.id} className="ls-toast">{t.msg}</div>)}
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

const ROW_H = 80;

function Leaderboard({ scores }: { scores: PlayerScore[] }) {
  const sorted = [...scores].sort((a, b) => a.rank - b.rank);
  return (
    <div className="ls-board" style={{ height: sorted.length * ROW_H }}>
      {sorted.map((p) => {
        const top       = (p.rank - 1) * ROW_H;
        const bg        = RANK_BG[(p.rank - 1) % RANK_BG.length];
        const rankColor = RANK_COLORS[(p.rank - 1) % RANK_COLORS.length];
        return (
          <div key={p.id} className="ls-player-row" style={{ top }}>
            <div className="ls-player-card" style={{ background: bg }}>
              <div className="ls-rank-badge" style={{ color: rankColor }}>
                {rankMedal(p.rank)}
              </div>
              <div className="ls-player-avatar" style={{ background: p.color }}>
                {p.emoji}
              </div>
              <div className="ls-player-name" style={{ flex: 1 }}>
                {p.name}
                {p.prevRank > p.rank && p.prevRank !== 0 && (
                  <span className="ls-rank-up"> ↑{p.prevRank - p.rank}</span>
                )}
              </div>
              {p.delta !== null && (
                <span key={`${p.id}-${p.score}`} className="ls-score-delta">
                  {p.delta > 0 ? "+" : ""}{p.delta}
                </span>
              )}
              <div className="ls-player-score">{p.score}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Points Panel (multi-select) ─────────────────────────────────────────

const QUICK_PTS = [1, 2, 3, 5, 10];

function AddPointsPanel({ scores, onAdd }: {
  scores: PlayerScore[];
  onAdd: (playerIds: string[], pts: number) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [custom, setCustom]           = useState("");

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasSelection = selectedIds.size > 0;

  const award = (pts: number) => {
    if (!hasSelection || pts === 0) return;
    onAdd([...selectedIds], pts);
    setCustom("");
  };

  const deduct = () => {
    if (!hasSelection) return;
    const pts = parseInt(custom) || 1;
    onAdd([...selectedIds], -pts);
    setCustom("");
  };

  const sorted = [...scores].sort((a, b) => a.rank - b.rank);

  return (
    <div className="ls-panel-card">
      <div className="ls-panel-head">
        🎯 Award Points
        <span className="ls-multi-hint">tap to multi-select</span>
      </div>

      {/* Selected count chip */}
      {selectedIds.size > 0 && (
        <div className="ls-selected-chip">
          <span>{selectedIds.size} player{selectedIds.size > 1 ? "s" : ""} selected</span>
          <button className="ls-deselect-all" onClick={() => setSelectedIds(new Set())}>
            ✕ Clear
          </button>
        </div>
      )}

      {/* Player list */}
      <div className="ls-player-select-list">
        {sorted.map((p) => {
          const isSelected = selectedIds.has(p.id);
          return (
            <button
              key={p.id}
              className={`ls-select-btn${isSelected ? " selected" : ""}`}
              onClick={() => toggle(p.id)}
            >
              <div
                className="ls-select-btn-avatar"
                style={{ background: isSelected ? "rgba(255,255,255,0.2)" : p.color }}
              >
                {p.emoji}
              </div>
              <span className="ls-select-btn-name">{p.name}</span>
              <span className="ls-select-btn-score">{p.score}pts</span>
            </button>
          );
        })}
      </div>

      {/* Points controls */}
      <div className="ls-points-section">
        <div className="ls-points-label">Quick Add</div>
        <div className="ls-quick-pts">
          {QUICK_PTS.map((pts) => (
            <button
              key={pts}
              className="ls-quick-btn"
              onClick={() => award(pts)}
              disabled={!hasSelection}
            >
              +{pts}
            </button>
          ))}
        </div>

        <div className="ls-points-label">Custom</div>
        <div className="ls-custom-row">
          <input
            className="ls-custom-input"
            type="number"
            min={1}
            placeholder="pts"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && award(parseInt(custom) || 0)}
          />
          <button
            className="ls-add-btn"
            disabled={!hasSelection || !custom}
            onClick={() => award(parseInt(custom) || 0)}
          >
            ＋ Add
          </button>
        </div>
        <div className="ls-deduct-row">
          <button
            className="ls-deduct-btn"
            disabled={!hasSelection}
            onClick={deduct}
          >
            − Deduct {custom || "1"} pt{(!custom || custom === "1") ? "" : "s"}
            {selectedIds.size > 1 ? ` each` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── End Screen ───────────────────────────────────────────────────────────────

function EndScreen({ scores, sessionName, saving, onPlayAgain, onHome }: {
  scores: PlayerScore[];
  sessionName: string;
  saving: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const ranked        = [...scores].sort((a, b) => a.rank - b.rank);
  const [first, second, third] = ranked;
  const podiumOrder   = [second, first, third].filter(Boolean);
  const podiumHeights = [80, 110, 60];
  const podiumMedals  = ["🥈","🥇","🥉"];
  const podiumColors  = [RANK_COLORS[1], RANK_COLORS[0], RANK_COLORS[2]];

  return (
    <div className="ls-end-overlay">
      <div className="ls-end-card">
        <div className="ls-end-trophy">🏆</div>
        <div className="ls-end-title">Game Over!</div>
        <div className="ls-end-sub">{sessionName} · Final Scores</div>

        <div className="ls-end-podium">
          {podiumOrder.map((p, i) => p && (
            <div key={p.id} className="ls-podium-place">
              <div className="ls-podium-avatar" style={{ background: p.color }}>{p.emoji}</div>
              <div className="ls-podium-name">{p.name}</div>
              <div className="ls-podium-score">{p.score}pts</div>
              <div className="ls-podium-block"
                style={{ width: 72, height: podiumHeights[i], background: podiumColors[i] }}>
                {podiumMedals[i]}
              </div>
            </div>
          ))}
        </div>

        {saving && (
          <div className="ls-saving-indicator">
            <div className="ls-saving-spinner" /> Saving to history…
          </div>
        )}

        <div className="ls-end-actions" style={{ marginTop: saving ? 12 : 0 }}>
          <button className="ls-end-action-btn" style={{ background: "#C8F135" }} onClick={onPlayAgain}>
            🔄 Play Again
          </button>
          <button className="ls-end-action-btn" style={{ background: "#FF6B6B", color: "white" }} onClick={onHome}>
            🏠 Back Home
          </button>
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
    { id: "1", name: "Wanjiku", emoji: "😎", color: "#FF6B6B" },
    { id: "2", name: "Otieno",  emoji: "🤠", color: "#4ECDC4" },
    { id: "3", name: "Amara",   emoji: "🦁", color: "#FFE135" },
    { id: "4", name: "Njoro",   emoji: "🐉", color: "#FF9ECD" },
  ],
  games: [{ name: "Exploding Kittens", emoji: "🐱" }],
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveSession({ sessionData }: { sessionData?: SessionData }) {
  const router      = useRouter();
  const session     = sessionData ?? DEMO_SESSION;
  const completeSession = useMutation(api.sessions.complete);

  const [scores, setScores] = useState<PlayerScore[]>(() =>
    session.players.map((p) => ({ ...p, score: 0, prevRank: 0, rank: 0, delta: null }))
  );
  const [toasts,      setToasts]      = useState<Toast[]>([]);
  const [showEnd,     setShowEnd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const toastId   = useRef(0);
  // Track if we already fired a toast for a given score change
  const lastToast = useRef<string>("");

  useEffect(() => {
    setScores((prev) => assignRanks(prev.map((p) => ({ ...p, prevRank: 0 }))));
  }, []);

  // ── Single push-toast helper (called OUTSIDE setScores to avoid StrictMode double-call) ──
  const pushToast = useCallback((msg: string) => {
    // Deduplicate: ignore if identical to last toast within 100ms
    if (msg === lastToast.current) return;
    lastToast.current = msg;
    setTimeout(() => { lastToast.current = ""; }, 100);

    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  // ── Add points to one or many players ────────────────────────────────────
  const handleAddPoints = useCallback((playerIds: string[], pts: number) => {
    // Capture names/emojis BEFORE the state update for the toast
    const targets = scores.filter((p) => playerIds.includes(p.id));

    setScores((prev) => {
      const withPrev  = prev.map((p) => ({ ...p, prevRank: p.rank }));
      const updated   = withPrev.map((p) =>
        playerIds.includes(p.id)
          ? { ...p, score: Math.max(0, p.score + pts), delta: pts }
          : { ...p, delta: null }
      );
      return assignRanks(updated);
    });

    // Toast — fired once, outside setScores
    if (targets.length === 1) {
      const p    = targets[0];
      const sign = pts >= 0 ? "+" : "";
      pushToast(`${p.emoji} ${p.name} ${sign}${pts}pts`);
    } else if (targets.length > 1) {
      const sign = pts >= 0 ? "+" : "";
      pushToast(`${targets.map((p) => p.emoji).join("")} ${sign}${pts}pts each`);
    }

    // Clear deltas after animation
    setTimeout(() => setScores((prev) => prev.map((p) => ({ ...p, delta: null }))), 2200);
  }, [scores, pushToast]);

  // ── End session: save to Convex then show end screen ─────────────────────
  const confirmEnd = useCallback(async () => {
    setShowConfirm(false);
    setShowEnd(true);
    setSaving(true);

    try {
      if (session.convexId) {
        await completeSession({
          sessionId: session.convexId as any,
          players: scores.map((p) => ({
            userId:   p.id as any,
            nickname: p.name,
            avatar:   p.emoji,
            color:    p.color,
            score:    p.score,
            rank:     p.rank,
          })),
        });
      } else {
        // No convexId: session was launched without being saved first.
        // This is fine — scores are shown locally.
        console.info("Session not saved to Convex (no convexId). Wire NewSession to api.sessions.create to persist.");
      }
    } catch (e) {
      console.error("Failed to save session:", e);
    } finally {
      setSaving(false);
    }
  }, [session, scores, completeSession]);

  const handlePlayAgain = () => {
    setScores(assignRanks(session.players.map((p) => ({ ...p, score: 0, prevRank: 0, rank: 0, delta: null }))));
    setShowEnd(false);
  };

  const totalPoints = scores.reduce((s, p) => s + p.score, 0);
  const leader      = [...scores].sort((a, b) => a.rank - b.rank)[0];

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="ls-root">

        {/* HEADER */}
        <div className="ls-header">
          <div className="ls-header-left">
            <div className="ls-live-badge">
              <div className="ls-live-dot" /> Live Session
            </div>
            <div className="ls-session-name">{session.name}</div>
            <div className="ls-session-meta">
              📍 {session.location} &nbsp;·&nbsp;
              🎲 {session.games.map((g) => `${g.emoji} ${g.name}`).join(", ")}
            </div>
          </div>

          <div className="ls-header-stats">
            <div className="ls-header-stat">
              <div className="ls-header-stat-num">{scores.length}</div>
              <div className="ls-header-stat-label">Players</div>
            </div>
            <div className="ls-header-stat">
              <div className="ls-header-stat-num">{totalPoints}</div>
              <div className="ls-header-stat-label">Total Pts</div>
            </div>
            {leader && (
              <div className="ls-header-stat">
                <div className="ls-header-stat-num">{leader.emoji}</div>
                <div className="ls-header-stat-label">Leading</div>
              </div>
            )}
          </div>

          <button className="ls-end-btn" onClick={() => setShowConfirm(true)}>
            🏁 End Session
          </button>
        </div>

        {/* BODY */}
        <div className="ls-body">
          <div className="ls-board-wrap">
            <div className="ls-board-title">
              🏆 Leaderboard
              <span className="ls-board-title-pill">{scores.length} players</span>
            </div>
            <Leaderboard scores={scores} />
          </div>

          <div className="ls-panel">
            <div className="ls-panel-title">🎯 Add Points</div>
            <AddPointsPanel scores={scores} onAdd={handleAddPoints} />
          </div>
        </div>

        <ToastStack toasts={toasts} />

        {/* CONFIRM */}
        {showConfirm && (
          <div className="ls-confirm-overlay">
            <div className="ls-confirm-card">
              <div className="ls-confirm-icon">🏁</div>
              <div className="ls-confirm-title">End the session?</div>
              <div className="ls-confirm-sub">Scores will be saved and final standings shown.</div>
              <div className="ls-confirm-actions">
                <button className="ls-confirm-btn" style={{ background: "#eee" }}
                  onClick={() => setShowConfirm(false)}>
                  Keep Playing
                </button>
                <button className="ls-confirm-btn" style={{ background: "#FF6B6B", color: "white" }}
                  onClick={confirmEnd}>
                  End It 🏁
                </button>
              </div>
            </div>
          </div>
        )}

        {/* END SCREEN */}
        {showEnd && (
          <EndScreen
            scores={scores}
            sessionName={session.name}
            saving={saving}
            onPlayAgain={handlePlayAgain}
            onHome={() => router.push("/sessions")}
          />
        )}
      </div>
    </>
  );
}