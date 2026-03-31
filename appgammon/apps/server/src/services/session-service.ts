import {
  type SessionEventType,
  type SessionRole,
  type SessionWithPlayers,
} from "@appgammon/common";
import { sessionEventBus, type SessionEventBus } from "../event-bus/session-event-bus";
import {
  drizzleSessionRepository,
  type SessionRepository,
} from "../repositories/session-repository";
import { logger } from "../utils/logger";

const DISCONNECT_DEBOUNCE_MS = 10_000;

interface PresenceEntry {
  connections: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export interface SessionJoinResult {
  session: SessionWithPlayers;
  role: SessionRole;
}

/**
 * Session service acting as a facade over persistence and real-time notifications.
 * Controllers talk to one cohesive object instead of coordinating
 * repositories and event delivery themselves.
 */
export class SessionService {
  private readonly presenceByPlayer = new Map<string, PresenceEntry>();

  constructor(
    private readonly sessionRepository: SessionRepository = drizzleSessionRepository,
    private readonly eventBus: SessionEventBus = sessionEventBus,
  ) {}

  async createSession(player1Id: string) {
    const session = await this.sessionRepository.createSession(player1Id);
    logger.info({ session }, "[SESSION] Creating new session");
    return session;
  }

  async joinSession(playerId: string, sessionId: string): Promise<SessionJoinResult | null> {
    const result = await this.sessionRepository.joinSession(playerId, sessionId);

    if (!result) {
      logger.info("[SESSION] Could not join session");
      return null;
    }

    const session = await this.sessionRepository.getSession(result.session.id);
    if (!session) {
      logger.info("[SESSION] Joined session but failed to reload mapped session");
      return null;
    }

    logger.info(
      { sessionId, role: result.role, joined: result.joined },
      "[SESSION] Joined session",
    );

    if (result.joined) {
      await this.publishSessionEvent(sessionId, "session_ready");
    }

    return { session, role: result.role };
  }

  async getSession(sessionId: string): Promise<SessionWithPlayers | null> {
    return this.sessionRepository.getSession(sessionId);
  }

  async cancelSession(sessionId: string, playerId: string) {
    const session = await this.sessionRepository.cancelSession(sessionId, playerId);

    if (!session) {
      logger.info("[SESSION] Could not cancel session");
      return null;
    }

    logger.info({ session }, "[SESSION] Cancelled session");
    await this.publishSessionEvent(sessionId, "session_cancelled");
    return session;
  }

  async getOrCreatePlayer(deviceId: string, name: string) {
    const player = await this.sessionRepository.getOrCreatePlayer(deviceId, name);
    logger.info({ player }, "[SESSION] Upserted player by device_id");
    return player;
  }

  async registerConnection(sessionId: string, playerId: string) {
    const key = this.getPresenceKey(sessionId, playerId);
    const entry = this.presenceByPlayer.get(key) ?? { connections: 0, timer: null };

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    entry.connections += 1;
    this.presenceByPlayer.set(key, entry);

    const session = await this.sessionRepository.markPlayerConnected(sessionId, playerId);
    if (session) {
      logger.info({ sessionId, playerId }, "[SESSION] Player reconnected");
      this.publishSessionSnapshot(session, "session_state");
    }
  }

  releaseConnection(sessionId: string, playerId: string) {
    const key = this.getPresenceKey(sessionId, playerId);
    const entry = this.presenceByPlayer.get(key) ?? { connections: 0, timer: null };

    entry.connections = Math.max(0, entry.connections - 1);

    if (entry.connections > 0) {
      this.presenceByPlayer.set(key, entry);
      return;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(() => {
      void this.flushDisconnect(sessionId, playerId, key);
    }, DISCONNECT_DEBOUNCE_MS);

    this.presenceByPlayer.set(key, entry);
  }

  private async flushDisconnect(sessionId: string, playerId: string, key: string) {
    const entry = this.presenceByPlayer.get(key);
    if (!entry || entry.connections > 0) {
      return;
    }

    entry.timer = null;
    const session = await this.sessionRepository.markPlayerDisconnected(sessionId, playerId);

    if (session) {
      logger.info({ sessionId, playerId }, "[SESSION] Player disconnected");
      this.publishSessionSnapshot(session, "session_state");
    }

    if (entry.connections === 0 && entry.timer === null) {
      this.presenceByPlayer.delete(key);
    }
  }

  private getPresenceKey(sessionId: string, playerId: string) {
    return `${sessionId}:${playerId}`;
  }

  private publishSessionSnapshot(session: SessionWithPlayers, type: SessionEventType) {
    this.eventBus.publish(session.id, { type, session });
  }

  private async publishSessionEvent(sessionId: string, type: SessionEventType) {
    const session = await this.sessionRepository.getSession(sessionId);
    if (!session) return;

    this.publishSessionSnapshot(session, type);
  }
}

export const sessionService = new SessionService();
