"use client";
import Link from "next/link";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
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
  id: string;         // local id for selection state (use convexId when saving)
  convexId?: string;  // the real Convex _id from the games table
  name: string;
  emoji: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  tags: string[];
  timesPlayed: number;
  trending: boolean;
  gameType?: "individual" | "team" | "both";
}

type SessionMode   = "quick" | "tournament";
type PlayFormat    = "individual" | "teams";
type Step = 1 | 2 | 3 | 4;

interface Team {
  id: string;
  name: string;
  emoji: string;
  color: string;
  playerIds: string[];
}

interface SessionForm {
  name: string;
  date: string;
  time: string;
  location: string;
  mode: SessionMode;
  playFormat: PlayFormat;
  teamCount: number;
  teams: Team[];
  players: Player[];
  games: Game[];
  allowJoinLink: boolean;
  timerEnabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// AVAILABLE_PLAYERS and GAME_LIBRARY are now loaded from Convex — no hardcoded data

const STEPS = ["Details", "Players", "Games", "Review"] as const;

// ─── Team generation data ─────────────────────────────────────────────────────

const TEAM_NAMES = [
  ["Team Mamba","Team Simba","Team Tembo","Team Chui","Team Mbuni"],
  ["Noma Squad","Fiti Crew","Poa Gang","Sawa Posse","Bomba Bunch"],
  ["Fire","Water","Earth","Wind","Thunder"],
  ["Red Rockets","Blue Bolts","Gold Gladiators","Green Goblins","Purple Panthers"],
  ["Team Nyota","Team Jua","Team Mwezi","Team Mvua","Team Upepo"],
];

const TEAM_EMOJIS  = ["🔥","💧","🌍","⚡","🎯","👑","🦁","🐉","🌟","💎"];
const TEAM_COLORS  = ["#FF6B6B","#4ECDC4","#FFE135","#C8F135","#FF9ECD","#A8DAFF","#FFB347","#B5EAD7","#CF9FFF","#FFDAC1"];

function generateTeams(count: number, existingTeams: Team[] = []): Team[] {
  const nameSet = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];
  return Array.from({ length: count }, (_, i) => {
    const existing = existingTeams[i];
    return {
      id:        existing?.id        ?? `team-${i}`,
      name:      existing?.name      ?? nameSet[i] ?? `Team ${i + 1}`,
      emoji:     existing?.emoji     ?? TEAM_EMOJIS[i % TEAM_EMOJIS.length],
      color:     existing?.color     ?? TEAM_COLORS[i % TEAM_COLORS.length],
      playerIds: existing?.playerIds ?? [],
    };
  });
}

function shufflePlayers(players: Player[], teams: Team[]): Team[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  return teams.map((t, i) => ({
    ...t,
    playerIds: shuffled
      .filter((_, pi) => pi % teams.length === i)
      .map((p) => p.id),
  }));
}

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

  /* ── GAME SKELETON ── */
  .ns-skeleton-row {
    display: flex; align-items: center; gap: 14px;
    border: 3px solid #e8e8e8; border-radius: 18px;
    padding: 14px 16px; background: white;
  }
  .ns-skel { background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .ns-skel-circle { border-radius: 50% !important; }

  /* game trending badge */
  .ns-game-trending {
    display: inline-flex; align-items: center; gap: 3px;
    background: #FF6B6B; color: white;
    border: 1.5px solid #1a1a2e; border-radius: 50px;
    font-size: 0.6rem; font-weight: 900; padding: 1px 7px;
    margin-left: 6px; vertical-align: middle;
  }
  .ns-game-plays {
    font-size: 0.65rem; font-weight: 800; opacity: 0.45; margin-top: 2px;
  }

  /* game search bar */
  .ns-game-search-wrap { position: relative; margin-bottom: 14px; }
  .ns-game-search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 0.9rem; }
  .ns-game-search {
    width: 100%; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.88rem;
    padding: 10px 12px 10px 38px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    background: white; color: #1a1a2e; outline: none;
    box-shadow: 3px 3px 0 #1a1a2e; transition: box-shadow .15s;
  }
  .ns-game-search:focus { box-shadow: 5px 5px 0 #1a1a2e; }
  .ns-game-search::placeholder { opacity: 0.4; }

  /* quick-add inline form */
  .ns-quick-add-toggle {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 10px; border: 2.5px dashed #1a1a2e; border-radius: 14px;
    background: transparent; cursor: pointer; font-family: 'Nunito', sans-serif;
    font-weight: 800; font-size: 0.82rem; color: #1a1a2e;
    transition: background .15s; margin-top: 10px;
  }
  .ns-quick-add-toggle:hover { background: rgba(0,0,0,0.03); }
  .ns-quick-add-form {
    margin-top: 10px; border: 2.5px solid #1a1a2e; border-radius: 16px;
    padding: 16px; background: #fffdf5; box-shadow: 3px 3px 0 #1a1a2e;
  }
  .ns-quick-add-title { font-family: 'Fredoka One', cursive; font-size: 1rem; margin-bottom: 12px; }
  .ns-quick-add-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
  .ns-quick-emoji-btn {
    width: 46px; height: 46px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    background: white; cursor: pointer; font-size: 1.4rem;
    box-shadow: 2px 2px 0 #1a1a2e; flex-shrink: 0; transition: all .12s;
  }
  .ns-quick-emoji-btn:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #1a1a2e; }
  .ns-quick-name-input {
    flex: 1; min-width: 120px; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.88rem;
    padding: 10px 12px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    background: white; color: #1a1a2e; outline: none;
    box-shadow: 2px 2px 0 #1a1a2e; transition: box-shadow .15s;
  }
  .ns-quick-name-input:focus { box-shadow: 4px 4px 0 #1a1a2e; }
  .ns-quick-save-btn {
    font-family: 'Fredoka One', cursive; font-size: 0.88rem;
    padding: 10px 18px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    background: #C8F135; color: #1a1a2e; cursor: pointer;
    box-shadow: 3px 3px 0 #1a1a2e; transition: all .12s; flex-shrink: 0;
  }
  .ns-quick-save-btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a2e; }
  .ns-quick-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ns-quick-cancel-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.78rem;
    padding: 9px 14px; border: 2px solid #ccc; border-radius: 12px;
    background: white; cursor: pointer; flex-shrink: 0;
  }
  .ns-quick-cancel-btn:hover { border-color: #FF6B6B; color: #FF6B6B; }

  /* empty state inside card */
  .ns-games-empty { text-align: center; padding: 36px 20px; }
  .ns-games-empty-icon { font-size: 2.8rem; margin-bottom: 8px; }
  .ns-games-empty-text { font-family: 'Fredoka One', cursive; font-size: 1.1rem; margin-bottom: 4px; }
  .ns-games-empty-sub  { font-size: 0.78rem; font-weight: 700; opacity: 0.5; margin-bottom: 16px; }

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

  /* ── FORMAT TOGGLE (Individual / Teams) ── */
  .ns-format-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
  .ns-format-card {
    border: 3px solid #1a1a2e; border-radius: 16px;
    padding: 18px; cursor: pointer;
    transition: transform .1s, box-shadow .1s, background .15s;
    box-shadow: 3px 3px 0 #1a1a2e; background: white;
    display: flex; align-items: center; gap: 14px;
  }
  .ns-format-card:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .ns-format-card.selected { background: #1a1a2e; color: white; }
  .ns-format-icon { font-size: 1.8rem; flex-shrink: 0; }
  .ns-format-name { font-family: 'Fredoka One', cursive; font-size: 1rem; margin-bottom: 2px; }
  .ns-format-desc { font-size: 0.72rem; font-weight: 700; opacity: 0.6; line-height: 1.4; }

  /* ── TEAM COUNT PICKER ── */
  .ns-team-count-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .ns-count-btn {
    width: 44px; height: 44px; border-radius: 50%;
    border: 2.5px solid #1a1a2e; background: white;
    font-family: 'Fredoka One', cursive; font-size: 1.1rem;
    cursor: pointer; box-shadow: 3px 3px 0 #1a1a2e;
    transition: all .12s; display: flex; align-items: center; justify-content: center;
  }
  .ns-count-btn:hover  { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a2e; }
  .ns-count-btn.active { background: #1a1a2e; color: #FFE135; box-shadow: 2px 2px 0 rgba(0,0,0,0.3); }

  /* ── TEAM BUILDER ── */
  .ns-team-builder { display: flex; flex-direction: column; gap: 16px; }
  .ns-team-block {
    border: 3px solid #1a1a2e; border-radius: 18px;
    overflow: hidden; box-shadow: 4px 4px 0 #1a1a2e;
  }
  .ns-team-head {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-bottom: 2.5px solid #1a1a2e;
  }
  .ns-team-emoji { font-size: 1.4rem; }
  .ns-team-name-input {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    border: none; outline: none; background: transparent;
    flex: 1; color: inherit; min-width: 0;
  }
  .ns-team-count-chip {
    font-size: 0.68rem; font-weight: 800; opacity: 0.55;
    background: rgba(0,0,0,0.08); border-radius: 50px;
    padding: 2px 10px; white-space: nowrap;
  }
  .ns-team-members {
    padding: 12px 16px; background: white;
    display: flex; flex-wrap: wrap; gap: 8px; min-height: 54px;
  }
  .ns-team-member-chip {
    display: flex; align-items: center; gap: 6px;
    border: 2px solid #1a1a2e; border-radius: 50px;
    padding: 4px 10px 4px 6px;
    font-weight: 800; font-size: 0.78rem;
    cursor: pointer; transition: all .12s;
    box-shadow: 2px 2px 0 #1a1a2e;
  }
  .ns-team-member-chip:hover { background: #fff0f0; border-color: #FF6B6B; }
  .ns-team-member-avatar {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1.5px solid #1a1a2e; display: flex;
    align-items: center; justify-content: center; font-size: 0.75rem;
  }
  .ns-team-empty { font-size: 0.78rem; font-weight: 700; opacity: 0.35; padding: 4px 0; }

  /* unassigned pool */
  .ns-pool-label { font-size: 0.72rem; font-weight: 800; opacity: 0.45; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .ns-pool-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .ns-pool-chip {
    display: flex; align-items: center; gap: 6px;
    border: 2.5px solid #1a1a2e; border-radius: 50px;
    padding: 5px 12px 5px 8px;
    font-weight: 800; font-size: 0.8rem;
    cursor: pointer; background: white;
    box-shadow: 3px 3px 0 #1a1a2e; transition: all .12s;
  }
  .ns-pool-chip:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a2e; }
  .ns-pool-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    border: 2px solid #1a1a2e; display: flex;
    align-items: center; justify-content: center; font-size: 0.85rem;
  }

  /* randomize & action buttons */
  .ns-team-actions { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .ns-action-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
    padding: 9px 18px; border: 2.5px solid #1a1a2e; border-radius: 50px;
    cursor: pointer; box-shadow: 3px 3px 0 #1a1a2e; background: white;
    transition: all .12s; display: flex; align-items: center; gap: 6px;
  }
  .ns-action-btn:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a2e; }
  .ns-action-btn.accent { background: #FFE135; }
  .ns-action-btn.navy   { background: #1a1a2e; color: white; }

  /* team assignment dropdown hint */
  .ns-assign-hint {
    font-size: 0.75rem; font-weight: 700; opacity: 0.4;
    margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
  }

  /* pool player select dropdown */
  .ns-assign-select {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
    padding: 7px 12px; border: 2px solid #1a1a2e; border-radius: 10px;
    background: white; color: #1a1a2e; outline: none; cursor: pointer;
    box-shadow: 2px 2px 0 #1a1a2e; appearance: none;
  }

  /* ── MOBILE ── */
  @media (max-width: 768px) {
    /* Nav */
    .ns-nav { padding: 12px 16px; }
    .ns-logo { font-size: 1.2rem; }
    .ns-logo-badge { width: 26px; height: 26px; font-size: 0.85rem; }
    .ns-back { font-size: 0.78rem; padding: 6px 14px; }

    /* Layout — stack sidebar above main */
    .ns-layout {
      grid-template-columns: 1fr;
      padding: 16px 14px 100px;
      gap: 16px;
    }

    /* Sidebar — horizontal step indicator instead of vertical list */
    .ns-sidebar { position: static; }
    .ns-steps {
      display: flex; flex-direction: row;
      border-radius: 14px; overflow: hidden;
      margin-bottom: 0;
    }
    .ns-step-item {
      flex: 1; flex-direction: column; align-items: center;
      padding: 10px 6px; gap: 4px; border-bottom: none;
      border-right: 2px solid #eee; text-align: center;
    }
    .ns-step-item:last-child { border-right: none; }
    .ns-step-num { width: 26px; height: 26px; font-size: 0.78rem; }
    .ns-step-label { font-size: 0.7rem; }
    .ns-step-sub   { display: none; }

    /* Hide the preview card on mobile — too much space */
    .ns-preview { display: none; }

    /* Cards */
    .ns-card { padding: 16px; border-radius: 16px; }
    .ns-card-title { font-size: 0.9rem; margin-bottom: 14px; }

    /* Step header */
    .ns-step-header { margin-bottom: 14px; }
    .ns-step-badge  { font-size: 0.65rem; padding: 3px 10px; margin-bottom: 6px; }
    .ns-step-title  { font-size: 1.5rem; }
    .ns-step-desc   { font-size: 0.82rem; }

    /* Fields */
    .ns-field { margin-bottom: 14px; }
    .ns-label { font-size: 0.65rem; }
    .ns-input { padding: 10px 12px; font-size: 0.9rem; }
    .ns-input-row { grid-template-columns: 1fr; gap: 0; }

    /* Mode cards — stack vertically */
    .ns-mode-row { grid-template-columns: 1fr; gap: 10px; }
    .ns-mode-card { padding: 14px 16px; flex-direction: row; align-items: center; gap: 12px; text-align: left; }
    .ns-mode-icon { font-size: 1.5rem; margin-bottom: 0; flex-shrink: 0; }

    /* Format cards */
    .ns-format-row { grid-template-columns: 1fr; gap: 10px; margin-bottom: 14px; }
    .ns-format-card { padding: 14px 16px; }

    /* Team builder */
    .ns-team-count-row { gap: 8px; }
    .ns-count-btn { padding: 8px 14px; font-size: 0.82rem; }
    .ns-team-block { border-radius: 14px; }
    .ns-team-head  { padding: 10px 14px; }
    .ns-team-members { padding: 10px 14px; }
    .ns-team-actions { gap: 8px; }
    .ns-action-btn { padding: 8px 14px; font-size: 0.78rem; }

    /* Player pool */
    .ns-pool-chip { padding: 6px 10px; font-size: 0.78rem; }

    /* Game cards */
    .ns-quick-add-row { flex-direction: column; }
    .ns-quick-name-input { width: 100%; }

    /* Review grid — stack tiles */
    .ns-review-grid { grid-template-columns: 1fr; gap: 12px; margin-bottom: 14px; }
    .ns-review-tile-head { padding: 10px 14px; font-size: 0.82rem; }
    .ns-review-tile-body { padding: 12px 14px; }

    /* Share box */
    .ns-share-box { flex-wrap: wrap; gap: 8px; padding: 12px; }
    .ns-share-link { font-size: 0.72rem; width: 100%; }
    .ns-copy-btn { width: 100%; justify-content: center; padding: 8px; }

    /* Footer — fixed at bottom, full width */
    .ns-footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 12px 16px;
      background: #FFFDF5;
      border-top: 3px solid #1a1a2e;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
      z-index: 100;
      display: flex; gap: 10px;
    }
    .ns-btn {
      flex: 1; padding: 13px 16px; font-size: 0.9rem;
      justify-content: center;
    }

    /* Progress bar */
    .ns-progress { border-radius: 0; }

    /* Toggle rows */
    .ns-toggle-row { padding: 12px 0; gap: 8px; }
    .ns-toggle-label { font-size: 0.82rem; }
    .ns-toggle-sub   { font-size: 0.68rem; }

    /* Games list */
    .ns-game-search { padding: 10px 12px 10px 38px; font-size: 0.88rem; }
  }

  @media (max-width: 420px) {
    .ns-layout { padding: 12px 10px 100px; }
    .ns-step-label { display: none; }
    .ns-step-item  { padding: 10px 4px; }
    .ns-step-title { font-size: 1.3rem; }
    .ns-card { padding: 14px 12px; }
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

function StepPlayers({ form, setForm, availablePlayers, loadingPlayers }: { form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>>; availablePlayers: Player[]; loadingPlayers: boolean }) {
  // ── Format select ──────────────────────────────────────────────────────────
  const setFormat = (fmt: PlayFormat) => {
    setForm(f => {
      const teams = fmt === "teams" ? generateTeams(f.teamCount) : f.teams;
      return { ...f, playFormat: fmt, teams };
    });
  };

  // ── Individual player toggle ───────────────────────────────────────────────
  const togglePlayer = useCallback((p: Player) => {
    setForm(f => {
      const exists = f.players.find(x => x.id === p.id);
      if (exists) return { ...f, players: f.players.filter(x => x.id !== p.id) };
      return { ...f, players: [...f.players, p] };
    });
  }, [setForm]);

  const isSelected = (id: string) => form.players.some(p => p.id === id);

  // ── Team count ────────────────────────────────────────────────────────────
  const setTeamCount = (n: number) => {
    setForm(f => {
      const newTeams = generateTeams(n, f.teams);
      return { ...f, teamCount: n, teams: newTeams };
    });
  };

  // ── Assign player to a team ───────────────────────────────────────────────
  const assignToTeam = (playerId: string, teamId: string) => {
    setForm(f => ({
      ...f,
      teams: f.teams.map(t => {
        if (t.id === teamId)   return { ...t, playerIds: [...t.playerIds.filter(id => id !== playerId), playerId] };
        return { ...t, playerIds: t.playerIds.filter(id => id !== playerId) };
      }),
    }));
  };

  // Remove from a team → back to pool
  const removeFromTeam = (playerId: string) => {
    setForm(f => ({
      ...f,
      teams: f.teams.map(t => ({ ...t, playerIds: t.playerIds.filter(id => id !== playerId) })),
    }));
  };

  // ── Randomize ────────────────────────────────────────────────────────────
  const randomize = () => {
    setForm(f => ({ ...f, teams: shufflePlayers(f.players, f.teams) }));
  };

  // ── Re-roll team names ────────────────────────────────────────────────────
  const rerollNames = () => {
    setForm(f => ({
      ...f,
      teams: generateTeams(f.teamCount).map((newT, i) => ({
        ...f.teams[i],
        name:  newT.name,
        emoji: newT.emoji,
      })),
    }));
  };

  // ── Rename a team ─────────────────────────────────────────────────────────
  const renameTeam = (teamId: string, name: string) => {
    setForm(f => ({ ...f, teams: f.teams.map(t => t.id === teamId ? { ...t, name } : t) }));
  };

  // ── Unassigned players ───────────────────────────────────────────────────
  const assignedIds = form.teams.flatMap(t => t.playerIds);
  const unassigned  = form.players.filter(p => !assignedIds.includes(p.id));

  return (
    <>
      {/* ── Play Format ── */}
      <div className="ns-card">
        <div className="ns-card-title">⚔️ Play Format</div>
        <div className="ns-format-row">
          {(["individual", "teams"] as PlayFormat[]).map(fmt => (
            <div key={fmt}
              className={`ns-format-card${form.playFormat === fmt ? " selected" : ""}`}
              onClick={() => setFormat(fmt)}>
              <div className="ns-format-icon">{fmt === "individual" ? "🧍" : "🫂"}</div>
              <div>
                <div className="ns-format-name">{fmt === "individual" ? "Individual" : "Teams"}</div>
                <div className="ns-format-desc">
                  {fmt === "individual"
                    ? "Every player for themselves. May the best one win."
                    : "Group players into teams. Score together, win together."}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Player pool ── */}
      <div className="ns-card">
        <div className="ns-card-title">👥 Who's Playing?</div>
        <div className="ns-selected-count">
          {form.players.length} player{form.players.length !== 1 ? "s" : ""} selected
          {form.players.length > 0 && <span style={{ color: "#FF6B6B" }}> · Tap to deselect</span>}
        </div>
        {loadingPlayers ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ width: "calc(25% - 9px)", height: 90, borderRadius: 16, background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", border: "2.5px solid #e0e0e0" }} />
            ))}
          </div>
        ) : availablePlayers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 16px", opacity: 0.45 }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>👤</div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem" }}>No players found</div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, marginTop: 4 }}>Ask your crew to sign up first — they'll appear here automatically.</div>
          </div>
        ) : (
          <div className="ns-player-grid">
            {availablePlayers.map((p, i) => {
              const selected = isSelected(p.id);
              const isHost   = i === 0;
              return (
                <div key={p.id}
                  className={`ns-player-tile${selected ? " selected" : ""}${isHost ? " host-tile" : ""}`}
                  style={selected ? { background: p.color, borderColor: "#1a1a2e" } : {}}
                  onClick={() => {
                    togglePlayer(p);
                    if (selected && form.playFormat === "teams") removeFromTeam(p.id);
                  }}>
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
        )}
        {form.allowJoinLink && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0fff4", border: "2px solid #1a1a2e", borderRadius: 14, fontSize: "0.8rem", fontWeight: 700 }}>
            🔗 Others can also join via your invite link after you create the session.
          </div>
        )}
      </div>

      {/* ── Teams section (only visible when teams format selected) ── */}
      {form.playFormat === "teams" && (
        <div className="ns-card">
          <div className="ns-card-title">🫂 Set Up Teams</div>

          {/* Team count */}
          <div style={{ marginBottom: 8 }}>
            <div className="ns-pool-label">Number of Teams</div>
            <div className="ns-team-count-row">
              {[2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`ns-count-btn${form.teamCount === n ? " active" : ""}`}
                  onClick={() => setTeamCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="ns-team-actions">
            <button className="ns-action-btn accent" onClick={randomize}
              disabled={form.players.length === 0}>
              🎲 Randomize
            </button>
            <button className="ns-action-btn" onClick={rerollNames}>
              🔄 New Names
            </button>
          </div>

          {/* Unassigned pool */}
          {form.players.length > 0 && (
            <>
              <div className="ns-pool-label">
                Unassigned Players ({unassigned.length})
              </div>
              {unassigned.length === 0 ? (
                <div style={{ fontSize: "0.8rem", fontWeight: 700, opacity: 0.4, marginBottom: 16 }}>
                  ✅ All players assigned!
                </div>
              ) : (
                <div className="ns-pool-grid">
                  {unassigned.map(p => (
                    <div key={p.id} style={{ position: "relative", display: "inline-block" }}>
                      <div className="ns-pool-chip">
                        <div className="ns-pool-avatar" style={{ background: p.color }}>{p.emoji}</div>
                        <span>{p.name}</span>
                        <span style={{ fontSize: "0.65rem", opacity: 0.5, marginLeft: 2 }}>→</span>
                        <select
                          className="ns-assign-select"
                          value=""
                          onChange={e => { if (e.target.value) assignToTeam(p.id, e.target.value); }}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">pick team</option>
                          {form.teams.map(t => (
                            <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {form.players.length === 0 && (
            <div style={{ fontSize: "0.82rem", fontWeight: 700, opacity: 0.4, marginBottom: 16 }}>
              ↑ Select players above first, then assign them to teams.
            </div>
          )}

          {/* Team blocks */}
          <div className="ns-team-builder">
            {form.teams.map((team, ti) => {
              const members = form.players.filter(p => team.playerIds.includes(p.id));
              return (
                <div key={team.id} className="ns-team-block">
                  <div className="ns-team-head" style={{ background: team.color }}>
                    <span className="ns-team-emoji">{team.emoji}</span>
                    <input
                      className="ns-team-name-input"
                      value={team.name}
                      onChange={e => renameTeam(team.id, e.target.value)}
                      maxLength={24}
                    />
                    <span className="ns-team-count-chip">
                      {members.length} player{members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="ns-team-members">
                    {members.length === 0
                      ? <span className="ns-team-empty">Drop players here or use Randomize</span>
                      : members.map(p => (
                          <div key={p.id} className="ns-team-member-chip"
                            style={{ background: p.color + "33" }}
                            onClick={() => removeFromTeam(p.id)}
                            title="Click to remove from team">
                            <div className="ns-team-member-avatar" style={{ background: p.color }}>{p.emoji}</div>
                            {p.name}
                            <span style={{ opacity: 0.4, fontSize: "0.7rem" }}>✕</span>
                          </div>
                        ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// Emoji picker pool for quick-add
const QUICK_EMOJIS = ["🎲","🃏","♟️","🎯","🧩","🎮","🏆","🎳","🎪","🎭","🚀","🧸","🦁","🐉","⚡","🌟","🔥","💎","🎵","🏝️"];

function StepGames({ form, setForm }: { form: SessionForm; setForm: React.Dispatch<React.SetStateAction<SessionForm>> }) {
  const rawGames  = useQuery(api.games.list);
  const addGame   = useMutation(api.games.add);
  const loading   = rawGames === undefined;

  const [search,       setSearch]       = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaName,       setQaName]       = useState("");
  const [qaEmoji,      setQaEmoji]      = useState("🎲");
  const [qaEmojiOpen,  setQaEmojiOpen]  = useState(false);
  const [qaSaving,     setQaSaving]     = useState(false);

  // Map Convex game docs to the local Game interface
  const gameLibrary: Game[] = (rawGames ?? []).map((g: any) => ({
    id:          g._id,
    convexId:    g._id,
    name:        g.name,
    emoji:       g.emoji,
    minPlayers:  parseInt(g.players?.split(/[–\-]/)[0] ?? "1") || 1,
    maxPlayers:  parseInt(g.players?.split(/[–\-]/)[1] ?? "99") || 99,
    duration:    g.duration ?? "—",
    tags:        g.tags ?? [],
    timesPlayed: g.timesPlayed ?? 0,
    trending:    g.trending ?? false,
    gameType:    g.gameType ?? "both",
  }));

  // Sort: trending first → most played → alphabetical
  const sorted = [...gameLibrary].sort((a, b) => {
    if (b.trending !== a.trending) return b.trending ? 1 : -1;
    if (b.timesPlayed !== a.timesPlayed) return b.timesPlayed - a.timesPlayed;
    return a.name.localeCompare(b.name);
  });

  // Filter by search
  const visible = search.trim()
    ? sorted.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())))
    : sorted;

  const toggleGame = useCallback((g: Game) => {
    setForm(f => {
      const exists = f.games.find(x => x.id === g.id);
      if (exists) return { ...f, games: f.games.filter(x => x.id !== g.id) };
      return { ...f, games: [...f.games, g] };
    });
  }, [setForm]);

  const isSelected = (id: string) => form.games.some(g => g.id === id);

  // Save a quick-add game to Convex then auto-select it
  const handleQuickSave = async () => {
    if (!qaName.trim()) return;
    setQaSaving(true);
    try {
      const id = await addGame({
        name:        qaName.trim(),
        emoji:       qaEmoji,
        category:    "Other",
        players:     "2–8",
        duration:    "—",
        difficulty:  1,
        tags:        [],
        rating:      0,
        color:       "#4ECDC4",
        description: "",
      });
      // Auto-select the newly added game
      const newGame: Game = {
        id:          id as string,
        convexId:    id as string,
        name:        qaName.trim(),
        emoji:       qaEmoji,
        minPlayers:  2,
        maxPlayers:  8,
        duration:    "—",
        tags:        [],
        timesPlayed: 0,
        trending:    false,
      };
      setForm(f => ({ ...f, games: [...f.games, newGame] }));
      setQaName(""); setQaEmoji("🎲"); setShowQuickAdd(false);
    } catch (e) {
      console.error("Failed to add game:", e);
    } finally {
      setQaSaving(false);
    }
  };

  return (
    <div className="ns-card">
      <div className="ns-card-title">🎲 Pick Your Games</div>
      <div className="ns-selected-count">
        {form.games.length > 0
          ? `${form.games.length} game${form.games.length !== 1 ? "s" : ""} selected · ${form.games.map(g => g.emoji).join(" ")}`
          : "No games selected yet"}
      </div>

      {/* Search bar — only show when there are games to search */}
      {!loading && sorted.length > 3 && (
        <div className="ns-game-search-wrap">
          <span className="ns-game-search-icon">🔍</span>
          <input
            className="ns-game-search"
            placeholder="Search games…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="ns-game-grid">
          {[0,1,2,3].map(i => (
            <div key={i} className="ns-skeleton-row">
              <div className="ns-skel ns-skel-circle" style={{ width:46, height:46, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div className="ns-skel" style={{ width:"60%", height:14, marginBottom:8 }} />
                <div className="ns-skel" style={{ width:"40%", height:11, marginBottom:6 }} />
                <div style={{ display:"flex", gap:6 }}>
                  <div className="ns-skel" style={{ width:44, height:20, borderRadius:50 }} />
                  <div className="ns-skel" style={{ width:44, height:20, borderRadius:50 }} />
                </div>
              </div>
            </div>
          ))}
        </div>

      ) : sorted.length === 0 ? (
        // Truly empty library
        <div className="ns-games-empty">
          <div className="ns-games-empty-icon">🎲</div>
          <div className="ns-games-empty-text">No games in your library yet</div>
          <div className="ns-games-empty-sub">Add a quick one below, or build your full library on the Games page.</div>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/games" target="_blank"
              style={{ fontFamily:"'Fredoka One',cursive", fontSize:"0.88rem", padding:"9px 20px", border:"2.5px solid #1a1a2e", borderRadius:50, background:"#FFE135", color:"#1a1a2e", textDecoration:"none", boxShadow:"3px 3px 0 #1a1a2e", display:"inline-flex", alignItems:"center", gap:6 }}>
              📚 Open Games Library
            </Link>
          </div>
        </div>

      ) : visible.length === 0 ? (
        // Search returned nothing
        <div className="ns-games-empty">
          <div className="ns-games-empty-icon">🔍</div>
          <div className="ns-games-empty-text">No matches</div>
          <div className="ns-games-empty-sub">Try a different search term.</div>
        </div>

      ) : (
        <div className="ns-game-grid">
          {visible.map((g: any) => (
            <div key={g.id} className={`ns-game-row${isSelected(g.id) ? " selected" : ""}`}
              onClick={() => toggleGame(g)}>
              <div className="ns-game-icon">{g.emoji}</div>
              <div className="ns-game-info">
                <div className="ns-game-name">
                  {g.name}
                  {g.trending && <span className="ns-game-trending">🔥 Trending</span>}
                </div>
                <div className="ns-game-meta">
                  <span>👥 {g.minPlayers}–{g.maxPlayers}</span>
                  <span>⏱ {g.duration}</span>
                  {g.gameType && g.gameType !== "both" && (
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 800,
                      background: g.gameType === "team" ? "#4ECDC4" : "#FFE135",
                      color: "#1a1a2e", borderRadius: 50, padding: "1px 7px",
                      border: "1.5px solid currentColor",
                    }}>
                      {g.gameType === "team" ? "🫂 Team" : "🧍 Individual"}
                    </span>
                  )}
                </div>
                {g.timesPlayed > 0 && (
                  <div className="ns-game-plays">Played {g.timesPlayed}× with the crew</div>
                )}
                {g.tags.length > 0 && (
                  <div className="ns-game-tags">
                    {g.tags.map((t: string) => <span key={t} className="ns-tag">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="ns-game-check">{isSelected(g.id) ? "✓" : ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick-add — always visible at the bottom */}
      {!loading && (
        showQuickAdd ? (
          <div className="ns-quick-add-form">
            <div className="ns-quick-add-title">➕ Quick Add Game</div>
            <div className="ns-quick-add-row">
              {/* Emoji picker */}
              <div style={{ position:"relative" }}>
                <button className="ns-quick-emoji-btn" onClick={() => setQaEmojiOpen(o => !o)} type="button">
                  {qaEmoji}
                </button>
                {qaEmojiOpen && (
                  <div style={{ position:"absolute", top:"110%", left:0, zIndex:50, background:"white", border:"2.5px solid #1a1a2e", borderRadius:14, padding:10, display:"flex", flexWrap:"wrap", gap:6, width:220, boxShadow:"4px 4px 0 #1a1a2e" }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => { setQaEmoji(e); setQaEmojiOpen(false); }}
                        style={{ background:"none", border:"none", cursor:"pointer", fontSize:"1.3rem", padding:"2px 4px", borderRadius:8, transition:"background .1s" }}
                        onMouseEnter={ev => (ev.currentTarget.style.background="#f0f0f0")}
                        onMouseLeave={ev => (ev.currentTarget.style.background="none")}>
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                className="ns-quick-name-input"
                placeholder="Game name…"
                value={qaName}
                onChange={e => setQaName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleQuickSave()}
                autoFocus
              />
              <button className="ns-quick-save-btn" disabled={!qaName.trim() || qaSaving} onClick={handleQuickSave}>
                {qaSaving ? "Saving…" : "Save & Select"}
              </button>
              <button className="ns-quick-cancel-btn" onClick={() => { setShowQuickAdd(false); setQaName(""); setQaEmoji("🎲"); }}>
                Cancel
              </button>
            </div>
            <div style={{ fontSize:"0.7rem", fontWeight:700, opacity:0.4, marginTop:8 }}>
              You can add full details (players, duration, tags) from the Games library later.
            </div>
          </div>
        ) : (
          <button className="ns-quick-add-toggle" onClick={() => setShowQuickAdd(true)}>
            ＋ Add a game that's not in the library
          </button>
        )
      )}
    </div>
  );
}

function StepReview({ form, copied, onCopy, inviteCode }: {
  form: SessionForm; copied: boolean; onCopy: () => void; inviteCode: string | null;
}) {
  const joinUrl = inviteCode
    ? `https://plotnplay.vercel.app/join/${inviteCode}`
    : null;

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
              ["Format", form.playFormat === "individual" ? "🧍 Individual" : `🫂 Teams (${form.teamCount})`],
            ].map(([k, v]) => (
              <div key={k} className="ns-review-row">
                <span className="ns-review-key">{k}</span>
                <span className="ns-review-val">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ns-review-tile">
          <div className="ns-review-tile-head" style={{ background: "#4ECDC4" }}>
            {form.playFormat === "teams" ? `🫂 Teams (${form.teams.length})` : `👥 Players (${form.players.length})`}
          </div>
          <div className="ns-review-tile-body">
            {form.playFormat === "individual" ? (
              form.players.length === 0
                ? <span style={{ opacity: 0.4, fontSize: "0.82rem" }}>No players selected</span>
                : form.players.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color, border: "2px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>{p.emoji}</div>
                      <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{p.name}</span>
                    </div>
                  ))
            ) : (
              form.teams.map(t => {
                const members = form.players.filter(p => t.playerIds.includes(p.id));
                return (
                  <div key={t.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.color, border: "2px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>{t.emoji}</div>
                      <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "0.9rem" }}>{t.name}</span>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, opacity: 0.45 }}>({members.length})</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", paddingLeft: 28 }}>
                      {members.length === 0
                        ? <span style={{ fontSize: "0.72rem", opacity: 0.4 }}>No members</span>
                        : members.map(p => (
                            <span key={p.id} style={{ fontSize: "0.72rem", fontWeight: 800, background: p.color + "44", border: "1.5px solid #1a1a2e", borderRadius: 50, padding: "1px 8px" }}>
                              {p.emoji} {p.name}
                            </span>
                          ))}
                    </div>
                  </div>
                );
              })
            )}
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
          {joinUrl ? (
            // Real code available — session has been created
            <>
              <div className="ns-share-box">
                <span className="ns-share-link">{joinUrl}</span>
                <button className="ns-copy-btn" onClick={onCopy}>
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { label: "📱 WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`Join my game night! 🎲\n${joinUrl}`)}` },
                  { label: "💬 Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(joinUrl)}&text=${encodeURIComponent("Join my game night! 🎲")}` },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "0.78rem", padding: "7px 16px", border: "2px solid #1a1a2e", borderRadius: 50, cursor: "pointer", background: "white", boxShadow: "2px 2px 0 #1a1a2e", textDecoration: "none", color: "#1a1a2e" }}>
                    {label}
                  </a>
                ))}
              </div>
            </>
          ) : (
            // No code yet — session not launched yet
            <div style={{ padding: "14px 18px", background: "#f9f9f9", border: "2px dashed #ccc", borderRadius: 14, fontSize: "0.82rem", fontWeight: 700, color: "#999", textAlign: "center" }}>
              🚀 Launch the session to generate your invite link
            </div>
          )}
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
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const createSession  = useMutation(api.sessions.create);
  const rawUsers       = useQuery(api.users.list);
  const currentUser    = useQuery(api.users.currentUser) as any;
  const isAdmin        = useQuery(api.users.isAdmin, currentUser ? {} : "skip") as boolean | undefined;
  const loadingPlayers = rawUsers === undefined;

  // Redirect non-admins away from this page
  if (currentUser === null) {
    router.replace("/signin");
    return null;
  }
  if (isAdmin === false) {
    router.replace("/sessions");
    return null;
  }
  // Map Convex users to the Player shape used throughout NewSession
  const availablePlayers: Player[] = (rawUsers ?? []).map((u) => ({
    id:    u._id,
    name:  u.nickname  ?? "Unknown",
    emoji: u.avatar    ?? "🎲",
    color: u.color     ?? "#4ECDC4",
  }));
  const [form, setForm] = useState<SessionForm>({
    name: "",
    date: "",
    time: "18:00",
    location: "",
    mode: "quick",
    playFormat: "individual",
    teamCount: 2,
    teams: generateTeams(2),
    players: [],
    games: [],
    allowJoinLink: true,
    timerEnabled: false,
  });

  const progress = ((step - 1) / 3) * 100;

  const handleCopy = () => {
    const url = inviteCode
      ? `https://plotnplay.vercel.app/join/${inviteCode}`
      : "";
    if (url) navigator.clipboard.writeText(url).catch(() => {});
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
            PlotnPlay
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
            {step === 2 && <StepPlayers form={form} setForm={setForm} availablePlayers={availablePlayers} loadingPlayers={loadingPlayers} />}
            {step === 3 && <StepGames form={form} setForm={setForm} />}
            {step === 4 && <StepReview form={form} copied={copied} onCopy={handleCopy} inviteCode={inviteCode} />}

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
                        const playerIds = form.players.map((p) => p.id);

                        // Guard: Convex IDs are long strings, never short numbers.
                        // If we see a short numeric ID it means stale/cached code is running.
                        const badId = playerIds.find((id) => /^\d+$/.test(id));
                        if (badId) {
                          console.error(
                            `[Tucheze254] Bad player ID detected: "${badId}". ` +
                            "This means the old hardcoded AVAILABLE_PLAYERS list is still being used. " +
                            "Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R) and try again."
                          );
                          alert("Player data looks stale. Please hard-refresh the page (Ctrl+Shift+R) and try again.");
                          setLaunching(false);
                          return;
                        }

                        // 1. Save session to Convex and get back its _id + inviteCode
                        const { id: convexId, inviteCode: code } = await createSession({
                          name:      form.name || "Game Night",
                          location:  form.location || "TBD",
                          date:      form.date
                                       ? new Date(`${form.date}T${form.time || "18:00"}`).toISOString()
                                       : new Date().toISOString(),
                          games:     form.games.map((g) => ({
                            name:   g.name,
                            emoji:  g.emoji,
                            gameId: (g.convexId ?? undefined) as any,
                          })),
                          playerIds: playerIds as any,
                          allowJoin: form.allowJoinLink,
                          playFormat: form.playFormat,
                          teams:
                            form.playFormat === "teams"
                            ? form.teams.map((t) => ({
                              id: t.id,
                              name: t.name,
                              emoji: t.emoji,
                              color: t.color,
                              playerIds: t.playerIds as any,
                            }))
                            : undefined,
                          });

                        // Save the real invite code so the review step can display it
                        setInviteCode(code);

                        // 2. Write session data + convexId to sessionStorage for LiveSession
                        const sessionData = {
                          convexId,
                          inviteCode: code,
                          createdBy:  currentUser?._id,
                          name:       form.name || "Game Night",
                          location:   form.location || "TBD",
                          players:    form.players,
                          games:      form.games.map((g) => ({
                            name:     g.name,
                            emoji:    g.emoji,
                            gameId:   g.convexId,
                            gameType: g.gameType ?? "both",
                          })),
                          playFormat: form.playFormat,
                          teams: form.playFormat === "teams"
                            ? form.teams.map((t) => ({
                                id:        t.id,
                                name:      t.name,
                                emoji:     t.emoji,
                                color:     t.color,
                                playerIds: t.playerIds,
                              }))
                            : undefined,
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