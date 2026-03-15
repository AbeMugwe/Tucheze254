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
    return await ctx.db.get(userId as any);
  },
});

/**
 * Checks whether an email is already registered.
 * Call this in SignUp before attempting signIn({ flow: "signUp" })
 * to prevent duplicate accounts.
 */
export const checkEmailExists = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Convex Auth stores credentials in authAccounts, not our custom users table
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();
    return account !== null;
  },
});

/**
 * Returns all users with a completed profile (has nickname).
 * Used by NewSession to populate the player picker with real Convex IDs.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db.query("users").collect();
    // Only return users who have completed their profile
    return all.filter((u) => u.nickname);
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
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const users = await ctx.db
      .query("users")
      .withIndex("by_elo")
      .order("desc")
      .collect();

    // Only return users with a completed profile
    const ranked = users.filter((u: any) => u.nickname);
    return limit ? ranked.slice(0, limit) : ranked;
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(userId as any);

    if (!existing) {
      // Auth row not written yet — throw so caller can retry
      throw new Error("AUTH_ROW_NOT_READY");
    }

    const doc = existing as any;
    await ctx.db.patch(userId as any, {
      nickname:  args.nickname,
      avatar:    args.avatar,
      color:     args.color,
      playStyle: args.playStyle,
      elo:       doc.elo     ?? 1000,
      wins:      doc.wins    ?? 0,
      losses:    doc.losses  ?? 0,
      winRate:   doc.winRate ?? 0,
      badge:     doc.badge   ?? "🆕 Newcomer",
    });
    return userId;
  },
});

/**
 * Get any user by ID — used by the profile page for viewing others' profiles.
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

/**
 * Get all completed sessions a user participated in, most recent first.
 */
export const sessionsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .collect();
    return all.filter((s: any) =>
      s.players?.some((p: any) => p.userId === userId)
    );
  },
});

/**
 * Update the current user's profile (nickname, avatar, color, playStyle).
 */
export const updateProfile = mutation({
  args: {
    nickname:  v.string(),
    avatar:    v.string(),
    color:     v.string(),
    playStyle: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId as any, args);
  },
});
 /* Called at the end of a session when results are recorded.
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

    const wins    = (user.wins   ?? 0) + (won ? 1 : 0);
    const losses  = (user.losses ?? 0) + (won ? 0 : 1);
    const total   = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const elo     = Math.max(0, (user.elo ?? 1000) + eloChange);

    await ctx.db.patch(userId, { wins, losses, winRate, elo });
  },
});