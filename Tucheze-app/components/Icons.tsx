// components/Icons.tsx
// All UI icons used across Tucheze254.
// Uses inline SVG paths — no external dependency needed.
// Avatar SVGs are separate (see /public/avatars/).

import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

const defaults = { size: 20, color: "currentColor", strokeWidth: 2 };

function Svg({ size, color, strokeWidth, children, className, style }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size ?? defaults.size}
      height={size ?? defaults.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? defaults.color}
      strokeWidth={strokeWidth ?? defaults.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function IconHome(p: IconProps) {
  return <Svg {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></Svg>;
}
export function IconCalendar(p: IconProps) {
  return <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Svg>;
}
export function IconDice(p: IconProps) {
  return <Svg {...p}><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></Svg>;
}
export function IconTrophy(p: IconProps) {
  return <Svg {...p}><path d="M8 21h8m-4-4v4M5 3H3a2 2 0 000 4c0 3 2 5.5 4 6.5M19 3h2a2 2 0 010 4c0 3-2 5.5-4 6.5M5 3h14v7a7 7 0 01-14 0V3z"/></Svg>;
}
export function IconUser(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></Svg>;
}
export function IconUsers(p: IconProps) {
  return <Svg {...p}><circle cx="9" cy="7" r="3.5"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="8" r="2.5"/><path d="M22 20c0-2.5-2.2-4.5-5-4.5"/></Svg>;
}
export function IconLogOut(p: IconProps) {
  return <Svg {...p}><path d="M9 21H4a1 1 0 01-1-1V4a1 1 0 011-1h5"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>;
}
export function IconLogIn(p: IconProps) {
  return <Svg {...p}><path d="M15 3h4a1 1 0 011 1v16a1 1 0 01-1 1h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></Svg>;
}
export function IconMenu(p: IconProps) {
  return <Svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Svg>;
}
export function IconX(p: IconProps) {
  return <Svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;
}
export function IconPlus(p: IconProps) {
  return <Svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>;
}
export function IconRocket(p: IconProps) {
  return <Svg {...p}><path d="M12 2C6.5 8 5 13 5 16a7 7 0 0014 0c0-3-1.5-8-7-14z"/><path d="M12 16v6"/><path d="M9 19h6"/><circle cx="12" cy="11" r="2"/></Svg>;
}
export function IconKey(p: IconProps) {
  return <Svg {...p}><circle cx="7.5" cy="15.5" r="4.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/></Svg>;
}
export function IconSparkle(p: IconProps) {
  return <Svg {...p}><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></Svg>;
}

// ── Stats / Content ───────────────────────────────────────────────────────────

export function IconGamepad(p: IconProps) {
  return <Svg {...p}><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M7 13h4m-2-2v4"/><circle cx="17" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/></Svg>;
}
export function IconFlag(p: IconProps) {
  return <Svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></Svg>;
}
export function IconParty(p: IconProps) {
  return <Svg {...p}><path d="M5.8 11.3L2 22l10.7-3.79M4 3h.01M22 8h.01M15 2h.01M22 20h.01M11 7L9.7 3.3a1 1 0 00-1.9.2l-.6 5.6M19 17l.6-5.6a1 1 0 00-1.9-.2L16.3 15"/><path d="M14.4 13.5L9 7.8 3.5 14.2 9 20.5l5.5-7z"/></Svg>;
}
export function IconTarget(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Svg>;
}
export function IconZap(p: IconProps) {
  return <Svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
}
export function IconStar(p: IconProps) {
  return <Svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;
}
export function IconMedal(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="15" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/><path d="M15 7a3 3 0 10-6 0"/></Svg>;
}
export function IconMapPin(p: IconProps) {
  return <Svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></Svg>;
}
export function IconClock(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
}
export function IconLink(p: IconProps) {
  return <Svg {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></Svg>;
}
export function IconCopy(p: IconProps) {
  return <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></Svg>;
}
export function IconCheck(p: IconProps) {
  return <Svg {...p}><polyline points="20 6 9 17 4 12"/></Svg>;
}
export function IconChevronRight(p: IconProps) {
  return <Svg {...p}><polyline points="9 18 15 12 9 6"/></Svg>;
}
export function IconChevronDown(p: IconProps) {
  return <Svg {...p}><polyline points="6 9 12 15 18 9"/></Svg>;
}
export function IconSearch(p: IconProps) {
  return <Svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>;
}
export function IconEdit(p: IconProps) {
  return <Svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>;
}
export function IconTrash(p: IconProps) {
  return <Svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></Svg>;
}
export function IconBarChart(p: IconProps) {
  return <Svg {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>;
}
export function IconShield(p: IconProps) {
  return <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Svg>;
}
export function IconLock(p: IconProps) {
  return <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></Svg>;
}
export function IconRadio(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/></Svg>;
}
export function IconRefresh(p: IconProps) {
  return <Svg {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></Svg>;
}
export function IconVote(p: IconProps) {
  return <Svg {...p}><path d="M9 12l2 2 4-4"/><path d="M5 7l2-2h10l2 2"/><rect x="3" y="7" width="18" height="13" rx="2"/></Svg>;
}
export function IconSave(p: IconProps) {
  return <Svg {...p}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Svg>;
}
export function IconInfo(p: IconProps) {
  return <Svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Svg>;
}
export function IconLive(p: IconProps) {
  // Pulsing circle — used for "Live" badge dot
  return <Svg {...p}><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8"/></Svg>;
}

// ── Avatar placeholder ────────────────────────────────────────────────────────
// Used as fallback when no custom SVG avatar is set.
export function IconAvatarDefault({ size = 36, color = "#4ECDC4" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill={color}/>
      <circle cx="18" cy="14" r="6" fill="white" opacity="0.9"/>
      <path d="M6 32c0-6.627 5.373-10 12-10s12 3.373 12 10" fill="white" opacity="0.9"/>
    </svg>
  );
}