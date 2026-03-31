import type { MatchEventType } from "@appgammon/common";
import { ChannelSubject } from "./channel-subject";

export interface GameEvent {
  type: MatchEventType;
  data: unknown;
  /** If set, only deliver to this player ID. */
  forPlayer?: string;
}

export interface GameEventBus {
  publish(sessionId: string, event: GameEvent): void;
  subscribe(sessionId: string, callback: (event: GameEvent) => void | Promise<void>): () => void;
}

class InMemoryGameEventBus implements GameEventBus {
  private readonly subject = new ChannelSubject<GameEvent>();

  publish(sessionId: string, event: GameEvent): void {
    this.subject.notify(sessionId, event);
  }

  subscribe(sessionId: string, callback: (event: GameEvent) => void | Promise<void>): () => void {
    return this.subject.attach(sessionId, { update: callback });
  }
}

export const gameEventBus: GameEventBus = new InMemoryGameEventBus();
