import { type SessionWithPlayers } from "@appgammon/common";
import { sessionEventBus } from "../event-bus/session-event-bus";
import { drizzleSessionRepository } from "../repositories/session-repository";
import { logger } from "../utils/logger";

const sessionRepository = drizzleSessionRepository;

export async function createSession(player1Id: string) {
  const session = await sessionRepository.createSession(player1Id);
  logger.info({ session }, "[SESSION] Creating new session");
  return session;
}

export async function joinSession(player2Id: string, sessionId: string) {
  const session = await sessionRepository.joinSession(player2Id, sessionId);

  if (!session) {
    logger.info("[SESSION] Could not join session");
    return null;
  }

  logger.info({ session }, "[SESSION] Joined session");

  const fullSession = await sessionRepository.getSession(sessionId);
  if (fullSession) {
    sessionEventBus.publish(sessionId, { type: "player_joined", session: fullSession });
  }

  return session;
}

export async function getSession(sessionId: string): Promise<SessionWithPlayers | null> {
  return sessionRepository.getSession(sessionId);
}

export async function startSession(sessionId: string, hostPlayerId: string) {
  const session = await sessionRepository.startSession(sessionId, hostPlayerId);

  if (!session) {
    logger.info("[SESSION] Could not start session");
    return null;
  }

  logger.info({ session }, "[SESSION] Started session");

  const fullSession = await sessionRepository.getSession(sessionId);
  if (fullSession) {
    sessionEventBus.publish(sessionId, { type: "game_started", session: fullSession });
  }

  return session;
}

export async function cancelSession(sessionId: string, playerId: string) {
  const session = await sessionRepository.cancelSession(sessionId, playerId);

  if (!session) {
    logger.info("[SESSION] Could not cancel session");
    return null;
  }

  logger.info({ session }, "[SESSION] Cancelled session");

  const fullSession = await sessionRepository.getSession(sessionId);
  if (fullSession) {
    sessionEventBus.publish(sessionId, { type: "session_cancelled", session: fullSession });
  }

  return session;
}

export async function getOrCreatePlayer(deviceId: string, name: string) {
  const player = await sessionRepository.getOrCreatePlayer(deviceId, name);
  logger.info({ player }, "[SESSION] Upserted player by device_id");
  return player;
}
