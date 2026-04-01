import type { MatchEventType } from "@appgammon/common";
import { InMemorySubject, type Observer } from "./event-bus";

export interface MatchEvent {
  type: MatchEventType;
  data: unknown;
  /** If set, only deliver to this player ID. */
  forPlayer?: string;
}

export type MatchObserver = Observer<MatchEvent>;

export class MatchEventBus {
  private readonly subject = new InMemorySubject<MatchEvent>();

  publish(sessionId: string, event: MatchEvent): void {
    this.subject.notify(sessionId, event);
  }

  subscribe(
    sessionId: string,
    callback: (event: MatchEvent) => void | Promise<void>,
  ): MatchObserver {
    const observer = { update: callback };
    this.subject.attach(sessionId, observer);
    return observer;
  }

  unsubscribe(sessionId: string, observer: MatchObserver): void {
    this.subject.detach(sessionId, observer);
  }
}

export const matchEventBus = new MatchEventBus();
