import type { GameEvent } from "../utils/game-events";
import { publishGame, subscribeGame } from "../utils/game-events";

export interface GameEventBus {
  publish(sessionId: string, event: GameEvent): void;
  subscribe(sessionId: string, callback: (event: GameEvent) => void): () => void;
}

export const gameEventBus: GameEventBus = {
  publish(sessionId, event) {
    publishGame(sessionId, event);
  },
  subscribe(sessionId, callback) {
    return subscribeGame(sessionId, callback);
  },
};
