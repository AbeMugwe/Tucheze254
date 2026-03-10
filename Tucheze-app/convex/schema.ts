import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email:     v.string(),
    nickname:  v.optional(v.string()),
    avatar:    v.optional(v.string()),
    color:     v.optional(v.string()),
    playStyle: v.optional(v.array(v.string())),
    elo:       v.optional(v.number()),
    wins:      v.optional(v.number()),
    losses:    v.optional(v.number()),
    winRate:   v.optional(v.number()),
    badge:     v.optional(v.string()),
  })
    .index("by_email",    ["email"])
    .index("by_elo",      ["elo"])
    .index("by_win_rate", ["winRate"]),

  games: defineTable({
    name:           v.string(),
    emoji:          v.string(),
    category:       v.string(),
    players:        v.string(),
    duration:       v.string(),
    difficulty:     v.union(v.literal(1), v.literal(2), v.literal(3)),
    tags:           v.array(v.string()),
    rating:         v.number(),
    timesPlayed:    v.number(),
    ownedByUserIds: v.array(v.id("users")),
    createdBy:      v.id("users"),
    color:          v.string(),
    description:    v.string(),
    lastPlayed:     v.optional(v.string()),
    trending:       v.optional(v.boolean()),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_category",   ["category"])
    .index("by_trending",   ["trending"]),

  sessions: defineTable({
    name:            v.string(),
    location:        v.string(),
    date:            v.string(),                       // ISO date string
    status:          v.union(
                       v.literal("upcoming"),
                       v.literal("live"),
                       v.literal("completed")
                     ),
    // Snapshot of games played (name + emoji, not IDs, in case games are deleted)
    games: v.array(v.object({
      name:  v.string(),
      emoji: v.string(),
    })),
    // Player scores — stored as a snapshot so historical data is stable
    players: v.array(v.object({
      userId:   v.id("users"),
      nickname: v.string(),
      avatar:   v.string(),
      color:    v.string(),
      score:    v.number(),
      rank:     v.number(),
    })),
    winner: v.optional(v.object({
      userId:   v.id("users"),
      nickname: v.string(),
      avatar:   v.string(),
      color:    v.string(),
    })),
    totalRounds:     v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    createdBy:       v.id("users"),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_status",     ["status"])
    .index("by_date",       ["date"]),
});