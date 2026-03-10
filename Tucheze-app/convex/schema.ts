import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Required by Convex Auth — do not remove
  ...authTables,

  // Extended user profile — created after signup
  users: defineTable({
    // Links to the auth identity (populated by Convex Auth)
    email:     v.string(),
    nickname:  v.string(),
    avatar:    v.string(),   // emoji e.g. "😎"
    color:     v.string(),   // hex e.g. "#4ECDC4"
    playStyle: v.array(v.string()),

    // Stats — updated by mutations as games are played
    elo:     v.number(),
    wins:    v.number(),
    losses:  v.number(),
    winRate: v.number(),     // 0–100, recalculated on each result
    badge:   v.string(),     // e.g. "🔥 Comeback King"
  })
    .index("by_email",    ["email"])
    .index("by_elo",      ["elo"])
    .index("by_win_rate", ["winRate"]),
});