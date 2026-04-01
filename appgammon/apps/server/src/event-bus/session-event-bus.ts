import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";
import { InMemorySubject, type Observer } from "./event-bus";

export interface SessionEvent {
  type: SessionEventType;
  session: SessionWithPlayers;
}

export type SessionObserver = Observer<SessionEvent>;

export class SessionEventBus {
  private readonly subject = new InMemorySubject<SessionEvent>();

  publish(sessionId: string, event: SessionEvent): void {
    this.subject.notify(sessionId, event);
  }

  subscribe(
    sessionId: string,
    callback: (event: SessionEvent) => void | Promise<void>,
  ): SessionObserver {
    const observer = { update: callback };
    this.subject.attach(sessionId, observer);
    return observer;
  }

  unsubscribe(sessionId: string, observer: SessionObserver): void {
    this.subject.detach(sessionId, observer);
  }
}

export const sessionEventBus = new SessionEventBus();
