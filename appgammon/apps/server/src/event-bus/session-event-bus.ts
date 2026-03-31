import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";
import { ChannelSubject } from "./channel-subject";

export interface SessionEvent {
  type: SessionEventType;
  session: SessionWithPlayers;
}

export interface SessionEventBus {
  publish(sessionId: string, event: SessionEvent): void;
  subscribe(sessionId: string, callback: (event: SessionEvent) => void | Promise<void>): () => void;
}

class InMemorySessionEventBus implements SessionEventBus {
  private readonly subject = new ChannelSubject<SessionEvent>();

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

export const sessionEventBus: SessionEventBus = new InMemorySessionEventBus();
