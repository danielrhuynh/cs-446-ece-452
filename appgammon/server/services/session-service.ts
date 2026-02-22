import { session_status } from "@appgammon/common";
import { db } from "../db/client";
import { sessions, players } from "../db/schema";
import { and, eq, ne, isNull } from "drizzle-orm";
import { logger } from "../utils/logger";

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
    status: session.status,
    player_1_id: session.player_1_id,
    player_2_id: session.player_2_id,
    created_at: session.created_at,
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
  };
}

export async function get_or_create_player(device_id: string, name: string) {
  const [existing] = await db
    .select()
    .from(players)
    .where(eq(players.device_id, device_id));

  if (existing) {
    // Update the player's name if it changed
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

  logger.info({ player }, "[SESSION] Creating new player");
  return player;
}
