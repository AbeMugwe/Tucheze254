"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

interface ConvexUser {
  _id: string;
  nickname?: string;
  avatar?: string;
  color?: string;
}

const navStyles = `
  nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px; position: sticky; top: 0; z-index: 200;
    background: var(--white);
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    border-bottom: 3px solid var(--ink, #1a1a2e);
  }
  .logo {
    font-family: 'Fredoka One', cursive; font-size: 1.6rem;
    color: #FF6B6B; text-shadow: 2px 2px 0 #1a1a2e;
    letter-spacing: 1px; display: flex; align-items: center; gap: 8px;
    text-decoration: none; flex-shrink: 0;
  }
  .logo-badge {
    background: #FFE135; border: 2.5px solid #1a1a2e; border-radius: 50%;
    width: 32px; height: 32px; display: flex; align-items: center;
    justify-content: center; font-size: 1rem; box-shadow: 3px 3px 0 #1a1a2e;
    flex-shrink: 0;
  }

  /* ── DESKTOP NAV LINKS ── */
  .nav-links {
    display: flex; gap: 8px; align-items: center;
  }
  .nav-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.82rem;
    padding: 7px 16px; border: 2.5px solid #1a1a2e; border-radius: 50px; cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s; text-decoration: none;
    background: #FFFDF5; color: #1a1a2e; box-shadow: 3px 3px 0 #1a1a2e;
    white-space: nowrap;
  }
  .nav-btn:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .nav-btn.primary { background: #FF6B6B; color: white; }
  .nav-btn.logout  { background: #1a1a2e; color: white; }

  .nav-user-chip {
    display: flex; align-items: center; gap: 8px;
    border: 2.5px solid #1a1a2e; border-radius: 50px;
    padding: 4px 12px 4px 4px;
    background: #FFFDF5; box-shadow: 3px 3px 0 #1a1a2e;
    cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
    text-decoration: none; color: inherit;
  }
  .nav-user-chip:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .nav-user-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid #1a1a2e;
    display: flex; align-items: center; justify-content: center; font-size: 0.9rem;
  }
  .nav-user-name { font-weight: 800; font-size: 0.78rem; }

  /* ── HAMBURGER BUTTON ── */
  .nav-hamburger {
    display: none;
    flex-direction: column; justify-content: center; align-items: center; gap: 5px;
    width: 40px; height: 40px; border: 2.5px solid #1a1a2e; border-radius: 10px;
    background: #FFFDF5; cursor: pointer; box-shadow: 3px 3px 0 #1a1a2e;
    transition: transform 0.1s, box-shadow 0.1s; flex-shrink: 0;
  }
  .nav-hamburger:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 #1a1a2e; }
  .nav-hamburger span {
    display: block; width: 18px; height: 2.5px;
    background: #1a1a2e; border-radius: 2px;
    transition: transform 0.25s, opacity 0.25s;
    transform-origin: center;
  }
  .nav-hamburger.open span:nth-child(1) { transform: translateY(7.5px) rotate(45deg); }
  .nav-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .nav-hamburger.open span:nth-child(3) { transform: translateY(-7.5px) rotate(-45deg); }

  /* ── MOBILE DRAWER ── */
  .nav-mobile-drawer {
    display: none;
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    z-index: 199; pointer-events: none;
  }
  .nav-mobile-drawer.open { display: block; pointer-events: all; }
  .nav-mobile-overlay {
    position: absolute; inset: 0;
    background: rgba(26,26,46,0.5);
    animation: overlayIn 0.2s ease;
  }
  @keyframes overlayIn { from{opacity:0} to{opacity:1} }
  .nav-mobile-panel {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: min(280px, 85vw);
    background: #FFFDF5;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    border-left: 3px solid #1a1a2e;
    box-shadow: -8px 0 40px rgba(0,0,0,0.15);
    display: flex; flex-direction: column;
    padding: 24px 20px;
    animation: slideIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
    overflow-y: auto;
  }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .nav-mobile-user {
    display: flex; align-items: center; gap: 12px;
    padding: 16px; border: 2.5px solid #1a1a2e; border-radius: 16px;
    background: white; box-shadow: 3px 3px 0 #1a1a2e; margin-bottom: 20px;
  }
  .nav-mobile-avatar {
    width: 44px; height: 44px; border-radius: 50%;
    border: 2.5px solid #1a1a2e; display: flex; align-items: center;
    justify-content: center; font-size: 1.4rem; flex-shrink: 0;
  }
  .nav-mobile-nickname { font-family: 'Fredoka One', cursive; font-size: 1.1rem; }
  .nav-mobile-links {
    display: flex; flex-direction: column; gap: 8px; flex: 1;
  }
  .nav-mobile-link {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 16px; border: 2.5px solid #1a1a2e; border-radius: 14px;
    background: white; font-family: 'Nunito', sans-serif; font-weight: 800;
    font-size: 0.92rem; text-decoration: none; color: #1a1a2e;
    box-shadow: 3px 3px 0 #1a1a2e; transition: transform 0.1s, box-shadow 0.1s;
  }
  .nav-mobile-link:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #1a1a2e; }
  .nav-mobile-link.primary { background: #FF6B6B; color: white; border-color: #1a1a2e; }
  .nav-mobile-link.logout  { background: #1a1a2e; color: white; }
  .nav-mobile-close {
    position: absolute; top: 16px; right: 16px;
    width: 32px; height: 32px; border-radius: 50%;
    background: white; border: 2px solid #1a1a2e; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.85rem; box-shadow: 2px 2px 0 #1a1a2e;
  }

  @media (max-width: 768px) {
    .nav-links     { display: none; }
    .nav-hamburger { display: flex; }
    nav            { padding: 12px 16px; }
    .logo          { font-size: 1.4rem; }
    .logo-badge    { width: 28px; height: 28px; font-size: 0.9rem; }
  }
`;

export default function Navbar() {
  const { signOut } = useAuthActions();
  const _currentUser = useQuery(api.users.currentUser);
  const currentUser = _currentUser as ConvexUser | null | undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin      = useQuery(api.users.isAdmin, currentUser ? {} : "skip") as boolean | undefined;

  const close = () => setMenuOpen(false);

  return (
    <>
      <style>{navStyles}</style>
      <nav>
        {/* Logo */}
        <Link href="/" className="logo">
          <div className="logo-badge">🎲</div>
          PlotnPlay
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links">
          <Link className="nav-btn" href="/sessions">Sessions</Link>
          <Link className="nav-btn" href="/games">Games</Link>
          <Link className="nav-btn" href="/leaderboard">Leaderboard</Link>

          {currentUser === undefined ? (
            <div style={{ width: 140, height: 36 }} />
          ) : currentUser !== null ? (
            <>
              {isAdmin && (<Link className="nav-btn primary" href="/sessions/new">+ New Session</Link>)}
              <Link className="nav-user-chip" href="/profile">
                <div className="nav-user-avatar" style={{ background: currentUser.color ?? "#4ECDC4" }}>
                  {currentUser.avatar ?? "🎲"}
                </div>
                <span className="nav-user-name">{currentUser.nickname ?? "Player"}</span>
              </Link>
              <button className="nav-btn logout" onClick={() => signOut()}>👋 Log Out</button>
            </>
          ) : (
            <>
              <Link className="nav-btn" href="/signin">Log In</Link>
              <Link className="nav-btn primary" href="/signup">Sign Up →</Link>
            </>
          )}
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className={`nav-hamburger${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`nav-mobile-drawer${menuOpen ? " open" : ""}`}>
        <div className="nav-mobile-overlay" onClick={close} />
        <div className="nav-mobile-panel">
          <button className="nav-mobile-close" onClick={close}>✕</button>

          {/* User info */}
          {currentUser && (
            <div className="nav-mobile-user">
              <div className="nav-mobile-avatar" style={{ background: currentUser.color ?? "#4ECDC4" }}>
                {currentUser.avatar ?? "🎲"}
              </div>
              <div>
                <div className="nav-mobile-nickname">{currentUser.nickname ?? "Player"}</div>
                <div style={{ fontSize:"0.72rem", fontWeight:700, opacity:0.45 }}>Tap to view profile</div>
              </div>
            </div>
          )}

          <div className="nav-mobile-links">
            <Link className="nav-mobile-link" href="/"            onClick={close}>🏠 Home</Link>
            <Link className="nav-mobile-link" href="/sessions"    onClick={close}>📅 Sessions</Link>
            <Link className="nav-mobile-link" href="/games"       onClick={close}>🎲 Games</Link>
            <Link className="nav-mobile-link" href="/leaderboard" onClick={close}>🏆 Leaderboard</Link>

            {currentUser !== undefined && currentUser !== null ? (
              <>
                <Link className="nav-mobile-link" href="/profile"      onClick={close}>👤 My Profile</Link>
                <Link className="nav-mobile-link primary" href="/sessions/new" onClick={close}>🚀 + New Session</Link>
                <button className="nav-mobile-link logout" style={{ border:"2.5px solid #1a1a2e", cursor:"pointer" }}
                  onClick={() => { signOut(); close(); }}>
                  👋 Log Out
                </button>
              </>
            ) : currentUser === null ? (
              <>
                <Link className="nav-mobile-link" href="/signin" onClick={close}>🔑 Log In</Link>
                <Link className="nav-mobile-link primary" href="/signup" onClick={close}>✨ Sign Up Free</Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}