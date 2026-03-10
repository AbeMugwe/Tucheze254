import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("games").collect();
  },
});

export const getById = query({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
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
    // timesPlayed intentionally omitted — auto-incremented on session complete
    color:       v.string(),
    description: v.string(),
    lastPlayed:  v.optional(v.string()),
    trending:    v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to add a game.");

    return await ctx.db.insert("games", {
      ...args,
      timesPlayed: 0,           // always starts at 0
      ownedByUserIds: [userId],
      createdBy: userId,
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
    // timesPlayed excluded — managed by session completion
    color:       v.string(),
    description: v.string(),
    lastPlayed:  v.optional(v.string()),
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

// Called by the session-complete flow to increment a game's play count
export const incrementPlays = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found.");
    await ctx.db.patch(gameId, {
      timesPlayed: (game.timesPlayed ?? 0) + 1,
    });
  },
});

export const seedThreeGames = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");
    const existing = await ctx.db.query("games").collect();
    if (existing.length > 0) {
      return { inserted: 0, message: "Games already exist." };
    }
  },
});