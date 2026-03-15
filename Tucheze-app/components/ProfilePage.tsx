"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Navbar from "@/components/Navbar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  _id: string;
  nickname?: string;
  avatar?: string;
  color?: string;
  elo?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
  badge?: string;
  playStyle?: string[];
}

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
  name: string;
  date: string;
  location: string;
  status: string;
  games: { name: string; emoji: string }[];
  players: SessionPlayer[];
  winner?: { userId: string; nickname: string; avatar: string; color: string };
  roundWinners?: { gameIndex: number; gameName: string; gameEmoji: string; nickname: string; score: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const AVATAR_OPTIONS = [
  "😎","🤠","🦁","🐉","🌟","🦊","🐬","🦅","🐼","🦋","🐸","🦄",
  "🧠","👻","🤖","🦸","🐯","🐺","🦝","🎭","🧙","⚡",
];

const PLAY_STYLES = [
  { label: "Strategist",   emoji: "♟️" },
  { label: "Party Animal", emoji: "🎉" },
  { label: "Speedrunner",  emoji: "⚡" },
  { label: "Wildcard",     emoji: "🎲" },
  { label: "Trash Talker", emoji: "🗣️" },
  { label: "Silent Pro",   emoji: "🤫" },
];

const COLOR_OPTIONS = [
  "#FF6B6B","#4ECDC4","#FFE135","#C8F135","#FF9ECD",
  "#A8DAFF","#FFB347","#B5EAD7","#CF9FFF","#1a1a2e",
];

const TIER_CONFIG = [
  { min: 1800, label: "Legend",    color: "#FFB800", bg: "#fffbea", icon: "👑" },
  { min: 1600, label: "Elite",     color: "#FF6B6B", bg: "#fff5f5", icon: "🔥" },
  { min: 1400, label: "Veteran",   color: "#4ECDC4", bg: "#f0fdfb", icon: "⚡" },
  { min: 1200, label: "Contender", color: "#FF9ECD", bg: "#fff5f9", icon: "🎯" },
  { min:    0, label: "Rising",    color: "#8aaa00", bg: "#f8ffe0", icon: "🌱" },
];

function getTier(elo: number) {
  return TIER_CONFIG.find(t => elo >= t.min) ?? TIER_CONFIG[TIER_CONFIG.length - 1];
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

  .pf-root {
    font-family: 'Nunito', sans-serif;
    background-color: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh; color: var(--navy);
  }

  /* ── HERO ── */
  .pf-hero {
    background: var(--navy); border-bottom: var(--border);
    padding: 48px 40px 0; position: relative; overflow: hidden;
  }
  .pf-hero-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px; pointer-events: none;
  }
  .pf-hero-glow {
    position: absolute; width: 400px; height: 400px;
    border-radius: 50%; filter: blur(90px); opacity: 0.12; pointer-events: none;
  }
  .pf-hero-inner {
    position: relative; z-index: 1;
    max-width: 1000px; margin: 0 auto;
  }

  /* Avatar + name block */
  .pf-identity {
    display: flex; align-items: flex-end; gap: 28px;
    padding-bottom: 32px; flex-wrap: wrap;
  }
  .pf-avatar-wrap { position: relative; flex-shrink: 0; }
  .pf-avatar {
    width: 100px; height: 100px; border-radius: 50%;
    border: 4px solid white; display: flex; align-items: center;
    justify-content: center; font-size: 3rem;
    box-shadow: 6px 6px 0 rgba(0,0,0,0.3);
  }
  .pf-tier-badge {
    position: absolute; bottom: -2px; right: -2px;
    width: 28px; height: 28px; border-radius: 50%;
    border: 2.5px solid var(--navy); display: flex;
    align-items: center; justify-content: center; font-size: 0.9rem;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  }
  .pf-info { flex: 1; min-width: 0; padding-bottom: 6px; }
  .pf-nickname {
    font-family: 'Fredoka One', cursive; font-size: 2.4rem;
    color: white; line-height: 1; margin-bottom: 6px;
  }
  .pf-badge-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .pf-badge {
    display: inline-flex; align-items: center; gap: 5px;
    border: 2px solid rgba(255,255,255,0.25); border-radius: 50px;
    padding: 3px 12px; font-size: 0.75rem; font-weight: 800;
    color: rgba(255,255,255,0.7);
  }
  .pf-styles { display: flex; gap: 6px; flex-wrap: wrap; }
  .pf-style-chip {
    font-size: 0.7rem; font-weight: 800;
    background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.2);
    border-radius: 50px; padding: 2px 10px; color: rgba(255,255,255,0.65);
  }
  .pf-edit-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
    padding: 9px 20px; border: 2.5px solid rgba(255,255,255,0.3); border-radius: 50px;
    background: rgba(255,255,255,0.08); color: white; cursor: pointer;
    transition: all .15s; display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    align-self: flex-end; margin-bottom: 6px;
  }
  .pf-edit-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.5); }

  /* Stat tabs strip */
  .pf-stat-strip {
    display: flex; gap: 0; border-top: 2px solid rgba(255,255,255,0.1);
    max-width: 1000px; margin: 0 auto;
  }
  .pf-stat-tab {
    flex: 1; padding: 18px 16px; text-align: center; cursor: pointer;
    border-right: 2px solid rgba(255,255,255,0.1); transition: background .15s;
    position: relative;
  }
  .pf-stat-tab:last-child { border-right: none; }
  .pf-stat-tab:hover { background: rgba(255,255,255,0.05); }
  .pf-stat-tab.active { background: rgba(255,255,255,0.08); }
  .pf-stat-tab.active::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: var(--yellow);
  }
  .pf-stat-num { font-family: 'Fredoka One', cursive; font-size: 1.6rem; color: var(--yellow); }
  .pf-stat-lbl { font-size: 0.62rem; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

  /* ── BODY ── */
  .pf-body { max-width: 1000px; margin: 0 auto; padding: 36px 40px 80px; }
  .pf-grid { display: grid; grid-template-columns: 1fr 320px; gap: 28px; align-items: start; }

  /* ── CARDS ── */
  .pf-card {
    background: white; border: var(--border); border-radius: 20px;
    box-shadow: var(--shadow-lg); overflow: hidden; margin-bottom: 20px;
  }
  .pf-card-head {
    background: var(--navy); padding: 12px 18px;
    font-family: 'Fredoka One', cursive; font-size: 0.95rem;
    color: white; display: flex; align-items: center; gap: 8px;
  }
  .pf-card-body { padding: 18px; }

  /* ELO meter */
  .pf-elo-meter { margin-bottom: 10px; }
  .pf-elo-track {
    height: 14px; background: #eee; border: 2.5px solid var(--navy);
    border-radius: 50px; overflow: hidden; margin-bottom: 6px;
  }
  .pf-elo-fill {
    height: 100%; border-radius: 50px;
    transition: width 1s cubic-bezier(.34,1.56,.64,1);
    background: linear-gradient(90deg, #4ECDC4, #FFE135);
  }
  .pf-elo-labels { display: flex; justify-content: space-between; font-size: 0.65rem; font-weight: 800; opacity: 0.4; }
  .pf-elo-big { font-family: 'Fredoka One', cursive; font-size: 2.8rem; color: var(--coral); line-height: 1; }
  .pf-elo-tier { font-size: 0.78rem; font-weight: 800; opacity: 0.5; }
  .pf-elo-next { font-size: 0.72rem; font-weight: 800; opacity: 0.4; margin-top: 4px; }

  /* Win rate ring */
  .pf-winrate-row { display: flex; align-items: center; gap: 16px; }
  .pf-ring-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
  .pf-ring-svg { transform: rotate(-90deg); }
  .pf-ring-bg  { fill: none; stroke: #eee; stroke-width: 8; }
  .pf-ring-fg  { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 1s ease; }
  .pf-ring-label {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Fredoka One', cursive; font-size: 1rem; color: var(--coral);
  }
  .pf-wl-row { display: flex; gap: 10px; margin-top: 10px; }
  .pf-wl-tile {
    flex: 1; border: 2px solid var(--navy); border-radius: 12px;
    padding: 10px; text-align: center; box-shadow: 2px 2px 0 var(--navy);
  }
  .pf-wl-num { font-family: 'Fredoka One', cursive; font-size: 1.3rem; }
  .pf-wl-lbl { font-size: 0.6rem; font-weight: 800; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Session history */
  .pf-sessions { display: flex; flex-direction: column; gap: 10px; }
  .pf-session-row {
    border: 2.5px solid var(--navy); border-radius: 16px;
    padding: 14px 16px; background: white; box-shadow: var(--shadow);
    display: flex; align-items: center; gap: 14px;
    transition: transform .12s, box-shadow .12s; cursor: default;
    animation: rowIn .3s cubic-bezier(.34,1.56,.64,1) both;
  }
  @keyframes rowIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .pf-session-row:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .pf-session-rank {
    width: 36px; height: 36px; border-radius: 50%;
    border: 2.5px solid var(--navy); display: flex; align-items: center;
    justify-content: center; font-family: 'Fredoka One', cursive; font-size: 1rem;
    flex-shrink: 0; box-shadow: 2px 2px 0 var(--navy);
  }
  .pf-session-info { flex: 1; min-width: 0; }
  .pf-session-name { font-family: 'Fredoka One', cursive; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pf-session-meta { font-size: 0.7rem; font-weight: 700; opacity: 0.45; margin-top: 2px; }
  .pf-session-games { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .pf-session-game-chip {
    font-size: 0.65rem; font-weight: 800; background: #f5f5f5;
    border: 1.5px solid rgba(26,26,46,0.15); border-radius: 50px; padding: 1px 8px;
  }
  .pf-session-score { font-family: 'Fredoka One', cursive; font-size: 1.2rem; color: var(--coral); flex-shrink: 0; }

  /* Edit modal */
  .pf-overlay {
    position: fixed; inset: 0; background: rgba(26,26,46,0.75);
    z-index: 500; display: flex; align-items: center; justify-content: center;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .pf-modal {
    background: var(--white); border: var(--border); border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 92%; max-width: 520px;
    max-height: 90vh; overflow-y: auto;
    animation: popIn .35s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes popIn { from{transform:scale(0.85);opacity:0} to{transform:scale(1);opacity:1} }
  .pf-modal-head {
    background: var(--navy); padding: 18px 22px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .pf-modal-title { font-family: 'Fredoka One', cursive; font-size: 1.3rem; color: white; }
  .pf-modal-close {
    width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.2); color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
    transition: background .15s;
  }
  .pf-modal-close:hover { background: var(--coral); border-color: var(--coral); }
  .pf-modal-body { padding: 22px; }
  .pf-field { margin-bottom: 18px; }
  .pf-label { display: block; font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px; margin-bottom: 7px; opacity: 0.6; }
  .pf-input {
    width: 100%; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.92rem;
    padding: 11px 14px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    background: white; outline: none; transition: box-shadow .15s;
    box-shadow: 2px 2px 0 #1a1a2e;
  }
  .pf-input:focus { box-shadow: 4px 4px 0 #1a1a2e; }
  .pf-avatar-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 7px; }
  .pf-avatar-opt {
    aspect-ratio: 1; border-radius: 10px; border: 2.5px solid #e5e5e5;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; cursor: pointer; background: white;
    transition: all .12s;
  }
  .pf-avatar-opt:hover { transform: scale(1.1); border-color: #4ECDC4; }
  .pf-avatar-opt.selected { border-color: #4ECDC4; background: rgba(78,205,196,0.1); box-shadow: 3px 3px 0 #1a1a2e; }
  .pf-color-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .pf-color-swatch {
    width: 34px; height: 34px; border-radius: 50%;
    border: 2.5px solid transparent; cursor: pointer;
    transition: all .12s; box-shadow: 2px 2px 0 rgba(0,0,0,0.15);
  }
  .pf-color-swatch.selected { border-color: #1a1a2e; transform: scale(1.15); box-shadow: 3px 3px 0 #1a1a2e; }
  .pf-style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .pf-style-opt {
    border: 2.5px solid #e5e5e5; border-radius: 12px; padding: 10px 8px;
    text-align: center; cursor: pointer; background: white; transition: all .12s;
  }
  .pf-style-opt:hover { border-color: #4ECDC4; }
  .pf-style-opt.selected { border-color: #4ECDC4; background: rgba(78,205,196,0.08); box-shadow: 3px 3px 0 #1a1a2e; }
  .pf-save-btn {
    width: 100%; font-family: 'Fredoka One', cursive; font-size: 1.1rem;
    padding: 14px; border: var(--border); border-radius: 14px;
    background: var(--mint); color: var(--navy); cursor: pointer;
    box-shadow: var(--shadow); transition: transform .1s, box-shadow .1s; margin-top: 8px;
  }
  .pf-save-btn:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }
  .pf-save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Skeleton */
  .pf-skel {
    background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* Not found */
  .pf-notfound { text-align: center; padding: 100px 40px; }
  .pf-notfound-icon { font-size: 4rem; margin-bottom: 16px; opacity: 0.4; }
  .pf-notfound-title { font-family: 'Fredoka One', cursive; font-size: 1.8rem; margin-bottom: 8px; opacity: 0.5; }

  @media (max-width: 820px) {
    .pf-hero { padding: 32px 20px 0; }
    .pf-body { padding: 24px 16px 60px; }
    .pf-grid { grid-template-columns: 1fr; }
    .pf-stat-strip { overflow-x: auto; }
    .pf-avatar-grid { grid-template-columns: repeat(6, 1fr); }
    .pf-nickname { font-size: 1.8rem; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function rankMedal(rank: number) {
  return ["🥇", "🥈", "🥉"][rank - 1] ?? `#${rank}`;
}

function rankColor(rank: number) {
  return rank === 1 ? "#FFB800" : rank === 2 ? "#999" : rank === 3 ? "#cd7f32" : "#1a1a2e";
}

// ELO progress within current tier (0–100%)
function eloProgress(elo: number) {
  const tiers = [100, 1200, 1400, 1600, 1800, 2200];
  for (let i = tiers.length - 2; i >= 0; i--) {
    if (elo >= tiers[i]) {
      const range = tiers[i + 1] - tiers[i];
      return Math.min(100, Math.round(((elo - tiers[i]) / range) * 100));
    }
  }
  return 0;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const updateProfile = useMutation(api.users.updateProfile);
  const [nickname,  setNickname]  = useState(user.nickname ?? "");
  const [avatar,    setAvatar]    = useState(user.avatar   ?? "😎");
  const [color,     setColor]     = useState(user.color    ?? "#4ECDC4");
  const [styles,    setStyles]    = useState<string[]>(user.playStyle ?? []);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  const toggleStyle = (label: string) =>
    setStyles(prev => prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ nickname: nickname.trim(), avatar, color, playStyle: styles });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={e => e.stopPropagation()}>
        <div className="pf-modal-head">
          <div className="pf-modal-title">✏️ Edit Profile</div>
          <button className="pf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="pf-modal-body">
          {/* Nickname */}
          <div className="pf-field">
            <label className="pf-label">NICKNAME</label>
            <input className="pf-input" value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Your game night name" maxLength={24} />
          </div>

          {/* Avatar */}
          <div className="pf-field">
            <label className="pf-label">AVATAR</label>
            <div className="pf-avatar-grid">
              {AVATAR_OPTIONS.map(av => (
                <div key={av} className={`pf-avatar-opt${avatar === av ? " selected" : ""}`}
                  onClick={() => setAvatar(av)}>
                  {av}
                </div>
              ))}
            </div>
          </div>

          {/* Colour */}
          <div className="pf-field">
            <label className="pf-label">COLOUR</label>
            <div className="pf-color-row">
              {COLOR_OPTIONS.map(c => (
                <div key={c} className={`pf-color-swatch${color === c ? " selected" : ""}`}
                  style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>

          {/* Play styles */}
          <div className="pf-field">
            <label className="pf-label">PLAY STYLE <span style={{ opacity: 0.4, fontWeight: 600 }}>(optional)</span></label>
            <div className="pf-style-grid">
              {PLAY_STYLES.map(ps => (
                <div key={ps.label}
                  className={`pf-style-opt${styles.includes(ps.label) ? " selected" : ""}`}
                  onClick={() => toggleStyle(ps.label)}>
                  <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{ps.emoji}</div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 800, opacity: 0.65 }}>{ps.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="pf-save-btn" disabled={saving || !nickname.trim()} onClick={handleSave}>
            {saved ? "✅ Saved!" : saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Session History Row ──────────────────────────────────────────────────────

function SessionRow({ session, userId, i }: { session: Session; userId: string; i: number }) {
  const playerEntry = session.players.find(p => p.userId === userId);
  if (!playerEntry) return null;

  const rank        = playerEntry.rank;
  const score       = playerEntry.score;
  const isWinner    = session.winner?.userId === userId;
  const roundsWon   = (session.roundWinners ?? []).filter(r => r.nickname === playerEntry.nickname).length;

  return (
    <div className="pf-session-row" style={{ animationDelay: `${i * 0.05}s` }}>
      <div className="pf-session-rank"
        style={{ background: rank <= 3 ? rankColor(rank) + "22" : "#f5f5f5", color: rankColor(rank) }}>
        {rankMedal(rank)}
      </div>
      <div className="pf-session-info">
        <div className="pf-session-name">{session.name}</div>
        <div className="pf-session-meta">
          📍 {session.location} · 📅 {formatDate(session.date)}
          {isWinner && " · 🏆 Winner"}
          {roundsWon > 0 && ` · 🏅 ${roundsWon} round${roundsWon > 1 ? "s" : ""} won`}
        </div>
        {session.games.length > 0 && (
          <div className="pf-session-games">
            {session.games.map((g, gi) => (
              <span key={gi} className="pf-session-game-chip">{g.emoji} {g.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="pf-session-score">{score}pts</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProfilePageProps {
  userId?: string; // if undefined → show own profile
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  const currentUser = useQuery(api.users.currentUser) as UserProfile | null | undefined;

  // Determine whose profile we're viewing
  const isOwnProfile = !userId || (currentUser && userId === currentUser._id);

  // If viewing own profile, use currentUser. Otherwise fetch by ID.
  const otherUser = useQuery(
    api.users.getById,
    !isOwnProfile && userId ? { userId: userId as any } : "skip"
  ) as UserProfile | null | undefined;

  const profile: UserProfile | null | undefined = isOwnProfile ? currentUser : otherUser;

  const sessions = useQuery(
    api.users.sessionsForUser,
    profile?._id ? { userId: profile._id as any } : "skip"
  ) as Session[] | undefined;

  const [showEdit,  setShowEdit]  = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "stats">("history");

  const loading = profile === undefined;

  // Derived stats
  const elo      = profile?.elo     ?? 1000;
  const wins     = profile?.wins    ?? 0;
  const losses   = profile?.losses  ?? 0;
  const winRate  = profile?.winRate ?? 0;
  const total    = wins + losses;
  const tier     = getTier(elo);
  const progress = eloProgress(elo);
  const nextTier = TIER_CONFIG.find(t => t.min > elo);

  // Best finish + avg score from session history
  const { bestFinish, avgScore, podiums } = useMemo(() => {
    if (!sessions || !profile) return { bestFinish: null, avgScore: 0, podiums: 0 };
    const entries = sessions
      .map(s => s.players.find(p => p.userId === profile._id))
      .filter(Boolean) as { rank: number; score: number }[];
    const bestFinish = entries.length > 0 ? Math.min(...entries.map(e => e.rank)) : null;
    const avgScore   = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length) : 0;
    const podiums    = entries.filter(e => e.rank <= 3).length;
    return { bestFinish, avgScore, podiums };
  }, [sessions, profile]);

  // Ring math for win rate
  const circumference = 2 * Math.PI * 30; // r=30
  const offset        = circumference - (winRate / 100) * circumference;

  if (loading) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="pf-root">
          <Navbar />
          <div className="pf-hero">
            <div className="pf-hero-inner">
              <div className="pf-identity">
                <div className="pf-skel" style={{ width: 100, height: 100, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <div className="pf-skel" style={{ width: 200, height: 36, marginBottom: 12 }} />
                  <div className="pf-skel" style={{ width: 120, height: 20 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="pf-root">
          <Navbar />
          <div className="pf-notfound">
            <div className="pf-notfound-icon">👤</div>
            <div className="pf-notfound-title">Player not found</div>
            <Link href="/leaderboard" style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.95rem", color:"#4ECDC4" }}>
              ← Back to Leaderboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="pf-root">
        <Navbar />

        {/* ── HERO ── */}
        <div className="pf-hero">
          <div className="pf-hero-pattern" />
          <div className="pf-hero-glow" style={{ background: profile.color ?? "#4ECDC4", top: -80, right: -60 }} />
          <div className="pf-hero-glow" style={{ background: "#FF6B6B", bottom: -60, left: -80 }} />

          <div className="pf-hero-inner">
            <div className="pf-identity">
              {/* Avatar */}
              <div className="pf-avatar-wrap">
                <div className="pf-avatar" style={{ background: profile.color ?? "#4ECDC4" }}>
                  {profile.avatar ?? "🎲"}
                </div>
                <div className="pf-tier-badge" style={{ background: tier.bg, color: tier.color }}>
                  {tier.icon}
                </div>
              </div>

              {/* Info */}
              <div className="pf-info">
                <div className="pf-nickname">{profile.nickname ?? "Player"}</div>
                <div className="pf-badge-row">
                  <div className="pf-badge">{profile.badge ?? "🌱 Rising"}</div>
                  <div className="pf-badge" style={{ background: tier.bg + "22", borderColor: tier.color + "44", color: tier.color }}>
                    {tier.icon} {tier.label}
                  </div>
                </div>
                {(profile.playStyle ?? []).length > 0 && (
                  <div className="pf-styles">
                    {(profile.playStyle ?? []).map(s => (
                      <span key={s} className="pf-style-chip">
                        {PLAY_STYLES.find(p => p.label === s)?.emoji} {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit button — only on own profile */}
              {isOwnProfile && (
                <button className="pf-edit-btn" onClick={() => setShowEdit(true)}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="pf-stat-strip">
            {[
              { num: elo,                          lbl: "ELO Rating" },
              { num: total,                        lbl: "Sessions" },
              { num: wins,                         lbl: "Podiums 🏅" },
              { num: `${winRate}%`,                lbl: "Win Rate" },
              { num: avgScore || "—",              lbl: "Avg Score" },
              { num: bestFinish ? rankMedal(bestFinish) : "—", lbl: "Best Finish" },
            ].map(({ num, lbl }, i) => (
              <div key={i} className="pf-stat-tab">
                <div className="pf-stat-num">{num}</div>
                <div className="pf-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="pf-body">
          <div className="pf-grid">

            {/* ── LEFT: Session History ── */}
            <div>
              <div className="pf-card">
                <div className="pf-card-head">
                  🕐 Session History
                  <span style={{ marginLeft: "auto", fontSize: "0.72rem", opacity: 0.5 }}>
                    {sessions?.length ?? 0} session{sessions?.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="pf-card-body">
                  {sessions === undefined ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div className="pf-skel" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div className="pf-skel" style={{ width: "60%", height: 14, marginBottom: 8 }} />
                            <div className="pf-skel" style={{ width: "40%", height: 11 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.4 }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🎲</div>
                      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.1rem", marginBottom: 6 }}>
                        No sessions yet
                      </div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                        {isOwnProfile ? "Play your first game night to see your history here." : "This player hasn't played any sessions yet."}
                      </div>
                      {isOwnProfile && (
                        <Link href="/sessions/new"
                          style={{ display: "inline-block", marginTop: 16, fontFamily: "'Fredoka One', cursive", fontSize: "0.9rem", background: "#FF6B6B", color: "white", border: "2.5px solid #1a1a2e", borderRadius: 50, padding: "8px 20px", textDecoration: "none", boxShadow: "3px 3px 0 #1a1a2e" }}>
                          + Start a Session
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="pf-sessions">
                      {sessions.map((s, i) => (
                        <SessionRow key={s._id} session={s} userId={profile._id} i={i} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: Stats sidebar ── */}
            <div>
              {/* ELO Card */}
              <div className="pf-card">
                <div className="pf-card-head" style={{ background: tier.color, color: "#1a1a2e" }}>
                  {tier.icon} ELO Rating
                </div>
                <div className="pf-card-body">
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 14 }}>
                    <div className="pf-elo-big" style={{ color: tier.color }}>{elo}</div>
                    <div className="pf-elo-tier" style={{ paddingBottom: 6 }}>{tier.icon} {tier.label}</div>
                  </div>
                  <div className="pf-elo-meter">
                    <div className="pf-elo-track">
                      <div className="pf-elo-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${tier.color}, #FFE135)` }} />
                    </div>
                    <div className="pf-elo-labels">
                      <span>{tier.min === 0 ? "100" : tier.min}</span>
                      <span>{nextTier ? nextTier.min : "MAX"}</span>
                    </div>
                  </div>
                  {nextTier && (
                    <div className="pf-elo-next">
                      {nextTier.icon} {nextTier.min - elo} ELO to reach <strong>{nextTier.label}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Win Rate Card */}
              <div className="pf-card">
                <div className="pf-card-head">📊 Win Rate</div>
                <div className="pf-card-body">
                  <div className="pf-winrate-row">
                    <div className="pf-ring-wrap">
                      <svg className="pf-ring-svg" viewBox="0 0 80 80" width="80" height="80">
                        <circle className="pf-ring-bg" cx="40" cy="40" r="30" />
                        <circle className="pf-ring-fg" cx="40" cy="40" r="30"
                          stroke="#FF6B6B"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset} />
                      </svg>
                      <div className="pf-ring-label">{winRate}%</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "0.85rem", marginBottom: 4 }}>
                        Podium {wins} of {total} sessions
                      </div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.5, lineHeight: 1.5 }}>
                        Top 3 finish counts as a podium. ELO shifts based on placement vs all players in the session.
                      </div>
                    </div>
                  </div>
                  <div className="pf-wl-row">
                    <div className="pf-wl-tile" style={{ background: "#f0fdfb", borderColor: "#4ECDC4", boxShadow: "2px 2px 0 #4ECDC4" }}>
                      <div className="pf-wl-num" style={{ color: "#4ECDC4" }}>{wins}</div>
                      <div className="pf-wl-lbl">Podiums</div>
                    </div>
                    <div className="pf-wl-tile" style={{ background: "#fff5f5", borderColor: "#FF6B6B", boxShadow: "2px 2px 0 #FF6B6B" }}>
                      <div className="pf-wl-num" style={{ color: "#FF6B6B" }}>{losses}</div>
                      <div className="pf-wl-lbl">Losses</div>
                    </div>
                    <div className="pf-wl-tile">
                      <div className="pf-wl-num">{podiums}</div>
                      <div className="pf-wl-lbl">Top 3s</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="pf-card">
                <div className="pf-card-head">🔗 Quick Links</div>
                <div className="pf-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { href: "/leaderboard",   label: "🏆 Full Leaderboard" },
                    { href: "/sessions",      label: "📅 All Sessions" },
                    { href: "/sessions/new",  label: "🚀 New Session" },
                    { href: "/games",         label: "🎲 Games Library" },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href} style={{
                      display: "flex", alignItems: "center", padding: "10px 14px",
                      border: "2.5px solid #1a1a2e", borderRadius: 12, background: "#FFFDF5",
                      fontWeight: 800, fontSize: "0.85rem", textDecoration: "none", color: "#1a1a2e",
                      boxShadow: "3px 3px 0 #1a1a2e", transition: "all .12s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #1a1a2e"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #1a1a2e"; }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── EDIT MODAL ── */}
        {showEdit && isOwnProfile && profile && (
          <EditModal user={profile} onClose={() => setShowEdit(false)} />
        )}
      </div>
    </>
  );
}