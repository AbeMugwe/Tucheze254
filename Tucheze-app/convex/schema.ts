import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const teamShape = v.object({
  id: v.string(),
  name: v.string(),
  emoji: v.string(),
  color: v.string(),
  playerIds: v.array(v.id("users")),
});

export default defineSchema({
  
  ...authTables,

  users: defineTable({
    email:        v.optional(v.string()),
    nickname:     v.optional(v.string()),
    avatar:       v.optional(v.string()),
    color:        v.optional(v.string()),
    playStyle:    v.optional(v.array(v.string())),
    // ── legacy ELO (kept so existing data doesn't break) ──
    elo:          v.optional(v.number()),
    // ── new points system ──
    points:       v.optional(v.number()),   // starts at 0, can go negative
    previousRank: v.optional(v.number()),   // rank snapshot before last update
    wins:         v.optional(v.number()),
    losses:       v.optional(v.number()),
    winRate:      v.optional(v.number()),   // (wins / games) * 100, rounded
    badge:        v.optional(v.string()),   // kept for backwards compat, derived on frontend now
  })
    .index("by_email",    ["email"])
    .index("by_elo",      ["elo"])          // kept for backwards compat
    .index("by_points",   ["points"])       // new primary leaderboard index
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
    gameType:       v.optional(v.union(v.literal("individual"), v.literal("team"), v.literal("both"))),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_category",   ["category"])
    .index("by_trending",   ["trending"]),

  sessions: defineTable({
    name:            v.string(),
    location:        v.string(),
    date:            v.string(),
    status:          v.union(
                       v.literal("upcoming"),
                       v.literal("live"),
                       v.literal("completed")
                     ),
    games: v.array(v.object({
      name:   v.string(),
      emoji:  v.string(),
      gameId: v.optional(v.id("games")),
    })),
    players: v.array(v.object({
      userId:   v.id("users"),
      nickname: v.string(),
      avatar:   v.string(),
      color:    v.string(),
      score:    v.number(),
      rank:     v.number(),
    })),
    playFormat: v.optional(
      v.union(v.literal("individual"), v.literal("teams"))
    ),
    teams: v.optional(v.array(teamShape)),
    winner: v.optional(v.object({
      userId:   v.id("users"),
      nickname: v.string(),
      avatar:   v.string(),
      color:    v.string(),
    })),
    teamWinner: v.optional(v.object({
      name:             v.string(),
      emoji:            v.string(),
      color:            v.string(),
      memberNicknames:  v.array(v.string()),
    })),
    roundWinners: v.optional(v.array(v.object({
      gameIndex: v.number(),
      gameName:  v.string(),
      gameEmoji: v.string(),
      nickname:  v.string(),
      avatar:    v.string(),
      color:     v.string(),
      score:     v.number(),
    }))),
    totalRounds:     v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    createdBy:       v.id("users"),
    inviteCode:      v.optional(v.string()),
    allowJoin:       v.optional(v.boolean()),
  })
    .index("by_created_by",  ["createdBy"])
    .index("by_status",      ["status"])
    .index("by_date",        ["date"])
    .index("by_invite_code", ["inviteCode"]),

  polls: defineTable({
    question:  v.string(),
    createdBy: v.id("users"),
    closesAt:  v.string(),
    closed:    v.boolean(),
    options:   v.array(v.object({
      game:    v.string(),
      emoji:   v.string(),
      votes:   v.array(v.id("users")),
    })),
  })
    .index("by_closed", ["closed"]),

  buzzerRounds: defineTable({
    sessionId:    v.id("sessions"),
    roundNumber:  v.number(),
    questionNum:  v.number(),
    isOpen:       v.boolean(),
  })
    .index("by_session", ["sessionId"]),

  buzzes: defineTable({
    sessionId:   v.id("sessions"),
    roundNumber: v.number(),
    userId:      v.id("users"),
    nickname:    v.string(),
    color:       v.string(),
    teamName:    v.optional(v.string()),
    teamColor:   v.optional(v.string()),
  })
    .index("by_session_round", ["sessionId", "roundNumber"]),
});