import { session_status, type SessionRole, type SessionWithPlayers } from "@appgammon/common";
import { db } from "../db/client";
import { players, sessions } from "../db/schema";
import { and, eq, isNotNull, isNull, ne, or } from "drizzle-orm";

const RECONNECT_GRACE_MS = 3 * 60 * 1000;

type SessionRecord = typeof sessions.$inferSelect;

export interface JoinSessionResult {
  session: SessionRecord;
  role: SessionRole;
  joined: boolean;
}

function isMissingOnConflictConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P10"
  );
}

export interface SessionRepository {
  createSession(player1Id: string): Promise<SessionRecord>;
  joinSession(playerId: string, sessionId: string): Promise<JoinSessionResult | null>;
  getSession(sessionId: string): Promise<SessionWithPlayers | null>;
  cancelSession(sessionId: string, playerId: string): Promise<SessionRecord | null>;
  markPlayerConnected(sessionId: string, playerId: string): Promise<SessionWithPlayers | null>;
  markPlayerDisconnected(sessionId: string, playerId: string): Promise<SessionWithPlayers | null>;
  getOrCreatePlayer(deviceId: string, name: string): Promise<typeof players.$inferSelect>;
}

function computeReconnectDeadline(session: SessionRecord) {
  const disconnectedAt =
    session.player_1_disconnected_at ?? session.player_2_disconnected_at ?? null;
  if (!disconnectedAt) return null;

  return new Date(disconnectedAt.getTime() + RECONNECT_GRACE_MS).toISOString();
}

async function mapSessionWithPlayers(session: SessionRecord): Promise<SessionWithPlayers> {
  const player1Result = await db
    .select({ name: players.name })
    .from(players)
    .where(eq(players.id, session.player_1_id));
  let player2Name: string | null = null;

  if (session.player_2_id) {
    const player2Result = await db
      .select({ name: players.name })
      .from(players)
      .where(eq(players.id, session.player_2_id));

    if (player2Result.length > 0) {
      player2Name = player2Result[0].name;
    }
  }

  return {
    id: session.id,
    status: session.status as SessionWithPlayers["status"],
    player_1_id: session.player_1_id,
    player_2_id: session.player_2_id,
    player_1_connected: session.player_1_disconnected_at === null,
    player_2_connected: session.player_2_id !== null && session.player_2_disconnected_at === null,
    reconnect_deadline_at: computeReconnectDeadline(session),
    created_at: session.created_at.toISOString(),
    player_1: {
      id: session.player_1_id,
      name: player1Result[0]?.name ?? null,
    },
    player_2: session.player_2_id
      ? {
          id: session.player_2_id,
          name: player2Name,
        }
      : null,
  } satisfies SessionWithPlayers;
}

export const drizzleSessionRepository: SessionRepository = {
  async createSession(player1Id) {
    const [session] = await db
      .insert(sessions)
      .values({
        player_1_id: player1Id,
        status: session_status.open,
      })
      .returning();

    return session;
  },

  async joinSession(playerId, sessionId) {
    const [joinedSession] = await db
      .update(sessions)
      .set({
        player_2_id: playerId,
        status: session_status.ready,
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.player_2_id),
          ne(sessions.player_1_id, playerId),
          eq(sessions.status, session_status.open),
        ),
      )
      .returning();

    if (joinedSession) {
      return { session: joinedSession, role: "guest", joined: true };
    }

    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

    if (!session || session.status === session_status.cancelled) {
      return null;
    }

    if (session.player_1_id === playerId) {
      return { session, role: "host", joined: false };
    }

    if (session.player_2_id === playerId) {
      return { session, role: "guest", joined: false };
    }

    return null;
  },

  async getSession(sessionId) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) return null;

    return mapSessionWithPlayers(session);
  },

  async cancelSession(sessionId, playerId) {
    const [session] = await db
      .update(sessions)
      .set({ status: session_status.cancelled })
      .where(
        and(
          eq(sessions.id, sessionId),
          or(eq(sessions.status, session_status.open), eq(sessions.status, session_status.ready)),
          or(eq(sessions.player_1_id, playerId), eq(sessions.player_2_id, playerId)),
        ),
      )
      .returning();

    return session ?? null;
  },

  async markPlayerConnected(sessionId, playerId) {
    const [hostSession] = await db
      .update(sessions)
      .set({ player_1_disconnected_at: null })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.player_1_id, playerId),
          isNotNull(sessions.player_1_disconnected_at),
        ),
      )
      .returning();

    if (hostSession) {
      return mapSessionWithPlayers(hostSession);
    }

    const [guestSession] = await db
      .update(sessions)
      .set({ player_2_disconnected_at: null })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.player_2_id, playerId),
          isNotNull(sessions.player_2_disconnected_at),
        ),
      )
      .returning();

    return guestSession ? mapSessionWithPlayers(guestSession) : null;
  },

  async markPlayerDisconnected(sessionId, playerId) {
    const disconnectedAt = new Date();

    const [hostSession] = await db
      .update(sessions)
      .set({ player_1_disconnected_at: disconnectedAt })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.player_1_id, playerId),
          isNull(sessions.player_1_disconnected_at),
          ne(sessions.status, session_status.cancelled),
        ),
      )
      .returning();

    if (hostSession) {
      return mapSessionWithPlayers(hostSession);
    }

    const [guestSession] = await db
      .update(sessions)
      .set({ player_2_disconnected_at: disconnectedAt })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.player_2_id, playerId),
          isNull(sessions.player_2_disconnected_at),
          ne(sessions.status, session_status.cancelled),
        ),
      )
      .returning();

    return guestSession ? mapSessionWithPlayers(guestSession) : null;
  },

  async getOrCreatePlayer(deviceId, name) {
    try {
      const [player] = await db
        .insert(players)
        .values({ device_id: deviceId, name })
        .onConflictDoUpdate({
          target: players.device_id,
          set: { name },
        })
        .returning();

      return player;
    } catch (error) {
      if (!isMissingOnConflictConstraintError(error)) {
        throw error;
      }
    }

    const [existing] = await db.select().from(players).where(eq(players.device_id, deviceId));
    if (existing) {
      if (existing.name !== name) {
        const [updated] = await db
          .update(players)
          .set({ name })
          .where(eq(players.device_id, deviceId))
          .returning();

        return updated;
      }

      return existing;
    }

    const [created] = await db.insert(players).values({ device_id: deviceId, name }).returning();

    return created;
  },
};
