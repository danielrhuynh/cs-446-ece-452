/**
 * In-memory pub/sub for game SSE events.
 * Same pattern as session-events.ts but with game-specific event types.
 */

import type { GameEventType } from "@appgammon/common";

export interface GameEvent {
  type: GameEventType;
  data: unknown;
  /** If set, only deliver to this player ID. */
  forPlayer?: string;
}

type Callback = (event: GameEvent) => void;

const subscribers = new Map<string, Set<Callback>>();

/**
 * Subscribe to game events for a session.
 * Returns an unsubscribe function.
 */
export function subscribeGame(sessionId: string, callback: Callback): () => void {
  if (!subscribers.has(sessionId)) {
    subscribers.set(sessionId, new Set());
  }
  subscribers.get(sessionId)!.add(callback);

  return () => {
    const subs = subscribers.get(sessionId);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) subscribers.delete(sessionId);
    }
  };
}

/**
 * Publish a game event to all subscribers for a session.
 * If event.forPlayer is set, only matching callbacks receive it
 * (callback filtering happens at the consumer level in the SSE controller).
 */
export function publishGame(sessionId: string, event: GameEvent) {
  const subs = subscribers.get(sessionId);
  if (subs) {
    for (const cb of subs) {
      cb(event);
    }
  }
}
