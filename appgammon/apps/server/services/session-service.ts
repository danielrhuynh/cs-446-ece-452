import { session_status } from "@appgammon/common";
import type { SessionWithPlayers } from "@appgammon/common";
import { db } from "../db/client";
import { sessions, players } from "../db/schema";
import { and, eq, ne, or, isNull } from "drizzle-orm";
import { logger } from "../utils/logger";

function isMissingOnConflictConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P10"
  );
}

export async function create_session(player_1_id: string) {
  const [session] = await db
    .insert(sessions)
    .values({
      player_1_id: player_1_id,
      status: session_status.open,
    })
    .returning();

  logger.info({ session }, "[SESSION] Creating new session");

  return session;
}

export async function join_session(player_2_id: string, session_id: string) {
  const [session] = await db
    .update(sessions)
    .set({
      player_2_id: player_2_id,
      status: session_status.closed,
    })
    .where(
      and(
        eq(sessions.id, session_id),
        isNull(sessions.player_2_id),
        ne(sessions.player_1_id, player_2_id),
        eq(sessions.status, session_status.open),
      ),
    )
    .returning();

  if (!session) {
    logger.info("[SESSION] Could not join session");
  } else {
    logger.info({ session }, "[SESSION] Joined session");
  }

  return session;
}

export async function get_session(session_id: string) {
  // Get session with player details using a join
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
    .where(eq(sessions.id, session_id));

  if (result.length === 0) {
    return null;
  }

  const session = result[0];

  // If there's a player 2, fetch their name separately
  let player_2_name: string | null = null;
  if (session.player_2_id) {
    const player2Result = await db
      .select({ name: players.name })
      .from(players)
      .where(eq(players.id, session.player_2_id));

    if (player2Result.length > 0) {
      player_2_name = player2Result[0].name;
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
          name: player_2_name,
        }
      : null,
  } satisfies SessionWithPlayers;
}

export async function start_session(session_id: string, host_player_id: string) {
  const [session] = await db
    .update(sessions)
    .set({ status: session_status.in_game })
    .where(
      and(
        eq(sessions.id, session_id),
        eq(sessions.status, session_status.closed),
        eq(sessions.player_1_id, host_player_id),
      ),
    )
    .returning();

  if (!session) {
    logger.info("[SESSION] Could not start session");
  } else {
    logger.info({ session }, "[SESSION] Started session");
  }

  return session ?? null;
}

export async function cancel_session(session_id: string, player_id: string) {
  const [session] = await db
    .update(sessions)
    .set({ status: session_status.cancelled })
    .where(
      and(
        eq(sessions.id, session_id),
        or(
          eq(sessions.status, session_status.open),
          eq(sessions.status, session_status.closed),
          eq(sessions.status, session_status.in_game),
        ),
        or(
          eq(sessions.player_1_id, player_id),
          eq(sessions.player_2_id, player_id),
        ),
      ),
    )
    .returning();

  if (!session) {
    logger.info("[SESSION] Could not cancel session");
  } else {
    logger.info({ session }, "[SESSION] Cancelled session");
  }

  return session ?? null;
}

export async function get_or_create_player(device_id: string, name: string) {
  try {
    const [player] = await db
      .insert(players)
      .values({ device_id: device_id, name: name })
      .onConflictDoUpdate({
        target: players.device_id,
        set: { name: name },
      })
      .returning();

    logger.info({ player }, "[SESSION] Upserted player by device_id");
    return player;
  } catch (error) {
    if (!isMissingOnConflictConstraintError(error)) {
      throw error;
    }
    // Backward compatibility: allow runtime before unique(device_id) migration is applied.
    logger.warn(
      "[SESSION] players.device_id unique constraint missing; using legacy player lookup path",
    );
  }

  const [existing] = await db
    .select()
    .from(players)
    .where(eq(players.device_id, device_id));

  if (existing) {
    if (existing.name !== name) {
      const [updated] = await db
        .update(players)
        .set({ name: name })
        .where(eq(players.device_id, device_id))
        .returning();
      logger.info({ updated }, "[SESSION] Updated existing player name");
      return updated;
    }
    logger.info({ existing }, "[SESSION] Found existing player");
    return existing;
  }

  const [player] = await db
    .insert(players)
    .values({ device_id: device_id, name: name })
    .returning();

  logger.info({ player }, "[SESSION] Created player via fallback path");
  return player;
}
