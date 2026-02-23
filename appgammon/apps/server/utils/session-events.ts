import type { SessionEventType, SessionWithPlayers } from "@appgammon/common";

export interface SessionEvent {
  type: SessionEventType;
  session: SessionWithPlayers;
}

type Callback = (event: SessionEvent) => void;

const subscribers = new Map<string, Set<Callback>>();

export function subscribe(sessionId: string, callback: Callback): () => void {
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

export function publish(sessionId: string, event: SessionEvent) {
  const subs = subscribers.get(sessionId);
  if (subs) {
    for (const cb of subs) {
      cb(event);
    }
  }
}
