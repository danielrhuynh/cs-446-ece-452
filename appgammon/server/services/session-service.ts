import { session_status } from "@appgammon/common";
import { db } from "../db/client";
import { sessions, players } from "../db/schema";
import { eq } from "drizzle-orm";
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

export async function get_or_create_player(device_id: string, name: string) {
  const [existing] = await db
    .select()
    .from(players)
    .where(eq(players.device_id, device_id));

  if (existing) {
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
