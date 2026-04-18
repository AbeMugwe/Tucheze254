import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId as any);
  },
});

export const checkEmailExists = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();
    return account !== null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const all = await ctx.db.query("users").collect();
    return all.filter((u) => u.nickname);
  },
});

/**
 * Returns all ranked players sorted by points descending.
 * Each player includes their currentRank (1-based) so the frontend
 * can compute movement against previousRank.
 */
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const users = await ctx.db
      .query("users")
      .withIndex("by_points")
      .order("desc")
      .collect();

    // Only users with a completed profile
    const ranked = users.filter((u: any) => u.nickname);

    // Attach currentRank so frontend can compute movement
    const withRank = ranked.map((u: any, i: number) => ({
      ...u,
      points:      u.points      ?? 0,
      wins:        u.wins        ?? 0,
      losses:      u.losses      ?? 0,
      winRate:     u.winRate     ?? 0,
      previousRank: u.previousRank ?? (i + 1), // default: no movement
      currentRank: i + 1,
    }));

    return limit ? withRank.slice(0, limit) : withRank;
  },
});

// ─── Admin check ──────────────────────────────────────────────────────────────

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!account?.providerAccountId) return false;

    const email = account.providerAccountId.toLowerCase().trim();
    const raw = process.env.ADMIN_EMAILS ?? "";
    const adminEmails = raw
      .split(",")
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);

    return adminEmails.includes(email);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

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
    if (!existing) throw new Error("AUTH_ROW_NOT_READY");

    const doc = existing as any;
    await ctx.db.patch(userId as any, {
      nickname:     args.nickname,
      avatar:       args.avatar,
      color:        args.color,
      playStyle:    args.playStyle,
      points:       doc.points      ?? 0,    // new users start at 0
      previousRank: doc.previousRank ?? undefined,
      wins:         doc.wins         ?? 0,
      losses:       doc.losses       ?? 0,
      winRate:      doc.winRate      ?? 0,
    });
    return userId;
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

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

/**
 * Called at the end of a session when results are recorded.
 *
 * - Adds/subtracts pointsChange from the player's points total
 * - Recalculates winRate as (wins / total games) * 100
 * - Snapshots the player's current leaderboard rank into previousRank
 *   so the next render can show how many positions they moved
 *
 * Usage:
 *   await recordResult({ userId, won: true, pointsChange: 10 });
 *   await recordResult({ userId, won: false, pointsChange: -5 });
 */
export const recordResult = mutation({
  args: {
    userId:       v.id("users"),
    won:          v.boolean(),
    pointsChange: v.number(),   // positive = gained, negative = lost
  },
  handler: async (ctx, { userId, won, pointsChange }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const u = user as any;

    // ── 1. Snapshot current rank before changing points ──────────────────────
    // Fetch all ranked users sorted by points to find this user's current rank
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_points")
      .order("desc")
      .collect();

    const rankedUsers = allUsers.filter((x: any) => x.nickname);
    const currentRankIndex = rankedUsers.findIndex((x: any) => x._id === userId);
    const currentRank = currentRankIndex >= 0 ? currentRankIndex + 1 : null;

    // ── 2. Compute updated stats ──────────────────────────────────────────────
    const wins    = (u.wins   ?? 0) + (won ? 1 : 0);
    const losses  = (u.losses ?? 0) + (won ? 0 : 1);
    const total   = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const points  = (u.points ?? 0) + pointsChange;

    // ── 3. Persist ────────────────────────────────────────────────────────────
    await ctx.db.patch(userId, {
      wins,
      losses,
      winRate,
      points,
      previousRank: currentRank ?? undefined,
    });
  },
});

/**
 * Admin-only: reset all players' points, wins, losses back to zero.
 */
export const resetLeaderboard = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!adminEmails.includes(account?.providerAccountId ?? "")) {
      throw new Error("Admins only.");
    }

    const allUsers = await ctx.db.query("users").collect();
    await Promise.all(
      allUsers.map((u) =>
        ctx.db.patch(u._id, {
          points:       0,
          previousRank: undefined,
          wins:         0,
          losses:       0,
          winRate:      0,
        })
      )
    );
  },
});