import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the current buzzer state for a session:
 * - The active round (roundNumber, questionNum, isOpen)
 * - All buzzes for that round in insertion order (= buzz order)
 * - Whether the current user has already buzzed
 *
 * Players subscribe to this — it updates in real-time whenever:
 *   - Someone buzzes
 *   - The host resets (new roundNumber)
 *   - The host opens/closes buzzing
 */
export const getState = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the current round for this session
    const round = await ctx.db
      .query("buzzerRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .first();

    // No round started yet
    if (!round) return { started: false };

    // Get all buzzes for this round, insertion order = buzz order
    const buzzes = await ctx.db
      .query("buzzes")
      .withIndex("by_session_round", (q) =>
        q.eq("sessionId", sessionId).eq("roundNumber", round.roundNumber)
      )
      .order("asc")
      .collect();

    const myBuzz = buzzes.find((b) => b.userId === userId);

    return {
      started:     true,
      roundId:     round._id,
      roundNumber: round.roundNumber,
      questionNum: round.questionNum,
      isOpen:      round.isOpen,
      myPosition:  myBuzz ? buzzes.indexOf(myBuzz) + 1 : null,
      hasBuzzed:   !!myBuzz,
      buzzes: buzzes.map((b, i) => ({
        _id:       b._id,
        position:  i + 1,
        isFirst:   i === 0,
        userId:    b.userId,
        nickname:  b.nickname,
        color:     b.color,
        teamName:  b.teamName,
        teamColor: b.teamColor,
      })),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Host: start the buzzer for this session (called when overlay opens).
 * Creates the first round. Safe to call multiple times — idempotent.
 */
export const start = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const existing = await ctx.db
      .query("buzzerRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("buzzerRounds", {
      sessionId,
      roundNumber: 1,
      questionNum: 1,
      isOpen:      true,
    });
  },
});

/**
 * Host: reset the buzzer for the next question.
 * Increments roundNumber in Convex — all player pages react instantly
 * and reset their buttons automatically via the live query.
 */
export const reset = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const round = await ctx.db
      .query("buzzerRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .first();

    if (!round) throw new Error("No active buzzer round.");

    // Clean up old buzzes
    const oldBuzzes = await ctx.db
      .query("buzzes")
      .withIndex("by_session_round", (q) =>
        q.eq("sessionId", sessionId).eq("roundNumber", round.roundNumber)
      )
      .collect();
    await Promise.all(oldBuzzes.map((b) => ctx.db.delete(b._id)));

    // Patch in-place — all subscribers react instantly
    await ctx.db.patch(round._id, {
      roundNumber: round.roundNumber + 1,
      questionNum: round.questionNum + 1,
      isOpen:      true,
    });
  },
});

/**
 * Player: record a buzz. Uses server insertion time for ordering
 * (Convex guarantees insertion order is consistent).
 * Idempotent — returns "already_buzzed" if already recorded this round.
 */
export const buzz = mutation({
  args: {
    sessionId: v.id("sessions"),
    teamName:  v.optional(v.string()),
    teamColor: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, teamName, teamColor }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to buzz.");

    const round = await ctx.db
      .query("buzzerRounds")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .first();

    if (!round)        throw new Error("No active buzzer round.");
    if (!round.isOpen) throw new Error("Buzzing is closed for this question.");

    // Idempotent
    const existing = await ctx.db
      .query("buzzes")
      .withIndex("by_session_round", (q) =>
        q.eq("sessionId", sessionId).eq("roundNumber", round.roundNumber)
      )
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) return { status: "already_buzzed" };

    const user = await ctx.db.get(userId as any) as any;

    await ctx.db.insert("buzzes", {
      sessionId,
      roundNumber: round.roundNumber,
      userId:      userId as any,
      nickname:    user?.nickname ?? "Player",
      color:       user?.color    ?? "#4ECDC4",
      teamName:    teamName  ?? undefined,
      teamColor:   teamColor ?? undefined,
    });

    return { status: "buzzed" };
  },
});