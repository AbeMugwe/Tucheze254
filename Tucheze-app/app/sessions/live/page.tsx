// app/sessions/live/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import LiveSession from "@/components/LiveSession";

export default function SessionLivePage() {
  const [hostData, setHostData] = useState<any>(null);
  const [ready, setReady]       = useState(false);
  const goLive = useMutation(api.sessions.goLive);

  // Read sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tucheze_live_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        setHostData(parsed);
        if (parsed.convexId) {
          goLive({ sessionId: parsed.convexId }).catch(console.error);
        }
      }
    } catch { /* ignore */ }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ALWAYS query the live session from Convex — works for both host and guest.
  // For guests this IS the data source. For host it catches late joiners.
  const convexLive = useQuery(api.sessions.live) as any;

  // Also query by specific ID when host has a convexId (catches inviteCode field)
  const convexById = useQuery(
    api.sessions.getById,
    hostData?.convexId ? { sessionId: hostData.convexId } : "skip"
  ) as any;

  const finalSessionData = useMemo(() => {
  if (!ready) return null;

  // Guest path
  if (!hostData) {
    if (!convexLive) return null;
    return {
      convexId:   convexLive._id,
      name:       convexLive.name,
      location:   convexLive.location,
      inviteCode: convexLive.inviteCode,
      games:      convexLive.games ?? [],
      players:    (convexLive.players ?? []).map((p: any) => ({
        id:    p.userId,
        name:  p.nickname ?? "Player",
        emoji: p.avatar   ?? "🎲",
        color: p.color    ?? "#4ECDC4",
      })),
      playFormat: convexLive.playFormat ?? "individual",
      teams:      convexLive.teams,
    };
  }

  // Host path
  const convexSource = convexById ?? convexLive;
  if (!convexSource?.players) return hostData;

  const existingIds = new Set((hostData.players ?? []).map((p: any) => p.id));
  const lateJoiners = (convexSource.players ?? [])
    .filter((p: any) => !existingIds.has(p.userId))
    .map((p: any) => ({
      id:    p.userId,
      name:  p.nickname ?? "Player",
      emoji: p.avatar   ?? "🎲",
      color: p.color    ?? "#4ECDC4",
    }));

  const mergedPlayers =
    lateJoiners.length === 0
      ? hostData.players
      : [...hostData.players, ...lateJoiners];

  return {
    ...hostData,
    players: mergedPlayers,
    playFormat: convexSource.playFormat ?? hostData.playFormat,
    teams: convexSource.teams ?? hostData.teams,
    inviteCode: convexSource.inviteCode ?? hostData.inviteCode,
  };
}, [ready, hostData, convexLive, convexById]);


  // Don't render until sessionStorage check is done
  if (!ready) return null;

  // Guest with no live session found
  if (!hostData && convexLive === null) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito',sans-serif", background:"#1a1a2e", color:"white", textAlign:"center", padding:24 }}>
        <div>
          <div style={{ fontSize:"3rem", marginBottom:12 }}>🎲</div>
          <div style={{ fontFamily:"'Fredoka One',cursive", fontSize:"1.6rem", marginBottom:8 }}>No live session found</div>
          <div style={{ opacity:0.5, fontSize:"0.9rem", marginBottom:24 }}>There's no game in progress right now.</div>
          <a href="/sessions" style={{ background:"#FF6B6B", color:"white", border:"3px solid white", borderRadius:50, padding:"12px 28px", fontFamily:"'Fredoka One',cursive", fontSize:"1rem", textDecoration:"none" }}>
            📅 View Sessions
          </a>
        </div>
      </div>
    );
  }

  // Still loading Convex for guest
  if (!hostData && convexLive === undefined) return null;

  return <LiveSession sessionData={finalSessionData} />;
}