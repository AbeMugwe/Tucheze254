"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

interface ConvexUser {
  _id: string;
  nickname?: string;
  avatar?: string;
  color?: string;
}

const styles= `
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
  .nav-user-name { font-weight: 800; font-size: 0.82rem; }`

export default function Navbar() {
  const { signOut } = useAuthActions();
  const _currentUser = useQuery(api.users.currentUser);
  const currentUser = _currentUser as ConvexUser | null | undefined;

  // undefined = still loading (don't render auth buttons yet to avoid flicker)
  // null      = confirmed logged out
  // object    = confirmed logged in

  return (
    <nav>
      <style>{styles}</style>
      <div className="logo">
        <div className="logo-badge">🎲</div>
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          Tucheze254
        </Link>
      </div>

      <div className="nav-links">
        <Link className="nav-btn" href="/sessions">Sessions</Link>
        <Link className="nav-btn" href="/games">Games</Link>
        <Link className="nav-btn" href="/leaderboard">Leaderboard</Link>

        {/* Only render auth buttons once we know the auth state */}
        {currentUser === undefined ? (
          // Still loading — render an invisible placeholder to prevent layout shift
          <div style={{ width: 160, height: 38 }} />
        ) : currentUser !== null ? (
          // ── LOGGED IN ──
          <>
            <Link className="nav-btn primary" href="/sessions/new">
              + New Session
            </Link>

            <Link
  className="nav-user-chip"
  href="/profile"
  title={currentUser?.nickname ?? ""}
  style={{ textDecoration: "none", color: "inherit" }}
>
  <div
    className="nav-user-avatar"
    style={{ background: currentUser?.color ?? "#4ECDC4" }}
  >
    {currentUser?.avatar ?? "🎲"}
  </div>
  <span className="nav-user-name">
    {currentUser?.nickname ?? "Player"}
  </span>
</Link>

<button className="nav-btn logout" onClick={() => signOut()}>
  👋 Log Out
</button>
          </>
        ) : (
          // ── LOGGED OUT ──
          <>
            <Link className="nav-btn" href="/signin">Log In</Link>
            <Link className="nav-btn primary" href="/signup">Sign Up →</Link>
          </>
        )}
      </div>
    </nav>
  );
}