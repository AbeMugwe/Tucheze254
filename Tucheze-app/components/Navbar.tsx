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

export default function Navbar() {
  const { signOut } = useAuthActions();
  const _currentUser = useQuery(api.users.currentUser);
  const currentUser = _currentUser as ConvexUser | null | undefined;

  // undefined = still loading (don't render auth buttons yet to avoid flicker)
  // null      = confirmed logged out
  // object    = confirmed logged in

  return (
    <nav>
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
              title={currentUser.nickname ?? ""}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="nav-user-avatar"
                style={{ background: currentUser.color ?? "#4ECDC4" }}
              >
                {currentUser.avatar ?? "🎲"}
              </div>
              <span className="nav-user-name">
                {currentUser.nickname ?? "Player"}
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