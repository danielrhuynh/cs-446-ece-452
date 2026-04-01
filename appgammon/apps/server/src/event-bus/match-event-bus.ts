import type { MatchEventType } from "@appgammon/common";
import { InMemorySubject } from "./event-bus";

export interface MatchEvent {
  type: MatchEventType;
  data: unknown;
  /** If set, only deliver to this player ID. */
  forPlayer?: string;
}

export class MatchEventBus {
  private readonly subject = new InMemorySubject<MatchEvent>();

  publish(sessionId: string, event: MatchEvent): void {
    this.subject.notify(sessionId, event);
  }

  subscribe(sessionId: string, callback: (event: MatchEvent) => void | Promise<void>): () => void {
    return this.subject.attach(sessionId, { update: callback });
  }
}

export const matchEventBus = new MatchEventBus();
