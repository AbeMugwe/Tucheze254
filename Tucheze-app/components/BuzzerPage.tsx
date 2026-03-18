"use client";

// components/BuzzerPage.tsx
// Drop at: app/buzzer/page.tsx (via the route wrapper)
//
// Players visit: plotnplay.vercel.app/buzzer?s=SESSION_ID
// They open this ONCE and keep it open for the whole trivia game.
// The page subscribes to Convex and auto-resets when the host
// moves to the next question — no page refresh or new link needed.

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { overflow: hidden; height: 100%; }

  .bz-root {
    font-family: 'Nunito', sans-serif;
    min-height: 100svh; width: 100vw;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: #1a1a2e;
    background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 28px 28px;
    padding: 24px; position: relative; overflow: hidden;
    user-select: none; -webkit-user-select: none;
  }

  .bz-glow {
    position: absolute; border-radius: 50%; filter: blur(120px);
    pointer-events: none; transition: opacity 0.5s ease, background 0.5s ease;
  }

  /* ── QUESTION COUNTER ── */
  .bz-question-label {
    font-family: 'Fredoka One', cursive;
    font-size: 0.82rem; color: rgba(255,255,255,0.3);
    letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 32px; position: relative; z-index: 1;
  }

  /* ── PROMPT ── */
  .bz-prompt {
    font-family: 'Fredoka One', cursive;
    font-size: 1rem; color: rgba(255,255,255,0.35);
    letter-spacing: 2px; text-transform: uppercase;
    margin-bottom: 36px; position: relative; z-index: 1;
  }

  /* ── THE BUTTON ── */
  .bz-btn-wrap {
    position: relative; z-index: 1;
    display: flex; flex-direction: column; align-items: center; gap: 24px;
  }

  .bz-btn {
    width: min(260px, 68vw); height: min(260px, 68vw);
    border-radius: 50%;
    border: 5px solid rgba(255,255,255,0.9);
    background: #FF6B6B;
    box-shadow: 0 0 0 14px rgba(255,107,107,0.18), 0 20px 60px rgba(255,107,107,0.45);
    cursor: pointer;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 6px;
    transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.3s ease;
    -webkit-tap-highlight-color: transparent;
    position: relative; overflow: hidden;
  }

  /* Shine overlay */
  .bz-btn::after {
    content: '';
    position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(circle at 35% 28%, rgba(255,255,255,0.28), transparent 58%);
    pointer-events: none;
  }

  .bz-btn:active:not([disabled]) {
    transform: scale(0.92);
    box-shadow: 0 0 0 6px rgba(255,107,107,0.3), 0 8px 28px rgba(255,107,107,0.5);
  }

  .bz-btn[disabled] { cursor: default; }

  .bz-btn-text {
    font-family: 'Fredoka One', cursive;
    font-size: 2rem; color: white;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    position: relative; z-index: 1; line-height: 1;
  }
  .bz-btn-sub {
    font-size: 0.9rem; font-weight: 800; color: rgba(255,255,255,0.7);
    position: relative; z-index: 1;
  }

  /* Buzz pulse animation */
  @keyframes bzPulse {
    0%   { box-shadow: 0 0 0 0 rgba(255,107,107,0.8), 0 20px 60px rgba(255,107,107,0.4); }
    60%  { box-shadow: 0 0 0 44px rgba(255,107,107,0), 0 20px 60px rgba(255,107,107,0.4); }
    100% { box-shadow: 0 0 0 44px rgba(255,107,107,0), 0 20px 60px rgba(255,107,107,0.4); }
  }
  .bz-btn.buzzing { animation: bzPulse 0.55s ease-out forwards; }

  /* States */
  .bz-btn.state-buzzed {
    background: #4ECDC4;
    box-shadow: 0 0 0 14px rgba(78,205,196,0.18), 0 20px 60px rgba(78,205,196,0.4);
  }
  .bz-btn.state-first {
    background: linear-gradient(135deg, #FFB800 0%, #FF6B6B 100%);
    box-shadow: 0 0 0 18px rgba(255,184,0,0.2), 0 24px 70px rgba(255,184,0,0.5);
    animation: bzFirstGlow 1.6s ease-in-out infinite alternate;
  }
  @keyframes bzFirstGlow {
    from { box-shadow: 0 0 0 18px rgba(255,184,0,0.15), 0 24px 70px rgba(255,184,0,0.4); }
    to   { box-shadow: 0 0 0 32px rgba(255,184,0,0.04), 0 32px 90px rgba(255,184,0,0.65); }
  }
  .bz-btn.state-closed {
    background: #555; border-color: rgba(255,255,255,0.2);
    box-shadow: 0 0 0 0 transparent, 0 10px 30px rgba(0,0,0,0.3);
  }

  /* ── POSITION BADGE ── */
  .bz-badge {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    color: white;
    background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.18);
    border-radius: 50px; padding: 8px 22px;
    display: flex; align-items: center; gap: 7px;
    animation: bzBadgePop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes bzBadgePop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  .bz-badge.first { background: rgba(255,184,0,0.2); border-color: rgba(255,184,0,0.4); }

  /* ── BUZZ ORDER LIST ── */
  .bz-order {
    position: relative; z-index: 1;
    width: 100%; max-width: 360px; margin-top: 24px;
    display: flex; flex-direction: column; gap: 7px;
    max-height: 30vh; overflow-y: auto;
  }
  .bz-order-item {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 13px; padding: 9px 13px;
    animation: bzItemIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bz-order-item.first { background: rgba(255,184,0,0.12); border-color: rgba(255,184,0,0.3); }
  .bz-order-item.me    { border-color: rgba(78,205,196,0.4); background: rgba(78,205,196,0.08); }
  @keyframes bzItemIn {
    from { opacity:0; transform:translateY(10px) scale(0.95); }
    to   { opacity:1; transform:translateY(0)    scale(1);    }
  }
  .bz-order-pos  { font-family:'Fredoka One',cursive; font-size:1rem; width:26px; text-align:center; flex-shrink:0; }
  .bz-order-dot  { width:26px; height:26px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-family:'Fredoka One',cursive; font-size:0.8rem; color:white; flex-shrink:0; }
  .bz-order-name { flex:1; font-weight:800; font-size:0.85rem; color:white; }
  .bz-order-team { font-size:0.65rem; font-weight:700; color:rgba(255,255,255,0.4); margin-top:1px; }
  .bz-you-tag    { font-size:0.58rem; background:#4ECDC4; color:#1a1a2e; border-radius:50px; padding:1px 7px; font-family:'Fredoka One',cursive; margin-left:5px; }

  /* ── STATUS MESSAGES ── */
  .bz-status {
    position: relative; z-index:1;
    margin-top: 18px; font-size: 0.72rem; font-weight: 800;
    color: rgba(255,255,255,0.22); text-align: center;
  }

  /* ── WAITING / NOT STARTED ── */
  .bz-waiting {
    position: relative; z-index:1;
    text-align: center;
  }
  .bz-waiting-title {
    font-family: 'Fredoka One', cursive; font-size: 1.6rem; color: rgba(255,255,255,0.5);
    margin-bottom: 8px;
  }
  .bz-waiting-sub {
    font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.25);
  }

  /* ── CLOSED ── */
  .bz-closed-msg {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    color: rgba(255,255,255,0.3); margin-top: 16px;
    position: relative; z-index: 1;
  }

  /* ── SPINNER ── */
  .bz-spinner {
    width: 44px; height: 44px;
    border: 4px solid rgba(255,255,255,0.12);
    border-top-color: rgba(255,255,255,0.7);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    position: relative; z-index: 1;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const posLabel = (pos: number) => ["🥇","🥈","🥉"][pos-1] ?? `#${pos}`;

interface BuzzerPageProps {
  sessionId: string;
  teamName?:  string;
  teamColor?: string;
}

export default function BuzzerPage({ sessionId, teamName, teamColor }: BuzzerPageProps) {
  const [buzzing, setBuzzing] = useState(false); // pulse animation flag

  const currentUser = useQuery(api.users.currentUser) as any;
  const state       = useQuery(
    api.buzzers.getState,
    sessionId ? { sessionId: sessionId as any } : "skip"
  ) as any;

  const doBuzz = useMutation(api.buzzers.buzz);

  // Track roundNumber changes — when it changes the host has reset for next question.
  // We don't need local state to clear the button — the Convex query already
  // returns hasBuzzed: false for the new round, so the UI resets automatically.
  const prevRound = useRef<number | null>(null);
  const [justReset, setJustReset] = useState(false);

  useEffect(() => {
    if (state?.roundNumber == null) return;
    if (prevRound.current !== null && prevRound.current !== state.roundNumber) {
      // Host reset — briefly show a "Next question!" flash
      setJustReset(true);
      setTimeout(() => setJustReset(false), 1200);
    }
    prevRound.current = state.roundNumber;
  }, [state?.roundNumber]);

  // ── Buzz sound ──────────────────────────────────────────────────────────
  // Drop your audio file at: public/sounds/buzz.mp3
  // Replace "buzz.mp3" with your actual filename if different.
  const playBuzzSound = () => {
    try {
      const audio = new Audio("/sounds/yeah.mp3");
      audio.volume = 0.8;
      audio.play().catch(() => {}); // silences autoplay policy errors on some browsers
    } catch {
      // ignore — audio is non-critical
    }
  };

  const handleBuzz = async () => {
    if (!currentUser || !sessionId || state?.hasBuzzed || !state?.isOpen) return;
    playBuzzSound();
    setBuzzing(true);
    setTimeout(() => setBuzzing(false), 600);
    try {
      await doBuzz({
        sessionId: sessionId as any,
        teamName:  teamName  ?? undefined,
        teamColor: teamColor ?? undefined,
      });
    } catch (e: any) {
      console.error("Buzz failed:", e.message);
    }
  };

  // Derived state
  const hasBuzzed = state?.hasBuzzed ?? false;
  const isFirst   = state?.myPosition === 1;
  const isOpen    = state?.isOpen ?? false;
  const myPos     = state?.myPosition ?? null;
  const buzzes    = state?.buzzes ?? [];

  // Button state class
  const btnClass = [
    "bz-btn",
    buzzing                    ? "buzzing"      : "",
    hasBuzzed && isFirst       ? "state-first"  : "",
    hasBuzzed && !isFirst      ? "state-buzzed" : "",
    !hasBuzzed && !isOpen && state?.started ? "state-closed" : "",
  ].filter(Boolean).join(" ");

  // Loading
  if (!currentUser || state === undefined) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="bz-root">
          <div className="bz-glow" style={{ width:400, height:400, background:"#FF6B6B", top:-100, right:-100, opacity:0.15 }} />
          <div className="bz-spinner" />
        </div>
      </>
    );
  }

  // No session ID passed
  if (!sessionId) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="bz-root">
          <div className="bz-waiting">
            <div className="bz-waiting-title">No session found</div>
            <div className="bz-waiting-sub">Open the link your host shared with you.</div>
          </div>
        </div>
      </>
    );
  }

  // Host hasn't started the buzzer yet
  if (!state?.started) {
    return (
      <>
        <style>{FONTS}{css}</style>
        <div className="bz-root">
          <div className="bz-glow" style={{ width:400, height:400, background:"#FF6B6B", top:-100, right:-100, opacity:0.12 }} />
          <div className="bz-waiting">
            <div style={{ fontSize:"3.5rem", marginBottom:12 }}>🔔</div>
            <div className="bz-waiting-title">Waiting for host…</div>
            <div className="bz-waiting-sub">The host will open the buzzer when ready.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="bz-root">
        <div className="bz-glow" style={{
          width:480, height:480,
          background: hasBuzzed ? (isFirst ? "#FFB800" : "#4ECDC4") : "#FF6B6B",
          top:-140, right:-140, opacity:0.16,
        }} />
        <div className="bz-glow" style={{ width:300, height:300, background:"#4ECDC4", bottom:-80, left:-80, opacity:0.1 }} />

        {/* Question counter */}
        <div className="bz-question-label">Question {state.questionNum}</div>

        {/* Just reset flash */}
        {justReset && (
          <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(26,26,46,0.92)", animation:"bzoFadeIn 0.15s ease" }}>
            <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"2rem", color:"white", textAlign:"center" }}>
              <div style={{ fontSize:"3rem", marginBottom:8 }}>⏭️</div>
              Next Question!
            </div>
          </div>
        )}

        <div className="bz-btn-wrap">
          {/* The big button */}
          {!hasBuzzed && !isOpen && (
            <div className="bz-prompt">Buzzing closed</div>
          )}
          {!hasBuzzed && isOpen && (
            <div className="bz-prompt">Tap to Buzz</div>
          )}

          <button
            className={btnClass}
            onClick={handleBuzz}
            disabled={hasBuzzed || !isOpen}
          >
            <div className="bz-btn-text">
              {!hasBuzzed
                ? (isOpen ? "BUZZ!" : "—")
                : isFirst ? "FIRST! 🥇" : myPos ? `#${myPos}` : "Buzzed"}
            </div>
            {hasBuzzed && !isFirst && myPos && (
              <div className="bz-btn-sub">
                {myPos === 2 ? "Second" : myPos === 3 ? "Third" : `Position ${myPos}`}
              </div>
            )}
          </button>

          {/* Position badge */}
          {hasBuzzed && myPos && (
            <div className={`bz-badge${isFirst ? " first" : ""}`}>
              {posLabel(myPos)}{" "}
              {isFirst
                ? teamName ? `${teamName} buzzed first!` : "You buzzed first!"
                : `You're #${myPos}`}
            </div>
          )}
        </div>

        {/* Live buzz order */}
        {buzzes.length > 0 && (
          <div className="bz-order">
            {buzzes.map((b: any) => {
              const isMe = b.userId === currentUser?._id;
              return (
                <div key={b._id} className={`bz-order-item${b.isFirst ? " first" : ""}${isMe ? " me" : ""}`}>
                  <div className="bz-order-pos">{posLabel(b.position)}</div>
                  <div className="bz-order-dot" style={{ background: b.color }}>
                    {b.nickname?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="bz-order-name">
                      {b.nickname}
                      {isMe && <span className="bz-you-tag">You</span>}
                    </div>
                    {b.teamName && <div className="bz-order-team">{b.teamName}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status hint */}
        <div className="bz-status">
          {hasBuzzed
            ? "Waiting for host to move to the next question…"
            : isOpen
              ? `${buzzes.length} player${buzzes.length !== 1 ? "s" : ""} buzzed`
              : "Host will open buzzing for the next question"}
        </div>
      </div>
    </>
  );
}