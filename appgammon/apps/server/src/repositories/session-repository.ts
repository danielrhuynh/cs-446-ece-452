import { session_status, type SessionWithPlayers } from "@appgammon/common";
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

export interface SessionRepository {
  createSession(player1Id: string): Promise<typeof sessions.$inferSelect>;
  joinSession(player2Id: string, sessionId: string): Promise<typeof sessions.$inferSelect | null>;
  getSession(sessionId: string): Promise<SessionWithPlayers | null>;
  startSession(
    sessionId: string,
    hostPlayerId: string,
  ): Promise<typeof sessions.$inferSelect | null>;
  cancelSession(sessionId: string, playerId: string): Promise<typeof sessions.$inferSelect | null>;
  getOrCreatePlayer(deviceId: string, name: string): Promise<typeof players.$inferSelect>;
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

  async joinSession(player2Id, sessionId) {
    const [session] = await db
      .update(sessions)
      .set({
        player_2_id: player2Id,
        status: session_status.closed,
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.player_2_id),
          ne(sessions.player_1_id, player2Id),
          eq(sessions.status, session_status.open),
        ),
      )
      .returning();

    return session ?? null;
  },

  async getSession(sessionId) {
    const result = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        player_1_id: sessions.player_1_id,
        player_2_id: sessions.player_2_id,
        created_at: sessions.created_at,
        player_1_name: players.name,
      })
      .from(sessions)
      .leftJoin(players, eq(sessions.player_1_id, players.id))
      .where(eq(sessions.id, sessionId));

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
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
      created_at: session.created_at.toISOString(),
      player_1: {
        id: session.player_1_id,
        name: session.player_1_name,
      },
      player_2: session.player_2_id
        ? {
            id: session.player_2_id,
            name: player2Name,
          }
        : null,
    } satisfies SessionWithPlayers;
  },

  async startSession(sessionId, hostPlayerId) {
    const [session] = await db
      .update(sessions)
      .set({ status: session_status.in_game })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.status, session_status.closed),
          eq(sessions.player_1_id, hostPlayerId),
        ),
      )
      .returning();

    return session ?? null;
  },

  async cancelSession(sessionId, playerId) {
    const [session] = await db
      .update(sessions)
      .set({ status: session_status.cancelled })
      .where(
        and(
          eq(sessions.id, sessionId),
          or(
            eq(sessions.status, session_status.open),
            eq(sessions.status, session_status.closed),
            eq(sessions.status, session_status.in_game),
          ),
          or(eq(sessions.player_1_id, playerId), eq(sessions.player_2_id, playerId)),
        ),
      )
      .returning();

    return session ?? null;
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
