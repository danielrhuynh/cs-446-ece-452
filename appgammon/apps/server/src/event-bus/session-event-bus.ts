import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";
import { InMemorySubject } from "./event-bus";

export interface SessionEvent {
  type: SessionEventType;
  session: SessionWithPlayers;
}

export class SessionEventBus {
  private readonly subject = new InMemorySubject<SessionEvent>();

  publish(sessionId: string, event: SessionEvent): void {
    this.subject.notify(sessionId, event);
  }

  subscribe(
    sessionId: string,
    callback: (event: SessionEvent) => void | Promise<void>,
  ): () => void {
    return this.subject.attach(sessionId, { update: callback });
  }
}

export const sessionEventBus = new SessionEventBus();
