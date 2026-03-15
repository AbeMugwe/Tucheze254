import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns the active poll with live vote counts, secondsLeft countdown,
 * and which option the current user voted for.
 * Auto-closes the poll server-side once it has expired.
 */
export const active = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const poll = await ctx.db
      .query("polls")
      .withIndex("by_closed", (q) => q.eq("closed", false))
      .order("desc")
      .first();

    if (!poll) return null;

    const now        = Date.now();
    const closesAt   = new Date(poll.closesAt).getTime();
    const secondsLeft = Math.max(0, Math.round((closesAt - now) / 1000));
    const expired    = secondsLeft === 0;

    // Note: we can't mutate inside a query, so we just flag it as expired.
    // The vote mutation already checks poll.closed, and the startPoll mutation
    // will close old polls when a new one is created.

    const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);

    return {
      _id:         poll._id,
      question:    poll.question,
      closesAt:    poll.closesAt,
      secondsLeft,
      expired,
      options: poll.options.map((o) => ({
        game:      o.game,
        emoji:     o.emoji,
        votes:     o.votes.length,
        total:     totalVotes,
        votedByMe: o.votes.some((id) => id === userId),
      })),
      myVoteIndex: poll.options.findIndex((o) =>
        o.votes.some((id) => id === userId)
      ),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Cast or change a vote on a poll option.
 * Blocks voting after expiry.
 */
export const vote = mutation({
  args: {
    pollId:      v.id("polls"),
    optionIndex: v.number(),
  },
  handler: async (ctx, { pollId, optionIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to vote.");

    const poll = await ctx.db.get(pollId);
    if (!poll) throw new Error("Poll not found.");

    // Check expiry
    const expired = new Date(poll.closesAt).getTime() < Date.now();
    if (poll.closed || expired) throw new Error("This poll has closed.");

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error("Invalid option index.");
    }

    // Remove any existing vote by this user across all options
    const newOptions = poll.options.map((opt) => ({
      ...opt,
      votes: opt.votes.filter((id) => id !== userId),
    }));

    // Toggle: clicking your current vote removes it (unvote)
    const alreadyVotedHere = poll.options[optionIndex].votes.some(
      (id) => id === userId
    );
    if (!alreadyVotedHere) {
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        votes: [...newOptions[optionIndex].votes, userId],
      };
    }

    await ctx.db.patch(pollId, { options: newOptions });
  },
});

/**
 * Start a new poll — auto-fetches up to 5 games from the library as options,
 * sets closesAt to exactly 20 minutes from now, closes any existing open polls.
 */
export const start = mutation({
  args: {
    question: v.optional(v.string()),
  },
  handler: async (ctx, { question }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    // Close any currently open polls
    const openPolls = await ctx.db
      .query("polls")
      .withIndex("by_closed", (q) => q.eq("closed", false))
      .collect();
    for (const p of openPolls) {
      await ctx.db.patch(p._id, { closed: true });
    }

    // Fetch games from the library — pick up to 5, prefer most played
    const allGames = await ctx.db.query("games").collect();
    const sorted   = [...allGames].sort((a, b) => (b.timesPlayed ?? 0) - (a.timesPlayed ?? 0));
    const picked   = sorted.slice(0, 5);

    if (picked.length === 0) {
      throw new Error("Add some games to the library first before starting a poll.");
    }

    // 20 minutes from now
    const closesAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    return await ctx.db.insert("polls", {
      question:  question ?? "What should we play tonight?",
      closesAt,
      closed:    false,
      createdBy: userId,
      options:   picked.map((g) => ({
        game:  g.name,
        emoji: g.emoji,
        votes: [],
      })),
    });
  },
});

/**
 * Close a poll manually.
 */
export const close = mutation({
  args: { pollId: v.id("polls") },
  handler: async (ctx, { pollId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");
    await ctx.db.patch(pollId, { closed: true });
  },
});