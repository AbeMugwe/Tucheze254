import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Trending threshold — a game with this many plays or more is marked trending
const TRENDING_THRESHOLD = 5;

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").collect();
  },
});

export const getById = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.get(gameId);
  },
});

export const add = mutation({
  args: {
    name:        v.string(),
    emoji:       v.string(),
    category:    v.string(),
    players:     v.string(),
    duration:    v.string(),
    difficulty:  v.union(v.literal(1), v.literal(2), v.literal(3)),
    tags:        v.array(v.string()),
    rating:      v.number(),
    color:       v.string(),
    description: v.string(),
    lastPlayed:  v.optional(v.string()),
    gameType:    v.optional(v.union(v.literal("individual"), v.literal("team"), v.literal("both"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to add a game.");
    return await ctx.db.insert("games", {
      ...args,
      timesPlayed:    0,
      trending:       false,
      ownedByUserIds: [userId],
      createdBy:      userId,
    });
  },
});

export const update = mutation({
  args: {
    id:          v.id("games"),
    name:        v.string(),
    emoji:       v.string(),
    category:    v.string(),
    players:     v.string(),
    duration:    v.string(),
    difficulty:  v.union(v.literal(1), v.literal(2), v.literal(3)),
    tags:        v.array(v.string()),
    rating:      v.number(),
    color:       v.string(),
    description: v.string(),
    lastPlayed:  v.optional(v.string()),
    gameType:    v.optional(v.union(v.literal("individual"), v.literal("team"), v.literal("both"))),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to edit a game.");
    const game = await ctx.db.get(id);
    if (!game) throw new Error("Game not found.");
    const isOwner = game.ownedByUserIds.some(
      (uid: string) => uid === (userId as unknown as string)
    );
    if (!isOwner) throw new Error("You don't have permission to edit this game.");
    await ctx.db.patch(id, fields);
  },
});

// Increment play count by game ID — also auto-sets trending when threshold is reached
export const incrementPlays = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found.");
    const newCount = (game.timesPlayed ?? 0) + 1;
    await ctx.db.patch(gameId, {
      timesPlayed: newCount,
      lastPlayed:  new Date().toISOString(),
      trending:    newCount >= TRENDING_THRESHOLD,
    });
  },
});

// Increment by name (fallback for sessions that stored name instead of ID)
// Also auto-sets trending when threshold is reached
export const incrementPlaysByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    const game = await ctx.db
      .query("games")
      .filter((q) => q.eq(q.field("name"), name))
      .first();
    if (!game) return; // game may have been deleted — silently skip
    const newCount = (game.timesPlayed ?? 0) + 1;
    await ctx.db.patch(game._id, {
      timesPlayed: newCount,
      lastPlayed:  new Date().toISOString(),
      trending:    newCount >= TRENDING_THRESHOLD,
    });
  },
});

export const seedThreeGames = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");
    const existing = await ctx.db.query("games").collect();
    if (existing.length > 0) return { inserted: 0, message: "Games already exist." };
  },
});