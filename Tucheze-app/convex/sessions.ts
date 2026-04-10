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

const teamShape = v.object({
  id: v.string(),
  name: v.string(),
  emoji: v.string(),
  color: v.string(),
  playerIds: v.array(v.id("users")),
});

// ─── Queries ──────────────────────────────────────────────────────────────────

// All sessions for the current user — where they are creator OR a player
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const all = await ctx.db
      .query("sessions")
      .order("desc")
      .collect();

    // Show sessions the user created OR is a player in
    return all.filter(
      (s) =>
        s.createdBy === userId ||
        s.players.some((p: any) => p.userId === userId)
    );
  },
});

export const getById = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

// Group-level aggregate stats for the home page stat cards
export const groupStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const allSessions = await ctx.db.query("sessions").collect();
    const allUsers    = await ctx.db.query("users").filter((q) => q.neq(q.field("nickname"), undefined)).collect();
    const allGames    = await ctx.db.query("games").collect();

    const completed   = allSessions.filter((s) => s.status === "completed");
    const totalRounds = completed.reduce((sum, s) => sum + (s.totalRounds ?? s.games.length), 0);

    // Active = played in at least one session
    const activePlayers = new Set(
      allSessions.flatMap((s) => s.players.map((p: any) => p.userId))
    ).size;

    return {
      sessionsPlayed: completed.length,
      activePlayers,
      gamesInLibrary: allGames.length,
      totalRounds,
    };
  },
});

// 5 most recent completed sessions (for the home page)
export const recent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(5);
  },
});

// Upcoming sessions (for the home page)
export const upcoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "upcoming"))
      .order("desc")
      .take(4);
  },
});

// Activity feed — last 8 meaningful events derived from sessions + users
export const activityFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Pull recent completed sessions and synthesise activity items
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .order("desc")
      .take(8);

    const items: {
      icon: string;
      text: string;
      time: string;
      bg: string;
      ts: number;
    }[] = [];

    for (const s of sessions) {
      const ts = new Date(s.date).getTime();

      // Session completed event
      if (s.winner) {
        items.push({
          icon: "🏆",
          text: `${s.winner.avatar} ${s.winner.nickname} won ${s.name}`,
          time: relativeTs(ts),
          bg: "#FFE135",
          ts,
        });
      }

      // Round winners
      for (const rw of s.roundWinners ?? []) {
        items.push({
          icon: rw.gameEmoji,
          text: `${rw.avatar} ${rw.nickname} won ${rw.gameName} with ${rw.score} pts`,
          time: relativeTs(ts),
          bg: "#4ECDC433",
          ts,
        });
      }
    }

    // Sort by most recent and cap at 8
    return items.sort((a, b) => b.ts - a.ts).slice(0, 8);
  },
});

function relativeTs(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

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

// ─── Invite code helper ───────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0 or I/1 — easy to read
  let code = "T254-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
function pickTeamForLateJoin<T extends { playerIds: any[] }>(teams: T[]): T | null {
  if (!teams.length) return null;

  const sorted = [...teams].sort((a, b) => a.playerIds.length - b.playerIds.length);
  const smallestSize = sorted[0].playerIds.length;
  const smallestTeams = sorted.filter((t) => t.playerIds.length === smallestSize);

  return smallestTeams[Math.floor(Math.random() * smallestTeams.length)] ?? null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// Create a new session (from NewSession wizard)
export const create = mutation({
  args: {
    name:      v.string(),
    location:  v.string(),
    date:      v.string(),
    games: v.array(v.object({
      name:   v.string(),
      emoji:  v.string(),
      gameId: v.optional(v.id("games")),
    })),
    playerIds:  v.array(v.id("users")),
    allowJoin:  v.optional(v.boolean()),
    playFormat: v.optional(v.union(v.literal("individual"), v.literal("teams"))),
    teams: v.optional(v.array(teamShape)),
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

    // Generate a unique invite code
    const inviteCode = generateInviteCode();

    const sessionId = await ctx.db.insert("sessions", {
      name:       args.name,
      location:   args.location,
      date:       args.date,
      status:     "upcoming",
      games:      args.games,
      players,
      createdBy:  userId as any,
      inviteCode,
      allowJoin:  args.allowJoin ?? true,
      playFormat: args.playFormat,
      teams: args.teams
    });

    return { id: sessionId, inviteCode };
  },
});

// Look up a session by its invite code — public (no auth required for preview)
export const getByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    return session ?? null;
  },
});

// Join a session via invite code
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in to join.");

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();

    if (!session)               throw new Error("Invalid invite code.");
    if (!session.allowJoin)     throw new Error("This session is not accepting new players.");
    if (session.status === "completed") throw new Error("This session has already ended.");

    // Already a player?
    const alreadyIn = session.players.some((p: any) => p.userId === userId);
    if (alreadyIn) return { status: "already_joined", sessionId: session._id };

    // Load their profile for the snapshot
    const user = await ctx.db.get(userId as any) as any;
    if (!user) throw new Error("User profile not found.");

    const newPlayer = {
      userId:   userId as any,
      nickname: user.nickname ?? "Player",
      avatar:   user.avatar   ?? "🎲",
      color:    user.color    ?? "#4ECDC4",
      score:    0,
      rank:     session.players.length + 1,
    };

    let updatedTeams = session.teams

    if (
      session.playFormat === "teams" &&
      session.teams &&
      session.teams.length > 0
    ) {
      const chosenTeam = pickTeamForLateJoin(session.teams);

    if (chosenTeam) {
      updatedTeams = session.teams.map((team: any) =>
        team.id === chosenTeam.id
          ? { ...team, playerIds: [...team.playerIds, userId] }
         : team
      );
    }
  }

  await ctx.db.patch(session._id, {
    players: [...session.players, newPlayer],
    teams: updatedTeams,
  });

    return { status: "joined", sessionId: session._id };
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
    winningTeam:     v.optional(v.object({
      name:            v.string(),
      emoji:           v.string(),
      color:           v.string(),
      memberNicknames: v.array(v.string()),
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
  },
  handler: async (ctx, { sessionId, players, totalRounds, durationMinutes, winningTeam, roundWinners }) => {
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
      teamWinner: winningTeam,
      totalRounds,
      durationMinutes,
      roundWinners,
    });

    // Increment timesPlayed on each game in this session, auto-set trending at ≥5 plays
    const session = await ctx.db.get(sessionId);
    if (session) {
      const TRENDING_THRESHOLD = 5;
      for (const game of session.games) {
        // Prefer ID-based lookup (fast + exact); fall back to name match
        const dbGame = game.gameId
          ? await ctx.db.get(game.gameId)
          : await ctx.db
              .query("games")
              .filter((q) => q.eq(q.field("name"), game.name))
              .first();
        if (dbGame) {
          const newCount = (dbGame.timesPlayed ?? 0) + 1;
          await ctx.db.patch(dbGame._id, {
            timesPlayed: newCount,
            lastPlayed:  new Date().toISOString(),
            trending:    newCount >= TRENDING_THRESHOLD,
          });
        }
      }
    }

    // Update win/loss records + ELO for each player using proper ELO formula
    // K-factor: 32 for <10 games, 24 for 10-30, 16 for 30+
    const n = ranked.length;

    // Need at least 2 players for ELO to make sense — skip ELO update for solo sessions
    const updateElo = n >= 2;

    for (let i = 0; i < ranked.length; i++) {
      const p    = ranked[i];
      const user = await ctx.db.get(p.userId);
      if (!user) continue;

      const currentElo   = (user as any).elo ?? 1000;
      const totalGames   = ((user as any).wins ?? 0) + ((user as any).losses ?? 0);
      const K            = totalGames < 10 ? 32 : totalGames < 30 ? 24 : 16;

      let newElo = currentElo;

      if (updateElo) {
        // Against-the-field ELO: compare each player against every other
        let eloChange = 0;
        for (let j = 0; j < ranked.length; j++) {
          if (i === j) continue;
          const opponent     = ranked[j];
          const opponentUser = await ctx.db.get(opponent.userId);
          const opponentElo  = (opponentUser as any)?.elo ?? 1000;
          const expected     = 1 / (1 + Math.pow(10, (opponentElo - currentElo) / 400));
          const actual       = i < j ? 1 : 0;
          eloChange         += K * (actual - expected);
        }
        // Normalise by number of opponents so range stays reasonable
        const rawElo = currentElo + Math.round(eloChange / (n - 1));
        // Sanitise — never write NaN or Infinity to the DB
        newElo = isFinite(rawElo) && !isNaN(rawElo) ? Math.max(100, rawElo) : currentElo;
      }

      // Top 3 finish = win, 4th place and below = loss
      const isPodium  = i < 3;
      const wins      = ((user as any).wins   ?? 0) + (isPodium ? 1 : 0);
      const losses    = ((user as any).losses ?? 0) + (isPodium ? 0 : 1);
      const total     = wins + losses;
      const winRate   = total > 0 ? Math.round((wins / total) * 100) : 0;

      // Auto-assign badge based on ELO bracket
      let badge = (user as any).badge ?? "🆕 Newcomer";
      if      (newElo >= 1800)  badge = "👑 Legend";
      else if (newElo >= 1600)  badge = "🔥 Elite";
      else if (newElo >= 1400)  badge = "⚡ Veteran";
      else if (newElo >= 1200)  badge = "🎯 Contender";
      else if (total  >= 5)     badge = "🎮 Regular";
      else if (total  >= 1)     badge = "🌱 Rising";

      await ctx.db.patch(p.userId, { wins, losses, winRate, elo: newElo, badge });
    }
  },
});