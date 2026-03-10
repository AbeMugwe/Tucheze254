import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Shared player shape ──────────────────────────────────────────────────────

const playerShape = v.object({
  userId:   v.id("users"),
  nickname: v.string(),
  avatar:   v.string(),
  color:    v.string(),
  score:    v.number(),
  rank:     v.number(),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

// All sessions for the current user's group (all sessions for now — scope to group later)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("sessions")
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const live = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

// Create a new session (from NewSession wizard)
export const create = mutation({
  args: {
    name:     v.string(),
    location: v.string(),
    date:     v.string(),
    games: v.array(v.object({
      name:  v.string(),
      emoji: v.string(),
    })),
    // Pass minimal player info; scores start at 0
    playerIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to create a session.");

    // Load player profiles for the snapshot
    const players = await Promise.all(
      args.playerIds.map(async (pid, i) => {
        const u = await ctx.db.get(pid);
        return {
          userId:   pid,
          nickname: u?.nickname ?? "Player",
          avatar:   u?.avatar   ?? "🎲",
          color:    u?.color    ?? "#4ECDC4",
          score:    0,
          rank:     i + 1,
        };
      })
    );

    return await ctx.db.insert("sessions", {
      name:     args.name,
      location: args.location,
      date:     args.date,
      status:   "upcoming",
      games:    args.games,
      players,
      createdBy: userId as any,
    });
  },
});

// Mark session as live (host launches it)
export const goLive = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    await ctx.db.patch(sessionId, { status: "live" });
  },
});

// Update scores during a live session
export const updateScores = mutation({
  args: {
    sessionId: v.id("sessions"),
    players:   v.array(playerShape),
  },
  handler: async (ctx, { sessionId, players }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    await ctx.db.patch(sessionId, { players });
  },
});

// Complete a session — saves final scores, sets winner, increments game play counts
export const complete = mutation({
  args: {
    sessionId:       v.id("sessions"),
    players:         v.array(playerShape),
    totalRounds:     v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { sessionId, players, totalRounds, durationMinutes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    // Sort to find winner
    const ranked = [...players].sort((a, b) => b.score - a.score);
    const top    = ranked[0];
    const winner = top
      ? { userId: top.userId, nickname: top.nickname, avatar: top.avatar, color: top.color }
      : undefined;

    // Patch session to completed
    await ctx.db.patch(sessionId, {
      status: "completed",
      players: ranked.map((p, i) => ({ ...p, rank: i + 1 })),
      winner,
      totalRounds,
      durationMinutes,
    });

    // Increment timesPlayed on each game in this session
    const session = await ctx.db.get(sessionId);
    if (session) {
      for (const game of session.games) {
        // Find matching game by name (best effort)
        const dbGame = await ctx.db
          .query("games")
          .filter((q) => q.eq(q.field("name"), game.name))
          .first();
        if (dbGame) {
          await ctx.db.patch(dbGame._id, {
            timesPlayed: (dbGame.timesPlayed ?? 0) + 1,
            lastPlayed:  new Date().toISOString(),
          });
        }
      }
    }

    // Update win/loss records for each player
    for (const p of ranked) {
      const user = await ctx.db.get(p.userId);
      if (!user) continue;
      const isWinner = p.userId === top?.userId;
      const wins    = (user.wins   ?? 0) + (isWinner ? 1 : 0);
      const losses  = (user.losses ?? 0) + (isWinner ? 0 : 1);
      const total   = wins + losses;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      await ctx.db.patch(p.userId, { wins, losses, winRate });
    }
  },
});