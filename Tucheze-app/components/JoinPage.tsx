"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JoinPageProps {
  code: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

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

  .jp-root {
    font-family: 'Nunito', sans-serif;
    min-height: 100vh; color: #1a1a2e;
    background-color: var(--navy);
    background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 28px 28px;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 24px;
    position: relative; overflow: hidden;
  }

  /* Ambient glows */
  .jp-glow {
    position: absolute; border-radius: 50%; filter: blur(100px);
    pointer-events: none; opacity: 0.18;
  }

  /* ── LOGO ── */
  .jp-logo {
    position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px;
    text-decoration: none;
  }
  .jp-logo-badge {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--yellow); border: 2.5px solid white;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; box-shadow: 3px 3px 0 rgba(0,0,0,0.2);
  }
  .jp-logo-text {
    font-family: 'Fredoka One', cursive; font-size: 1.4rem;
    color: white; text-shadow: 2px 2px 0 rgba(0,0,0,0.2);
  }

  /* ── CARD ── */
  .jp-card {
    background: var(--white); border: var(--border); border-radius: 28px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    width: 100%; max-width: 480px;
    overflow: hidden; position: relative; z-index: 1;
    animation: cardPop .45s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes cardPop {
    from { opacity: 0; transform: scale(0.88) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* ── SESSION BANNER ── */
  .jp-banner {
    background: var(--navy); padding: 28px 28px 22px;
    position: relative; overflow: hidden;
  }
  .jp-banner-pattern {
    position: absolute; inset: 0; opacity: 0.05;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 24px 24px; pointer-events: none;
  }
  .jp-banner-tag {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255,225,53,0.15); border: 1.5px solid rgba(255,225,53,0.3);
    color: var(--yellow); border-radius: 50px; padding: 3px 12px;
    font-size: 0.68rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 12px; position: relative; z-index: 1;
  }
  .jp-session-name {
    font-family: 'Fredoka One', cursive; font-size: 1.9rem;
    color: white; line-height: 1.1; margin-bottom: 10px;
    position: relative; z-index: 1;
  }
  .jp-meta-row {
    display: flex; gap: 8px; flex-wrap: wrap;
    position: relative; z-index: 1;
  }
  .jp-meta-chip {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.15);
    border-radius: 50px; padding: 4px 12px;
    font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.75);
  }
  .jp-status-chip {
    display: inline-flex; align-items: center; gap: 5px;
    border-radius: 50px; padding: 4px 12px;
    font-size: 0.68rem; font-weight: 800;
    border: 1.5px solid rgba(255,255,255,0.2);
    position: relative; z-index: 1; margin-bottom: 10px;
  }
  .jp-status-dot {
    width: 6px; height: 6px; border-radius: 50%; background: currentColor;
  }

  /* ── BODY ── */
  .jp-body { padding: 24px 28px 28px; }

  /* Games list */
  .jp-games {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
  }
  .jp-game-chip {
    display: flex; align-items: center; gap: 6px;
    background: white; border: 2.5px solid #1a1a2e; border-radius: 50px;
    padding: 5px 14px; font-size: 0.8rem; font-weight: 800;
    box-shadow: 2px 2px 0 #1a1a2e;
  }

  /* Players list */
  .jp-players-label {
    font-size: 0.7rem; font-weight: 800; opacity: 0.45;
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;
  }
  .jp-players {
    display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;
  }
  .jp-player-chip {
    display: flex; align-items: center; gap: 7px;
    background: white; border: 2.5px solid #1a1a2e; border-radius: 50px;
    padding: 5px 13px 5px 6px; font-size: 0.8rem; font-weight: 800;
    box-shadow: 2px 2px 0 #1a1a2e;
  }
  .jp-player-avatar {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid #1a1a2e; display: flex; align-items: center;
    justify-content: center; font-size: 0.8rem;
  }

  /* ── DIVIDER ── */
  .jp-divider {
    height: 2px; background: #eee; border-radius: 2px; margin: 20px 0;
  }

  /* ── JOIN BUTTON ── */
  .jp-join-btn {
    width: 100%; font-family: 'Fredoka One', cursive; font-size: 1.2rem;
    padding: 16px; border: var(--border); border-radius: 16px;
    background: var(--coral); color: white; cursor: pointer;
    box-shadow: var(--shadow-lg); transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-bottom: 12px;
  }
  .jp-join-btn:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 #1a1a2e; }
  .jp-join-btn:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 2px 2px 0 #1a1a2e; }
  .jp-join-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .jp-join-btn.success { background: var(--mint); }
  .jp-join-btn.already { background: var(--lime); color: #1a1a2e; }

  /* Auth prompt */
  .jp-auth-prompt {
    border: var(--border); border-radius: 16px; padding: 18px 20px;
    background: white; box-shadow: var(--shadow); text-align: center;
    margin-bottom: 12px;
  }
  .jp-auth-prompt-title {
    font-family: 'Fredoka One', cursive; font-size: 1.1rem; margin-bottom: 6px;
  }
  .jp-auth-prompt-sub {
    font-size: 0.78rem; font-weight: 700; opacity: 0.5; margin-bottom: 16px; line-height: 1.5;
  }
  .jp-auth-btns { display: flex; gap: 10px; }
  .jp-auth-btn {
    flex: 1; font-family: 'Fredoka One', cursive; font-size: 0.95rem;
    padding: 12px; border: var(--border); border-radius: 12px;
    cursor: pointer; box-shadow: var(--shadow); transition: transform .1s, box-shadow .1s;
    text-decoration: none; display: flex; align-items: center;
    justify-content: center; gap: 6px;
  }
  .jp-auth-btn:hover { transform: translate(-1px,-1px); box-shadow: var(--shadow-lg); }
  .jp-auth-btn.primary { background: var(--coral); color: white; }
  .jp-auth-btn.secondary { background: white; color: #1a1a2e; }

  /* Error / edge case states */
  .jp-state-card {
    background: var(--white); border: var(--border); border-radius: 28px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    width: 100%; max-width: 440px; padding: 48px 36px;
    text-align: center; position: relative; z-index: 1;
    animation: cardPop .45s cubic-bezier(.34,1.56,.64,1);
  }
  .jp-state-icon  { font-size: 4rem; margin-bottom: 14px; }
  .jp-state-title { font-family: 'Fredoka One', cursive; font-size: 1.8rem; margin-bottom: 8px; }
  .jp-state-sub   { font-size: 0.88rem; font-weight: 700; opacity: 0.5; margin-bottom: 28px; line-height: 1.6; }
  .jp-state-btn {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    padding: 13px 32px; border: var(--border); border-radius: 50px;
    background: var(--coral); color: white; cursor: pointer;
    box-shadow: var(--shadow-lg); transition: transform .1s, box-shadow .1s;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
  }
  .jp-state-btn:hover { transform: translate(-2px,-2px); box-shadow: 8px 8px 0 #1a1a2e; }

  /* Skeleton */
  .jp-skel {
    background: linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);
    background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .jp-spinner {
    width: 20px; height: 20px;
    border: 3px solid rgba(255,255,255,0.35);
    border-top-color: white; border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 520px) {
    .jp-root { padding: 16px; }
    .jp-card { border-radius: 22px; }
    .jp-banner { padding: 22px 20px 18px; }
    .jp-session-name { font-size: 1.6rem; }
    .jp-body { padding: 20px 20px 24px; }
    .jp-join-btn { font-size: 1.1rem; padding: 14px; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function statusStyle(status: string) {
  if (status === "live")      return { color: "#FF6B6B", label: "🔴 Live Now" };
  if (status === "upcoming")  return { color: "#4ECDC4", label: "📅 Upcoming" };
  return                             { color: "#C8F135", label: "✅ Completed" };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JoinPage({ code }: JoinPageProps) {
  const router     = useRouter();
  const currentUser = useQuery(api.users.currentUser) as any;
  const session    = useQuery(api.sessions.getByInviteCode, { code });
  const joinByCode = useMutation(api.sessions.joinByCode);

  const [joining,  setJoining]  = useState(false);
  const [result,   setResult]   = useState<"joined" | "already_joined" | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  // Once joined, redirect — live sessions go straight to the tracker, upcoming go to sessions list
  useEffect(() => {
    if (result !== "joined" || !session) return;
    const dest = session.status === "live" ? "/sessions/live" : "/sessions";
    const t = setTimeout(() => router.push(dest), 2000);
    return () => clearTimeout(t);
  }, [result, router, session?.status]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      const res = await joinByCode({ code });
      setResult(res.status as "joined" | "already_joined");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (session === undefined || currentUser === undefined) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="jp-root">
          <div className="jp-glow" style={{ width:500, height:500, background:"#4ECDC4", top:-100, right:-100 }} />
          <div className="jp-glow" style={{ width:400, height:400, background:"#FF6B6B", bottom:-80, left:-80 }} />
          <Link href="/" className="jp-logo">
            <div className="jp-logo-badge">🎲</div>
            <span className="jp-logo-text">PlotnPlay</span>
          </Link>
          <div className="jp-card">
            <div className="jp-banner" style={{ minHeight: 120 }}>
              <div className="jp-banner-pattern" />
              <div className="jp-skel" style={{ width:80, height:18, marginBottom:14 }} />
              <div className="jp-skel" style={{ width:"70%", height:32, marginBottom:10 }} />
              <div style={{ display:"flex", gap:8 }}>
                <div className="jp-skel" style={{ width:100, height:24, borderRadius:50 }} />
                <div className="jp-skel" style={{ width:80,  height:24, borderRadius:50 }} />
              </div>
            </div>
            <div className="jp-body">
              <div className="jp-skel" style={{ width:"100%", height:52, borderRadius:16, marginBottom:12 }} />
              <div className="jp-skel" style={{ width:"100%", height:52, borderRadius:16 }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Invalid code ─────────────────────────────────────────────────────────
  if (!session) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="jp-root">
          <div className="jp-glow" style={{ width:400, height:400, background:"#FF6B6B", top:-80, right:-80 }} />
          <Link href="/" className="jp-logo">
            <div className="jp-logo-badge">🎲</div>
            <span className="jp-logo-text">PlotnPlay</span>
          </Link>
          <div className="jp-state-card">
            <div className="jp-state-icon">🔍</div>
            <div className="jp-state-title">Link not found</div>
            <div className="jp-state-sub">
              This invite link is invalid or has expired. Ask your host for a fresh one.
            </div>
            <Link href="/" className="jp-state-btn">🏠 Go Home</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Session completed ─────────────────────────────────────────────────────
  if (session.status === "completed") {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="jp-root">
          <div className="jp-glow" style={{ width:400, height:400, background:"#FFE135", top:-80, left:-80 }} />
          <Link href="/" className="jp-logo">
            <div className="jp-logo-badge">🎲</div>
            <span className="jp-logo-text">PlotnPlay</span>
          </Link>
          <div className="jp-state-card">
            <div className="jp-state-icon">🏁</div>
            <div className="jp-state-title">Session ended</div>
            <div className="jp-state-sub">
              <strong>{session.name}</strong> has already been played.
              {(session as any).winner && ` ${(session as any).winner.nickname} took the win!`}
            </div>
            <Link href="/sessions" className="jp-state-btn">📅 View Sessions</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Join disabled ─────────────────────────────────────────────────────────
  if (!session.allowJoin) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="jp-root">
          <div className="jp-glow" style={{ width:400, height:400, background:"#FF9ECD", top:-80, right:-80 }} />
          <Link href="/" className="jp-logo">
            <div className="jp-logo-badge">🎲</div>
            <span className="jp-logo-text">PlotnPlay</span>
          </Link>
          <div className="jp-state-card">
            <div className="jp-state-icon">🔒</div>
            <div className="jp-state-title">Joining disabled</div>
            <div className="jp-state-sub">
              The host has closed this invite link. You can't join <strong>{session.name}</strong> right now.
            </div>
            <Link href="/" className="jp-state-btn">🏠 Go Home</Link>
          </div>
        </div>
      </>
    );
  }

  // ── Main join page ────────────────────────────────────────────────────────
  const st        = statusStyle(session.status);
  const players   = (session as any).players ?? [];
  const games     = (session as any).games   ?? [];
  const isAlreadyIn = players.some((p: any) => p.userId === currentUser?._id);

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="jp-root">
        <div className="jp-glow" style={{ width:500, height:500, background:"#4ECDC4", top:-100, right:-100 }} />
        <div className="jp-glow" style={{ width:400, height:400, background:"#FF6B6B", bottom:-80, left:-80 }} />
        <div className="jp-glow" style={{ width:300, height:300, background:"#FFE135", top:"40%", left:"30%" }} />

        <Link href="/" className="jp-logo">
          <div className="jp-logo-badge">🎲</div>
          <span className="jp-logo-text">PlotnPlay</span>
        </Link>

        <div className="jp-card">
          {/* Session banner */}
          <div className="jp-banner">
            <div className="jp-banner-pattern" />
            <div className="jp-banner-tag">🎮 You're Invited</div>
            <div
              className="jp-status-chip"
              style={{ background: st.color + "22", color: st.color, marginBottom: 8 }}
            >
              <div className="jp-status-dot" style={{ background: st.color }} />
              {st.label}
            </div>
            <div className="jp-session-name">{session.name}</div>
            <div className="jp-meta-row">
              <div className="jp-meta-chip">📍 {session.location}</div>
              <div className="jp-meta-chip">📅 {formatDate(session.date)}</div>
              <div className="jp-meta-chip">👥 {players.length} player{players.length !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Body */}
          <div className="jp-body">
            {/* Live game notice */}
            {session.status === "live" && (
              <div style={{
                background: "#FF6B6B22", border: "2px solid #FF6B6B",
                borderRadius: 12, padding: "10px 14px", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
                fontSize: "0.82rem", fontWeight: 700,
              }}>
                <span style={{ fontSize: "1rem" }}>🔴</span>
                <span>This game is <strong>live right now</strong> — you'll join and start scoring immediately.</span>
              </div>
            )}
            {/* Games */}
            {games.length > 0 && (
              <>
                <div className="jp-players-label">Games on the menu</div>
                <div className="jp-games">
                  {games.map((g: any, i: number) => (
                    <div key={i} className="jp-game-chip">
                      <span>{g.emoji}</span> {g.name}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Players already in */}
            {players.length > 0 && (
              <>
                <div className="jp-players-label">
                  Who's in ({players.length})
                </div>
                <div className="jp-players">
                  {players.map((p: any) => (
                    <div key={p.userId} className="jp-player-chip">
                      <div className="jp-player-avatar" style={{ background: p.color }}>
                        {p.avatar}
                      </div>
                      {p.nickname}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="jp-divider" />

            {/* ── JOIN BUTTON or AUTH PROMPT ── */}
            {currentUser ? (
              // Logged in — show join button
              <>
                {result === "joined" ? (
                  <button className="jp-join-btn success" disabled>
                    ✅ You're in! {session.status === "live" ? "Joining the game…" : "Heading to sessions…"}
                  </button>
                ) : result === "already_joined" || isAlreadyIn ? (
                  <button className="jp-join-btn already" disabled>
                    🙌 You're already in this session!
                  </button>
                ) : (
                  <button
                    className="jp-join-btn"
                    disabled={joining}
                    onClick={handleJoin}
                  >
                    {joining ? (
                      <><div className="jp-spinner" /> Joining…</>
                    ) : (
                      <>🙌 I'm In!</>
                    )}
                  </button>
                )}

                {error && (
                  <div style={{
                    background: "#fff0f0", border: "2px solid #FF6B6B", borderRadius: 12,
                    padding: "10px 14px", fontSize: "0.8rem", fontWeight: 700,
                    color: "#FF6B6B", display: "flex", alignItems: "center", gap: 8, marginTop: 8,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ textAlign:"center", fontSize:"0.72rem", fontWeight:700, opacity:0.4, marginTop:10 }}>
                  Joining as <strong>{currentUser.avatar} {currentUser.nickname}</strong>
                </div>
              </>
            ) : currentUser === null ? (
              // Not logged in — show auth prompt
              <div className="jp-auth-prompt">
                <div className="jp-auth-prompt-title">Sign in to join 🔑</div>
                <div className="jp-auth-prompt-sub">
                  You need a PlotnPlay account to join this session. It's free and takes 30 seconds.
                </div>
                <div className="jp-auth-btns">
                  <Link
                    href={`/signup?redirect=/join/${code}`}
                    className="jp-auth-btn primary"
                  >
                    ✨ Sign Up Free
                  </Link>
                  <Link
                    href={`/signin?redirect=/join/${code}`}
                    className="jp-auth-btn secondary"
                  >
                    🔑 Log In
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Invite code display */}
            <div style={{
              marginTop: 16, textAlign: "center",
              fontSize: "0.7rem", fontWeight: 800, opacity: 0.3,
            }}>
              Invite code: <span style={{ fontFamily:"'Fredoka One',cursive", letterSpacing:2 }}>{code}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}