import {
  SESSION_EVENT_TYPE,
  type SessionEventType,
  type SessionWithPlayers,
} from "@appgammon/common";
import { sessionEventBus } from "../event-bus/session-event-bus";
import { sessionRepo } from "../repositories/session-repository";
import { logger } from "../utils/logger";

type SessionRepo = typeof sessionRepo;
type SessionEventBusPort = Pick<typeof sessionEventBus, "publish">;

export class SessionService {
  private readonly sessionRepo: SessionRepo;
  private readonly eventBus: SessionEventBusPort;

  constructor(
    sessionRepository: SessionRepo = sessionRepo,
    eventBus: SessionEventBusPort = sessionEventBus,
  ) {
    this.sessionRepo = sessionRepository;
    this.eventBus = eventBus;
  }

  async createSession(player1Id: string) {
    const session = await this.sessionRepo.create(player1Id);
    logger.info({ session }, "[SESSION] Creating new session");
    return session;
  }

  async joinSession(playerId: string, sessionId: string) {
    const result = await this.sessionRepo.join(playerId, sessionId);

    if (!result) {
      logger.info("[SESSION] Could not join session");
      return null;
    }

    const session = await this.sessionRepo.get(result.sessionId);
    if (!session) {
      logger.info("[SESSION] Joined session but failed to reload mapped session");
      return null;
    }

    logger.info(
      { sessionId, role: result.role, joined: result.joined },
      "[SESSION] Joined session",
    );

    if (result.joined) {
      this.eventBus.publish(sessionId, { type: SESSION_EVENT_TYPE.ready, session });
    }

    return { session, role: result.role };
  }

  async getSession(sessionId: string): Promise<SessionWithPlayers | null> {
    return this.sessionRepo.get(sessionId);
  }

  async cancelSession(sessionId: string, playerId: string) {
    const session = await this.sessionRepo.cancel(sessionId, playerId);

    if (!session) {
      logger.info("[SESSION] Could not cancel session");
      return null;
    }

    logger.info({ session }, "[SESSION] Cancelled session");
    await this.publishSessionEvent(sessionId, SESSION_EVENT_TYPE.cancelled);
    return session;
  }

  async getOrCreatePlayer(deviceId: string, name: string) {
    const player = await this.sessionRepo.upsertPlayer(deviceId, name);
    logger.info({ player }, "[SESSION] Upserted player by device_id");
    return player;
  }

  private publishSessionSnapshot(session: SessionWithPlayers, type: SessionEventType) {
    this.eventBus.publish(session.id, { type, session });
  }

  private async publishSessionEvent(sessionId: string, type: SessionEventType) {
    const session = await this.sessionRepo.get(sessionId);
    if (!session) return;

    this.publishSessionSnapshot(session, type);
  }
}

export const sessionService = new SessionService();
