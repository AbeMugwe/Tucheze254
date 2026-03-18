"use client";

// components/BuzzerOverlay.tsx
// Host-side view inside LiveSession.
// - Shows a permanent shareable link (session ID only — no roundId)
// - Displays winner + buzz order in real-time
// - "Next Question" button resets the round server-side

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Team { id:string; name:string; emoji:string; color:string; playerIds:string[]; }

interface BuzzerOverlayProps {
  sessionId:   string;
  sessionName: string;
  isTeams:     boolean;
  teams?:      Team[];
  onClose:     () => void;
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const css = `
  .bzo-overlay {
    position: fixed; inset: 0; z-index: 800;
    background: rgba(8,8,22,0.96); backdrop-filter: blur(10px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; font-family: 'Nunito', sans-serif;
    animation: bzoFadeIn 0.2s ease;
  }
  @keyframes bzoFadeIn { from{opacity:0} to{opacity:1} }

  .bzo-card {
    background: #16162a; border: 2.5px solid rgba(255,255,255,0.1);
    border-radius: 28px; box-shadow: 0 32px 80px rgba(0,0,0,0.7);
    width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto;
    animation: bzoPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes bzoPop { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }

  /* ── HEADER ── */
  .bzo-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 0;
  }
  .bzo-title {
    font-family: 'Fredoka One', cursive; font-size: 1.35rem;
    color: white; display: flex; align-items: center; gap: 8px;
  }
  .bzo-close {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.55); cursor: pointer; font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .bzo-close:hover { background: rgba(255,255,255,0.14); color: white; }

  /* ── QUESTION COUNTER ── */
  .bzo-question-row {
    display: flex; align-items: center; gap: 8px;
    margin: 10px 24px 0;
  }
  .bzo-question-badge {
    font-family: 'Fredoka One', cursive; font-size: 0.88rem;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 50px; padding: 4px 14px;
  }
  .bzo-open-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #4ECDC4;
    animation: bzoPulse 1.5s ease-in-out infinite;
  }
  @keyframes bzoPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
  .bzo-open-label { font-size: 0.7rem; font-weight: 800; color: #4ECDC4; }

  /* ── SHARE LINK ── */
  .bzo-share { padding: 16px 24px 0; }
  .bzo-share-label {
    font-size: 0.62rem; font-weight: 800;
    color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 1.5px;
    margin-bottom: 8px;
  }
  .bzo-share-box {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 10px 14px;
  }
  .bzo-share-url {
    flex: 1; font-size: 0.76rem; font-weight: 700;
    color: #4ECDC4; word-break: break-all; line-height: 1.4;
  }
  .bzo-copy-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.7rem;
    padding: 6px 14px; border: 1.5px solid rgba(255,255,255,0.18); border-radius: 50px;
    background: rgba(255,255,255,0.07); color: white; cursor: pointer;
    transition: background 0.15s; white-space: nowrap; flex-shrink: 0;
  }
  .bzo-copy-btn:hover { background: rgba(255,255,255,0.14); }
  .bzo-copy-btn.copied { background: #C8F135; color: #1a1a2e; border-color: #C8F135; }
  .bzo-share-note {
    font-size: 0.64rem; font-weight: 700;
    color: rgba(255,255,255,0.22); margin-top: 6px;
  }

  /* ── WINNER BANNER ── */
  .bzo-winner {
    margin: 16px 24px 0; padding: 16px 20px;
    background: linear-gradient(135deg, rgba(255,184,0,0.18), rgba(255,107,107,0.1));
    border: 2px solid rgba(255,184,0,0.38); border-radius: 18px;
    display: flex; align-items: center; gap: 14px;
    animation: bzoWinPop 0.45s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes bzoWinPop { from{transform:scale(0.82);opacity:0} to{transform:scale(1);opacity:1} }
  .bzo-winner-medal { font-size: 2.6rem; flex-shrink: 0; line-height: 1; }
  .bzo-winner-label {
    font-size: 0.6rem; font-weight: 800;
    color: rgba(255,184,0,0.65); text-transform: uppercase; letter-spacing: 1.5px;
    margin-bottom: 3px;
  }
  .bzo-winner-name {
    font-family: 'Fredoka One', cursive; font-size: 1.5rem;
    color: white; line-height: 1.1;
  }
  .bzo-winner-team {
    font-size: 0.8rem; font-weight: 700;
    color: rgba(255,255,255,0.45); margin-top: 3px;
  }

  /* ── EMPTY / WAITING ── */
  .bzo-empty {
    padding: 36px 24px; text-align: center;
  }
  .bzo-empty-icon { font-size: 2.8rem; margin-bottom:10px; opacity:0.35; }
  .bzo-empty-text {
    font-family: 'Fredoka One', cursive; font-size: 1rem;
    color: rgba(255,255,255,0.3); margin-bottom: 5px;
  }
  .bzo-empty-sub { font-size: 0.75rem; font-weight:700; color: rgba(255,255,255,0.18); }

  /* ── ORDER LIST ── */
  .bzo-order { padding: 14px 24px 0; }
  .bzo-order-label {
    font-size: 0.62rem; font-weight: 800;
    color: rgba(255,255,255,0.28); text-transform: uppercase;
    letter-spacing: 1.5px; margin-bottom: 9px;
  }
  .bzo-order-list { display: flex; flex-direction: column; gap: 6px; }
  .bzo-order-item {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.07);
    border-radius: 13px; padding: 10px 13px;
    animation: bzoSlide 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }
  .bzo-order-item.first { background: rgba(255,184,0,0.1); border-color: rgba(255,184,0,0.28); }
  @keyframes bzoSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  .bzo-order-pos { font-family:'Fredoka One',cursive; font-size:1.1rem; width:30px; text-align:center; flex-shrink:0; }
  .bzo-order-dot { width:32px; height:32px; border-radius:50%; border:2px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-family:'Fredoka One',cursive; font-size:0.9rem; color:white; flex-shrink:0; }
  .bzo-order-name { font-weight:800; font-size:0.88rem; color:white; }
  .bzo-order-team { font-size:0.65rem; font-weight:700; color:rgba(255,255,255,0.38); display:flex; align-items:center; gap:4px; margin-top:1px; }
  .bzo-team-dot   { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

  /* ── ACTIONS ── */
  .bzo-actions { padding: 18px 24px 22px; display: flex; gap: 10px; }
  .bzo-next-btn {
    flex: 1; font-family: 'Fredoka One', cursive; font-size: 1.05rem;
    padding: 14px; border: 2.5px solid #FFE135; border-radius: 14px;
    background: #FFE135; color: #1a1a2e; cursor: pointer;
    box-shadow: 0 4px 20px rgba(255,225,53,0.25);
    transition: transform 0.1s, box-shadow 0.1s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .bzo-next-btn:hover:not(:disabled) { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 rgba(255,225,53,0.35); }
  .bzo-next-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .bzo-next-btn.not-started {
    background: #4ECDC4; border-color: #4ECDC4;
    box-shadow: 0 4px 20px rgba(78,205,196,0.25);
  }
`;

const posLabel = (pos: number) => ["🥇","🥈","🥉"][pos-1] ?? `#${pos}`;

export default function BuzzerOverlay({ sessionId, sessionName, isTeams, teams, onClose }: BuzzerOverlayProps) {
  const [copied,    setCopied]    = useState(false);
  const [resetting, setResetting] = useState(false);

  const state    = useQuery(api.buzzers.getState, { sessionId: sessionId as any }) as any;
  const doStart  = useMutation(api.buzzers.start);
  const doReset  = useMutation(api.buzzers.reset);

  // Permanent player URL — session ID only, no roundId
  const buzzerUrl = typeof window !== "undefined"
    ? `${window.location.origin}/buzzer?s=${sessionId}`
    : `https://plotnplay.vercel.app/buzzer?s=${sessionId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(buzzerUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start the buzzer the first time the overlay opens
  useEffect(() => {
    if (state !== undefined && !state?.started) {
      doStart({ sessionId: sessionId as any }).catch(console.error);
    }
  }, [state?.started]);

  const handleNext = async () => {
    setResetting(true);
    try {
      if (!state?.started) {
        await doStart({ sessionId: sessionId as any });
      } else {
        await doReset({ sessionId: sessionId as any });
      }
    } catch (e) { console.error(e); }
    finally { setResetting(false); }
  };

  const buzzes  = state?.buzzes ?? [];
  const winner  = buzzes[0];
  const started = state?.started ?? false;

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="bzo-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bzo-card">

          {/* Header */}
          <div className="bzo-header">
            <div className="bzo-title">🔔 Buzzer — {sessionName}</div>
            <button className="bzo-close" onClick={onClose}>✕</button>
          </div>

          {/* Question counter + open indicator */}
          {started && (
            <div className="bzo-question-row">
              <div className="bzo-question-badge">Question {state.questionNum}</div>
              {state.isOpen && (
                <>
                  <div className="bzo-open-dot" />
                  <div className="bzo-open-label">Open</div>
                </>
              )}
            </div>
          )}

          {/* Share link — permanent, share once */}
          <div className="bzo-share">
            <div className="bzo-share-label">Player Link — share once, works all game</div>
            <div className="bzo-share-box">
              <div className="bzo-share-url">{buzzerUrl}</div>
              <button className={`bzo-copy-btn${copied ? " copied" : ""}`} onClick={handleCopy}>
                {copied ? "✅ Copied!" : "📋 Copy"}
              </button>
            </div>
            <div className="bzo-share-note">
              Players open this link once and keep the tab open. Their button resets automatically every question.
            </div>
          </div>

          {/* Winner banner */}
          {winner ? (
            <div className="bzo-winner">
              <div className="bzo-winner-medal">🥇</div>
              <div>
                <div className="bzo-winner-label">Buzzed First!</div>
                <div className="bzo-winner-name">
                  {winner.teamName
                    ? `${winner.teamName}!!`
                    : `${winner.nickname}!!`}
                </div>
                {winner.teamName && (
                  <div className="bzo-winner-team">
                    Player: {winner.nickname}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bzo-empty">
              <div className="bzo-empty-icon">🔔</div>
              <div className="bzo-empty-text">
                {started ? "Waiting for buzzes…" : "Starting buzzer…"}
              </div>
              <div className="bzo-empty-sub">
                {started
                  ? "Players tap their button on the shared link"
                  : "Share the link above so players can join"}
              </div>
            </div>
          )}

          {/* Buzz order */}
          {buzzes.length > 0 && (
            <div className="bzo-order">
              <div className="bzo-order-label">
                Buzz Order — {buzzes.length} player{buzzes.length !== 1 ? "s" : ""}
              </div>
              <div className="bzo-order-list">
                {buzzes.map((b: any) => (
                  <div key={b._id} className={`bzo-order-item${b.isFirst ? " first" : ""}`}>
                    <div className="bzo-order-pos">{posLabel(b.position)}</div>
                    <div className="bzo-order-dot" style={{ background: b.color }}>
                      {b.nickname?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="bzo-order-name">{b.nickname}</div>
                      {b.teamName && (
                        <div className="bzo-order-team">
                          <div className="bzo-order-team-dot bzo-team-dot" style={{ background: b.teamColor ?? "#4ECDC4" }} />
                          {b.teamName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next question / start button */}
          <div className="bzo-actions">
            <button
              className={`bzo-next-btn${!started ? " not-started" : ""}`}
              onClick={handleNext}
              disabled={resetting}
            >
              {resetting
                ? "Resetting…"
                : !started
                  ? "▶ Start Buzzer"
                  : buzzes.length === 0
                    ? "⏩ Next Question"
                    : "⏩ Next Question"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}