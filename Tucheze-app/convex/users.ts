import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the full profile of the currently signed-in user,
 * or null if they are not authenticated.
 *
 * Usage in components:
 *   const currentUser = useQuery(api.users.currentUser);
 *   // undefined  → still loading
 *   // null       → not signed in
 *   // { ... }    → signed in, full profile
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_email")
      .filter((q) => q.eq(q.field("_id"), userId))
      .unique();
  },
});

/**
 * Returns the top N players sorted by ELO descending.
 * Used by the leaderboard on the home page.
 *
 * Usage:
 *   const leaderboard = useQuery(api.users.leaderboard, { limit: 10 });
 */
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("users")
      .withIndex("by_elo")
      .order("desc")
      .take(10);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates the user profile row after a successful signup.
 * Call this immediately after signIn("password", { flow: "signUp", ... }).
 *
 * Usage in SignUp.tsx:
 *   const createProfile = useMutation(api.users.createProfile);
 *   await createProfile({ nickname, avatar, color, playStyle });
 */
export const createProfile = mutation({
  args: {
    nickname:  v.string(),
    avatar:    v.string(),
    color:     v.string(),
    playStyle: v.array(v.string()),
    email:     v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Prevent duplicate profiles if the mutation is called twice
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      email:     args.email,
      nickname:  args.nickname,
      avatar:    args.avatar,
      color:     args.color,
      playStyle: args.playStyle,
      elo:       1000,   // starting ELO
      wins:      0,
      losses:    0,
      winRate:   0,
      badge:     "🆕 Newcomer",
    });
  },
});

/**
 * Updates a user's ELO, wins, losses and recalculates win rate.
 * Called at the end of a session when results are recorded.
 *
 * Usage:
 *   const recordResult = useMutation(api.users.recordResult);
 *   await recordResult({ userId, won: true });
 */
export const recordResult = mutation({
  args: {
    userId: v.id("users"),
    won:    v.boolean(),
    eloChange: v.number(),   // positive = gained, negative = lost
  },
  handler: async (ctx, { userId, won, eloChange }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const wins   = user.wins   + (won ? 1 : 0);
    const losses = user.losses + (won ? 0 : 1);
    const total  = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const elo     = Math.max(0, user.elo + eloChange);

    await ctx.db.patch(userId, { wins, losses, winRate, elo });
  },
});