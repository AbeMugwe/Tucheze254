// app/buzzer/page.tsx
// Players visit: plotnplay.vercel.app/buzzer?s=SESSION_ID
// They open this once and keep the tab open — no new link needed per question.
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BuzzerPage from "@/components/BuzzerPage";

function BuzzerRoute() {
  const params    = useSearchParams();
  const sessionId = params.get("s") ?? "";
  const teamName  = params.get("t") ?? undefined;
  const teamColor = params.get("c") ?? undefined;

  return <BuzzerPage sessionId={sessionId} teamName={teamName} teamColor={teamColor} />;
}

export default function BuzzerRoutePage() {
  return (
    <Suspense>
      <BuzzerRoute />
    </Suspense>
  );
}