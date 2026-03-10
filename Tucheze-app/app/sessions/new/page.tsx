"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isHost?: boolean;
}

interface Game {
  id: string;
  name: string;
  emoji: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  tags: string[];
}

type SessionMode = "quick" | "tournament";
type Step = 1 | 2 | 3 | 4;

interface SessionForm {
  name: string;
  date: string;
  time: string;
  location: string;
  mode: SessionMode;
  players: Player[];
  games: Game[];
  allowJoinLink: boolean;
  timerEnabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AVAILABLE_PLAYERS: Player[] = [
  { id: "1", name: "Wanjiku", emoji: "😎", color: "#FF6B6B" },
  { id: "2", name: "Otieno",  emoji: "🤠", color: "#4ECDC4" },
  { id: "3", name: "Amara",   emoji: "🦁", color: "#FFE135" },
  { id: "4", name: "Njoro",   emoji: "🐉", color: "#FF9ECD" },
  { id: "5", name: "Zawadi",  emoji: "🌟", color: "#C8F135" },
  { id: "6", name: "Baraka",  emoji: "🦊", color: "#A8DAFF" },
  { id: "7", name: "Zuri",    emoji: "🐬", color: "#FFB347" },
  { id: "8", name: "Tendo",   emoji: "🦅", color: "#B5EAD7" },
];

const GAME_LIBRARY: Game[] = [
  { id: "g1", name: "Exploding Kittens", emoji: "🐱", minPlayers: 2, maxPlayers: 5,  duration: "15–30 min", tags: ["party","quick","silly"] },
  { id: "g2", name: "Catan",             emoji: "🏝️", minPlayers: 3, maxPlayers: 6,  duration: "60–120 min", tags: ["strategy","classic"] },
  { id: "g3", name: "Codenames",         emoji: "🕵️", minPlayers: 4, maxPlayers: 8,  duration: "15–30 min", tags: ["party","teams","words"] },
  { id: "g4", name: "UNO Extreme",       emoji: "🎴", minPlayers: 2, maxPlayers: 10, duration: "20–45 min", tags: ["party","quick","classic"] },
  { id: "g5", name: "Jenga",             emoji: "🪵", minPlayers: 2, maxPlayers: 8,  duration: "10–20 min", tags: ["quick","physical","tense"] },
  { id: "g6", name: "Pandemic",          emoji: "🦠", minPlayers: 2, maxPlayers: 4,  duration: "60–90 min", tags: ["co-op","strategy","serious"] },
];

const STEPS = ["Details", "Players", "Games", "Review"] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .ns-root {
    font-family: 'Nunito', sans-serif;
    background-color: #FFFDF5;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    min-height: 100vh;
    color: #1a1a2e;
  }

  /* ── NAV ── */
  .ns-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px;
    border-bottom: 3px solid #1a1a2e;
    background: #FFFDF5;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    position: sticky; top: 0; z-index: 50;
  }
  .ns-logo {
    font-family: 'Fredoka One', cursive;
    font-size: 1.5rem; color: #FF6B6B;
    text-shadow: 2px 2px 0 #1a1a2e;
    display: flex; align-items: center; gap: 8px;
  }
  .ns-logo-badge {
    background: #FFE135; border: 2.5px solid #1a1a2e;
    border-radius: 50%; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; box-shadow: 2px 2px 0 #1a1a2e;
  }
  .ns-back {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 8px 18px; border: 2.5px solid #1a1a2e; border-radius: 50px;
    cursor: pointer; background: white; box-shadow: 3px 3px 0 #1a1a2e;
    transition: transform .1s, box-shadow .1s;
  }
  .ns-back:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }

  /* ── LAYOUT ── */
  .ns-layout {
    display: grid; grid-template-columns: 280px 1fr;
    max-width: 1100px; margin: 0 auto;
    padding: 40px 24px 80px; gap: 32px;
    align-items: start;
  }

  /* ── SIDEBAR ── */
  .ns-sidebar { position: sticky; top: 90px; }
  .ns-steps {
    border: 3px solid #1a1a2e; border-radius: 20px;
    overflow: hidden; box-shadow: 5px 5px 0 #1a1a2e;
    margin-bottom: 20px;
  }
  .ns-step-item {
    display: flex; align-items: center; gap: 14px;
    padding: 16px 20px; border-bottom: 2px solid #eee;
    cursor: pointer; transition: background .15s;
    background: white;
  }
  .ns-step-item:last-child { border-bottom: none; }
  .ns-step-item.active   { background: #1a1a2e; color: white; }
  .ns-step-item.done     { background: #C8F135; }
  .ns-step-item:hover:not(.active) { background: #f5f5f5; }
  .ns-step-num {
    width: 30px; height: 30px; border-radius: 50%;
    border: 2px solid currentColor;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Fredoka One', cursive; font-size: 0.95rem;
    flex-shrink: 0;
  }
  .ns-step-item.done .ns-step-num { background: #1a1a2e; color: #C8F135; border-color: #1a1a2e; }
  .ns-step-label { font-weight: 800; font-size: 0.9rem; }
  .ns-step-sub   { font-size: 0.72rem; opacity: 0.6; font-weight: 600; }

  /* Preview card */
  .ns-preview {
    border: 3px solid #1a1a2e; border-radius: 20px;
    overflow: hidden; box-shadow: 5px 5px 0 #1a1a2e;
  }
  .ns-preview-head {
    background: #1a1a2e; color: white; padding: 14px 18px;
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    display: flex; align-items: center; gap: 8px;
  }
  .ns-preview-body { padding: 14px 18px; background: white; }
  .ns-preview-row {
    display: flex; align-items: flex-start; gap: 10px;
    margin-bottom: 10px; font-size: 0.8rem; font-weight: 700;
  }
  .ns-preview-row:last-child { margin-bottom: 0; }
  .ns-preview-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
  .ns-preview-val { color: #1a1a2e; }
  .ns-preview-dim { opacity: 0.4; }
  .ns-player-stack { display: flex; margin-top: 4px; }
  .ns-pstack-bubble {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid white; margin-left: -6px;
    display: flex; align-items: center; justify-content: center; font-size: 0.75rem;
  }
  .ns-pstack-bubble:first-child { margin-left: 0; }

  /* ── MAIN ── */
  .ns-main {}
  .ns-step-header {
    margin-bottom: 28px;
  }
  .ns-step-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #FFE135; border: 2.5px solid #1a1a2e; border-radius: 50px;
    padding: 3px 14px; font-size: 0.72rem; font-weight: 800;
    box-shadow: 2px 2px 0 #1a1a2e; margin-bottom: 10px;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .ns-step-title {
    font-family: 'Fredoka One', cursive;
    font-size: 2rem; line-height: 1.1;
  }
  .ns-step-desc { font-size: 0.88rem; font-weight: 700; opacity: 0.5; margin-top: 6px; }

  /* ── FORM ELEMENTS ── */
  .ns-card {
    background: white; border: 3px solid #1a1a2e;
    border-radius: 20px; padding: 24px;
    box-shadow: 5px 5px 0 #1a1a2e; margin-bottom: 20px;
  }
  .ns-card-title {
    font-family: 'Fredoka One', cursive; font-size: 1.1rem;
    margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
  }
  .ns-field { margin-bottom: 18px; }
  .ns-field:last-child { margin-bottom: 0; }
  .ns-label {
    display: block; font-weight: 800; font-size: 0.8rem;
    margin-bottom: 6px; letter-spacing: 0.5px;
  }
  .ns-input {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.9rem;
    padding: 11px 16px; border: 2.5px solid #1a1a2e;
    border-radius: 12px; background: #FFFDF5;
    outline: none; transition: box-shadow .15s, border-color .15s;
    box-shadow: 2px 2px 0 #1a1a2e;
  }
  .ns-input:focus { border-color: #FF6B6B; box-shadow: 3px 3px 0 #FF6B6B; }
  .ns-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  /* mode toggle */
  .ns-mode-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .ns-mode-card {
    border: 3px solid #1a1a2e; border-radius: 16px;
    padding: 18px; cursor: pointer;
    transition: transform .1s, box-shadow .1s, background .15s;
    box-shadow: 3px 3px 0 #1a1a2e;
    background: white;
  }
  .ns-mode-card:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .ns-mode-card.selected { background: #1a1a2e; color: white; }
  .ns-mode-icon { font-size: 2rem; margin-bottom: 6px; }
  .ns-mode-name { font-family: 'Fredoka One', cursive; font-size: 1.1rem; margin-bottom: 4px; }
  .ns-mode-desc { font-size: 0.75rem; font-weight: 700; opacity: 0.65; line-height: 1.4; }

  /* toggle switch */
  .ns-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 0; border-bottom: 2px solid #f0f0f0;
  }
  .ns-toggle-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ns-toggle-left { display: flex; align-items: center; gap: 10px; }
  .ns-toggle-icon { font-size: 1.2rem; }
  .ns-toggle-label { font-weight: 800; font-size: 0.88rem; }
  .ns-toggle-sub { font-size: 0.72rem; font-weight: 600; opacity: 0.5; }
  .ns-switch {
    position: relative; width: 44px; height: 24px;
    background: #ddd; border: 2px solid #1a1a2e;
    border-radius: 50px; cursor: pointer;
    transition: background .2s; flex-shrink: 0;
  }
  .ns-switch.on { background: #4ECDC4; }
  .ns-switch::after {
    content: ''; position: absolute;
    top: 2px; left: 2px;
    width: 16px; height: 16px;
    background: #1a1a2e; border-radius: 50%;
    transition: transform .2s;
  }
  .ns-switch.on::after { transform: translateX(20px); }

  /* player grid */
  .ns-player-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  }
  .ns-player-tile {
    border: 2.5px solid #1a1a2e; border-radius: 16px;
    padding: 14px 10px; text-align: center;
    cursor: pointer; background: white;
    transition: transform .1s, box-shadow .1s, background .15s;
    box-shadow: 3px 3px 0 #1a1a2e; position: relative;
  }
  .ns-player-tile:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .ns-player-tile.selected { border-width: 3px; }
  .ns-player-tile.host-tile { border-color: #FF6B6B; background: #fff5f5; }
  .ns-ptile-emoji { font-size: 1.8rem; margin-bottom: 6px; }
  .ns-ptile-name { font-weight: 800; font-size: 0.78rem; }
  .ns-ptile-check {
    position: absolute; top: -6px; right: -6px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #C8F135; border: 2px solid #1a1a2e;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 900;
  }
  .ns-host-crown {
    position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
    font-size: 1rem;
  }
  .ns-guest-btn {
    border: 2.5px dashed #1a1a2e; border-radius: 16px;
    padding: 14px 10px; text-align: center; cursor: pointer;
    background: transparent; font-family: 'Nunito', sans-serif;
    font-weight: 800; font-size: 0.78rem; color: #1a1a2e;
    transition: background .15s;
  }
  .ns-guest-btn:hover { background: rgba(0,0,0,0.04); }
  .ns-guest-icon { font-size: 1.5rem; margin-bottom: 6px; opacity: 0.4; }
  .ns-selected-count {
    font-size: 0.78rem; font-weight: 800; opacity: 0.5;
    margin-bottom: 14px;
  }

  /* game cards */
  .ns-game-grid { display: flex; flex-direction: column; gap: 10px; }
  .ns-game-row {
    display: flex; align-items: center; gap: 16px;
    border: 2.5px solid #1a1a2e; border-radius: 16px;
    padding: 14px 18px; cursor: pointer; background: white;
    transition: transform .1s, box-shadow .1s, background .15s;
    box-shadow: 3px 3px 0 #1a1a2e;
  }
  .ns-game-row:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .ns-game-row.selected { background: #1a1a2e; color: white; }
  .ns-game-icon {
    width: 48px; height: 48px; border-radius: 12px;
    border: 2px solid currentColor;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; flex-shrink: 0;
  }
  .ns-game-info { flex: 1; }
  .ns-game-name { font-weight: 800; font-size: 0.95rem; margin-bottom: 4px; }
  .ns-game-meta { font-size: 0.75rem; font-weight: 700; opacity: 0.6; display: flex; gap: 12px; }
  .ns-game-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
  .ns-tag {
    font-size: 0.65rem; font-weight: 800; border-radius: 50px;
    padding: 2px 10px; border: 1.5px solid;
  }
  .ns-game-row:not(.selected) .ns-tag { background: #f0f0f0; border-color: #ccc; }
  .ns-game-row.selected .ns-tag { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
  .ns-game-check {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid currentColor;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; flex-shrink: 0;
  }
  .ns-game-row.selected .ns-game-check { background: #C8F135; border-color: #C8F135; color: #1a1a2e; }

  /* Review */
  .ns-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .ns-review-tile {
    border: 3px solid #1a1a2e; border-radius: 18px;
    overflow: hidden; box-shadow: 4px 4px 0 #1a1a2e;
  }
  .ns-review-tile-head {
    padding: 10px 16px; font-family: 'Fredoka One', cursive;
    font-size: 0.95rem; border-bottom: 2.5px solid #1a1a2e;
    display: flex; align-items: center; gap: 6px;
  }
  .ns-review-tile-body { padding: 14px 16px; background: white; }
  .ns-review-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.82rem; margin-bottom: 8px;
  }
  .ns-review-row:last-child { margin-bottom: 0; }
  .ns-review-key { font-weight: 700; opacity: 0.55; }
  .ns-review-val { font-weight: 800; }
  .ns-share-box {
    border: 2.5px dashed #1a1a2e; border-radius: 14px;
    padding: 14px 18px; background: #f9f9f9;
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 16px;
  }
  .ns-share-link { font-size: 0.8rem; font-weight: 700; flex: 1; word-break: break-all; color: #4ECDC4; }
  .ns-copy-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.78rem;
    padding: 7px 14px; border: 2px solid #1a1a2e; border-radius: 50px;
    cursor: pointer; background: #FFE135; box-shadow: 2px 2px 0 #1a1a2e;
    white-space: nowrap; transition: transform .1s;
  }
  .ns-copy-btn:hover { transform: translate(-1px,-1px); }

  /* Nav buttons */
  .ns-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 28px;
  }
  .ns-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.9rem;
    padding: 12px 28px; border: 3px solid #1a1a2e; border-radius: 50px;
    cursor: pointer; box-shadow: 4px 4px 0 #1a1a2e;
    transition: transform .1s, box-shadow .1s; display: flex; align-items: center; gap: 8px;
  }
  .ns-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #1a1a2e; }
  .ns-btn:active { transform: translate(1px,1px); box-shadow: 2px 2px 0 #1a1a2e; }
  .ns-btn-ghost { background: white; }
  .ns-btn-coral { background: #FF6B6B; color: white; }
  .ns-btn-lime  { background: #C8F135; color: #1a1a2e; }
  .ns-btn-navy  { background: #1a1a2e; color: white; }

  /* confetti animation for done state */
  @keyframes pop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  .ns-done { animation: pop .4s ease forwards; }
  .ns-progress {
    height: 8px; background: #eee; border: 2px solid #1a1a2e;
    border-radius: 50px; overflow: hidden; margin-bottom: 32px;
  }
  .ns-progress-fill {
    height: 100%; background: #FF6B6B; border-radius: 50px;
    transition: width .4s cubic-bezier(.34,1.56,.64,1);
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <div className={`ns-switch${on ? " on" : ""}`} onClick={onToggle} role="switch" aria-checked={on} />;
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepDetails({ form, setForm }: { form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>> }) {
  return (
    <>
      <div className="ns-card">
        <div className="ns-card-title">📋 Session Info</div>
        <div className="ns-field">
          <label className="ns-label">SESSION NAME</label>
          <input className="ns-input" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Friday Game Night #43" />
        </div>
        <div className="ns-input-row">
          <div className="ns-field">
            <label className="ns-label">DATE</label>
            <input className="ns-input" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="ns-field">
            <label className="ns-label">TIME</label>
            <input className="ns-input" type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>
        <div className="ns-field" style={{ marginBottom: 0 }}>
          <label className="ns-label">LOCATION</label>
          <input className="ns-input" value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Wanjiku's place, Kahawa Wendani" />
        </div>
      </div>

      <div className="ns-card">
        <div className="ns-card-title">🎮 Session Mode</div>
        <div className="ns-mode-row">
          {(["quick", "tournament"] as SessionMode[]).map(mode => (
            <div key={mode} className={`ns-mode-card${form.mode === mode ? " selected" : ""}`}
              onClick={() => setForm(f => ({ ...f, mode }))}>
              <div className="ns-mode-icon">{mode === "quick" ? "⚡" : "🏆"}</div>
              <div className="ns-mode-name">{mode === "quick" ? "Quick Session" : "Tournament"}</div>
              <div className="ns-mode-desc">
                {mode === "quick"
                  ? "Play a few games casually. No brackets, just vibes."
                  : "Full bracket, rounds, seedings, and a final champion."}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ns-card">
        <div className="ns-card-title">⚙️ Options</div>
        <div className="ns-toggle-row">
          <div className="ns-toggle-left">
            <div className="ns-toggle-icon">🔗</div>
            <div>
              <div className="ns-toggle-label">Allow Join via Link</div>
              <div className="ns-toggle-sub">Players can RSVP from a shareable link</div>
            </div>
          </div>
          <Toggle on={form.allowJoinLink} onToggle={() => setForm(f => ({ ...f, allowJoinLink: !f.allowJoinLink }))} />
        </div>
        <div className="ns-toggle-row">
          <div className="ns-toggle-left">
            <div className="ns-toggle-icon">⏱️</div>
            <div>
              <div className="ns-toggle-label">Enable Session Timer</div>
              <div className="ns-toggle-sub">Round reminders & wrap-up alerts</div>
            </div>
          </div>
          <Toggle on={form.timerEnabled} onToggle={() => setForm(f => ({ ...f, timerEnabled: !f.timerEnabled }))} />
        </div>
      </div>
    </>
  );
}

function StepPlayers({ form, setForm }: { form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>> }) {
  const togglePlayer = useCallback((p: Player) => {
    setForm(f => {
      const exists = f.players.find(x => x.id === p.id);
      if (exists) return { ...f, players: f.players.filter(x => x.id !== p.id) };
      return { ...f, players: [...f.players, p] };
    });
  }, [setForm]);

  const isSelected = (id: string) => form.players.some(p => p.id === id);

  return (
    <div className="ns-card">
      <div className="ns-card-title">👥 Who's Playing?</div>
      <div className="ns-selected-count">
        {form.players.length} player{form.players.length !== 1 ? "s" : ""} selected
        {form.players.length > 0 && " · "}
        {form.players.length > 0 && <span style={{ color: "#FF6B6B" }}>Tap to deselect</span>}
      </div>
      <div className="ns-player-grid">
        {AVAILABLE_PLAYERS.map((p, i) => {
          const selected = isSelected(p.id);
          const isHost = i === 0;
          return (
            <div key={p.id}
              className={`ns-player-tile${selected ? " selected" : ""}${isHost ? " host-tile" : ""}`}
              style={selected ? { background: p.color, borderColor: "#1a1a2e" } : {}}
              onClick={() => togglePlayer(p)}>
              {isHost && <div className="ns-host-crown">👑</div>}
              {selected && <div className="ns-ptile-check">✓</div>}
              <div className="ns-ptile-emoji">{p.emoji}</div>
              <div className="ns-ptile-name">{p.name}</div>
            </div>
          );
        })}
        <button className="ns-guest-btn">
          <div className="ns-guest-icon">➕</div>
          Add Guest
        </button>
      </div>
      {form.allowJoinLink && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fff4", border: "2px solid #1a1a2e", borderRadius: 14, fontSize: "0.8rem", fontWeight: 700 }}>
          🔗 Others can also join via your invite link after you create the session.
        </div>
      )}
    </div>
  );
}

function StepGames({ form, setForm }: { form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>> }) {
  const toggleGame = useCallback((g: Game) => {
    setForm(f => {
      const exists = f.games.find(x => x.id === g.id);
      if (exists) return { ...f, games: f.games.filter(x => x.id !== g.id) };
      return { ...f, games: [...f.games, g] };
    });
  }, [setForm]);

  const isSelected = (id: string) => form.games.some(g => g.id === id);

  return (
    <div className="ns-card">
      <div className="ns-card-title">🎲 Pick Your Games</div>
      <div className="ns-selected-count">
        {form.games.length} game{form.games.length !== 1 ? "s" : ""} selected
      </div>
      <div className="ns-game-grid">
        {GAME_LIBRARY.map(g => (
          <div key={g.id} className={`ns-game-row${isSelected(g.id) ? " selected" : ""}`}
            onClick={() => toggleGame(g)}>
            <div className="ns-game-icon">{g.emoji}</div>
            <div className="ns-game-info">
              <div className="ns-game-name">{g.name}</div>
              <div className="ns-game-meta">
                <span>👥 {g.minPlayers}–{g.maxPlayers}</span>
                <span>⏱ {g.duration}</span>
              </div>
              <div className="ns-game-tags">
                {g.tags.map(t => <span key={t} className="ns-tag">{t}</span>)}
              </div>
            </div>
            <div className="ns-game-check">{isSelected(g.id) ? "✓" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReview({ form, copied, onCopy }: { form: SessionForm; copied: boolean; onCopy: () => void }) {
  const joinCode = "T254-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  const joinUrl = `tucheze254.app/join/${joinCode}`;

  return (
    <>
      <div className="ns-review-grid">
        <div className="ns-review-tile">
          <div className="ns-review-tile-head" style={{ background: "#FFE135" }}>📋 Session Details</div>
          <div className="ns-review-tile-body">
            {[
              ["Name", form.name || "Untitled Session"],
              ["Date", form.date || "—"],
              ["Time", form.time || "—"],
              ["Location", form.location || "—"],
              ["Mode", form.mode === "quick" ? "⚡ Quick" : "🏆 Tournament"],
            ].map(([k, v]) => (
              <div key={k} className="ns-review-row">
                <span className="ns-review-key">{k}</span>
                <span className="ns-review-val">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ns-review-tile">
          <div className="ns-review-tile-head" style={{ background: "#4ECDC4" }}>👥 Players ({form.players.length})</div>
          <div className="ns-review-tile-body">
            {form.players.length === 0
              ? <span style={{ opacity: 0.4, fontSize: "0.82rem" }}>No players selected</span>
              : form.players.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color, border: "2px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>{p.emoji}</div>
                  <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{p.name}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="ns-review-tile" style={{ gridColumn: "1 / -1" }}>
          <div className="ns-review-tile-head" style={{ background: "#FF9ECD" }}>🎲 Games ({form.games.length})</div>
          <div className="ns-review-tile-body">
            {form.games.length === 0
              ? <span style={{ opacity: 0.4, fontSize: "0.82rem" }}>No games selected yet</span>
              : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {form.games.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f5f5", border: "2px solid #1a1a2e", borderRadius: 50, padding: "4px 14px", fontSize: "0.8rem", fontWeight: 800, boxShadow: "2px 2px 0 #1a1a2e" }}>
                    {g.emoji} {g.name}
                  </div>
                ))}
              </div>}
          </div>
        </div>
      </div>

      {form.allowJoinLink && (
        <div className="ns-card">
          <div className="ns-card-title">🔗 Invite Link — How "Join Session" Works</div>
          <p style={{ fontSize: "0.82rem", fontWeight: 700, opacity: 0.65, marginBottom: 14, lineHeight: 1.6 }}>
            Share this link via WhatsApp or any app. When someone opens it, they'll see the session details and tap <strong>"I'm In 🙌"</strong> to add themselves as a player automatically.
          </p>
          <div className="ns-share-box">
            <span className="ns-share-link">{joinUrl}</span>
            <button className="ns-copy-btn" onClick={onCopy}>
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {["📱 WhatsApp","💬 Telegram","🔵 Facebook"].map(s => (
              <button key={s} style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.78rem", padding: "7px 16px", border: "2px solid #1a1a2e", borderRadius: 50, cursor: "pointer", background: "white", boxShadow: "2px 2px 0 #1a1a2e" }}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewSession() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [copied, setCopied] = useState(false);
  const [launching, setLaunching] = useState(false);
  const createSession = useMutation(api.sessions.create);
  const [form, setForm] = useState<SessionForm>({
    name: "",
    date: "",
    time: "18:00",
    location: "",
    mode: "quick",
    players: [],
    games: [],
    allowJoinLink: true,
    timerEnabled: false,
  });

  const progress = ((step - 1) / 3) * 100;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepInfo: Record<Step, { badge: string; title: string; desc: string }> = {
    1: { badge: "Step 1 of 4", title: "Session Details 📋", desc: "Give your game night a name, time & place." },
    2: { badge: "Step 2 of 4", title: "Add Players 👥",     desc: "Pick who's showing up tonight." },
    3: { badge: "Step 3 of 4", title: "Choose Games 🎲",    desc: "What's on the menu?" },
    4: { badge: "Step 4 of 4", title: "Review & Launch 🚀", desc: "Everything look good? Let's go!" },
  };

  const info = stepInfo[step];

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="ns-root">
        {/* NAV */}
        <nav className="ns-nav">
          <div className="ns-logo">
            <div className="ns-logo-badge">🎲</div>
            Tucheze254
          </div>
          <button className="ns-back" onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : undefined}>
            ← {step === 1 ? "Home" : "Back"}
          </button>
        </nav>

        <div className="ns-layout">
          {/* SIDEBAR */}
          <aside className="ns-sidebar">
            <div className="ns-steps">
              {STEPS.map((label, i) => {
                const n = (i + 1) as Step;
                const isDone = step > n;
                const isActive = step === n;
                return (
                  <div key={label} className={`ns-step-item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
                    onClick={() => isDone && setStep(n)}>
                    <div className="ns-step-num">{isDone ? "✓" : n}</div>
                    <div>
                      <div className="ns-step-label">{label}</div>
                      <div className="ns-step-sub">
                        {isDone ? "Complete" : isActive ? "In progress" : "Upcoming"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live preview */}
            <div className="ns-preview">
              <div className="ns-preview-head">👁️ Preview</div>
              <div className="ns-preview-body">
                <div className="ns-preview-row">
                  <div className="ns-preview-icon">🎉</div>
                  <div className={`ns-preview-val${!form.name ? " ns-preview-dim" : ""}`}>
                    {form.name || "Session name..."}
                  </div>
                </div>
                <div className="ns-preview-row">
                  <div className="ns-preview-icon">📅</div>
                  <div className={`ns-preview-val${!form.date ? " ns-preview-dim" : ""}`}>
                    {form.date ? `${form.date} · ${form.time}` : "Date & time..."}
                  </div>
                </div>
                <div className="ns-preview-row">
                  <div className="ns-preview-icon">📍</div>
                  <div className={`ns-preview-val${!form.location ? " ns-preview-dim" : ""}`}>
                    {form.location || "Location..."}
                  </div>
                </div>
                <div className="ns-preview-row" style={{ alignItems: "flex-start" }}>
                  <div className="ns-preview-icon">👥</div>
                  <div>
                    {form.players.length === 0
                      ? <span className="ns-preview-val ns-preview-dim">No players yet</span>
                      : <div className="ns-player-stack">
                          {form.players.slice(0, 5).map(p => (
                            <div key={p.id} className="ns-pstack-bubble"
                              style={{ background: p.color, border: "2px solid #1a1a2e" }}>
                              {p.emoji}
                            </div>
                          ))}
                          {form.players.length > 5 && (
                            <div className="ns-pstack-bubble" style={{ background: "#eee", border: "2px solid #1a1a2e", fontSize: "0.6rem", fontWeight: 800 }}>
                              +{form.players.length - 5}
                            </div>
                          )}
                        </div>}
                  </div>
                </div>
                <div className="ns-preview-row">
                  <div className="ns-preview-icon">🎲</div>
                  <div className={`ns-preview-val${form.games.length === 0 ? " ns-preview-dim" : ""}`}>
                    {form.games.length === 0 ? "No games yet" : form.games.map(g => g.emoji).join(" ")}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="ns-main">
            {/* Progress bar */}
            <div className="ns-progress">
              <div className="ns-progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="ns-step-header">
              <div className="ns-step-badge">{info.badge}</div>
              <h1 className="ns-step-title">{info.title}</h1>
              <p className="ns-step-desc">{info.desc}</p>
            </div>

            {step === 1 && <StepDetails form={form} setForm={setForm} />}
            {step === 2 && <StepPlayers form={form} setForm={setForm} />}
            {step === 3 && <StepGames form={form} setForm={setForm} />}
            {step === 4 && <StepReview form={form} copied={copied} onCopy={handleCopy} />}

            <div className="ns-footer">
              <button className="ns-btn ns-btn-ghost"
                onClick={() => step > 1 && setStep(s => (s - 1) as Step)}
                style={{ visibility: step === 1 ? "hidden" : "visible" }}>
                ← Back
              </button>
              {step < 4
                ? <button className="ns-btn ns-btn-coral" onClick={() => setStep(s => (s + 1) as Step)}>
                    Continue →
                  </button>
                : <button
                    className="ns-btn ns-btn-lime"
                    disabled={launching}
                    onClick={async () => {
                      setLaunching(true);
                      try {
                        // 1. Save session to Convex and get back its _id
                        const convexId = await createSession({
                          name:      form.name || "Game Night",
                          location:  form.location || "TBD",
                          date:      form.date
                                       ? new Date(`${form.date}T${form.time || "18:00"}`).toISOString()
                                       : new Date().toISOString(),
                          games:     form.games.map((g) => ({ name: g.name, emoji: g.emoji })),
                          playerIds: form.players.map((p) => p.id as any),
                        });

                        // 2. Write session data + convexId to sessionStorage for LiveSession
                        const sessionData = {
                          convexId,
                          name:     form.name || "Game Night",
                          location: form.location || "TBD",
                          players:  form.players,
                          games:    form.games.map((g) => ({ name: g.name, emoji: g.emoji })),
                        };
                        sessionStorage.setItem("tucheze_live_session", JSON.stringify(sessionData));

                        // 3. Navigate to live tracker
                        router.push("/sessions/live");
                      } catch (err) {
                        console.error("Failed to create session:", err);
                        setLaunching(false);
                      }
                    }}
                  >
                    {launching ? "⏳ Creating…" : "🚀 Launch Session!"}
                  </button>}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}