"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import LiveSession from "@/components/LiveSession";

export default function SessionLivePage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [ready, setReady]             = useState(false);
  const goLive = useMutation(api.sessions.goLive);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tucheze_live_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSessionData(parsed);

        // Mark session as live in Convex as soon as the page loads
        if (parsed.convexId) {
          goLive({ sessionId: parsed.convexId }).catch((err) =>
            console.error("Could not mark session live:", err)
          );
        }
      }
    } catch {
      // ignore parse errors — LiveSession will fall back to demo data
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  return <LiveSession sessionData={sessionData} />;
}