import { SESSION_ROLE, SESSION_STATUS, type SessionWithPlayers } from "@appgammon/common";
import { db } from "../db/client";
import { players, sessions } from "../db/schema";
import { and, eq, isNull, ne, or } from "drizzle-orm";

function isMissingOnConflictConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P10"
  );
}

async function toSession(session: typeof sessions.$inferSelect): Promise<SessionWithPlayers> {
  const [player1] = await db
    .select({ name: players.name })
    .from(players)
    .where(eq(players.id, session.player_1_id));

  const [player2] = session.player_2_id
    ? await db
        .select({ name: players.name })
        .from(players)
        .where(eq(players.id, session.player_2_id))
    : [];

  return {
    id: session.id,
    status: session.status as SessionWithPlayers["status"],
    player_1_id: session.player_1_id,
    player_2_id: session.player_2_id,
    created_at: session.created_at.toISOString(),
    player_1: { id: session.player_1_id, name: player1?.name ?? null },
    player_2: session.player_2_id ? { id: session.player_2_id, name: player2?.name ?? null } : null,
  };
}

export const sessionRepo = {
  async create(hostId: string) {
    const [session] = await db
      .insert(sessions)
      .values({
        player_1_id: hostId,
        status: SESSION_STATUS.open,
      })
      .returning();

    return session;
  },

  async join(playerId: string, sessionId: string) {
    const [joinedSession] = await db
      .update(sessions)
      .set({
        player_2_id: playerId,
        status: SESSION_STATUS.ready,
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.player_2_id),
          ne(sessions.player_1_id, playerId),
          eq(sessions.status, SESSION_STATUS.open),
        ),
      )
      .returning();

    if (joinedSession) {
      return { sessionId: joinedSession.id, role: SESSION_ROLE.guest, joined: true };
    }

    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));

    if (!session || session.status === SESSION_STATUS.cancelled) {
      return null;
    }

    if (session.player_1_id === playerId) {
      return { sessionId: session.id, role: SESSION_ROLE.host, joined: false };
    }

    if (session.player_2_id === playerId) {
      return { sessionId: session.id, role: SESSION_ROLE.guest, joined: false };
    }

    return null;
  },

  async get(sessionId: string) {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) return null;

    return toSession(session);
  },

  async cancel(sessionId: string, playerId: string) {
    const [session] = await db
      .update(sessions)
      .set({ status: SESSION_STATUS.cancelled })
      .where(
        and(
          eq(sessions.id, sessionId),
          or(eq(sessions.status, SESSION_STATUS.open), eq(sessions.status, SESSION_STATUS.ready)),
          or(eq(sessions.player_1_id, playerId), eq(sessions.player_2_id, playerId)),
        ),
      )
      .returning();

    return session ?? null;
  },

  async upsertPlayer(deviceId: string, name: string) {
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
