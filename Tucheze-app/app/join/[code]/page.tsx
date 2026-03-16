// app/join/[code]/page.tsx
"use client";

import { use } from "react";
import JoinPage from "@/components/JoinPage";

export default function JoinRoute({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  return <JoinPage code={code} />;
}