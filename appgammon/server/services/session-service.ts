import { session_status } from "@appgammon/common";
import { db } from "../db/client";
import { sessions } from "../db/schema";

export async function createSession(player_1_id: string) {
  const [session] = await db
    .insert(sessions)
    .values({
      player_1_id: player_1_id,
      status: session_status.open,
    })
    .returning();

  return session;
}
