import type { SessionEvent } from "../utils/session-events";
import { publish, subscribe } from "../utils/session-events";

export interface SessionEventBus {
  publish(sessionId: string, event: SessionEvent): void;
  subscribe(sessionId: string, callback: (event: SessionEvent) => void): () => void;
}

export const sessionEventBus: SessionEventBus = {
  publish(sessionId, event) {
    publish(sessionId, event);
  },
  subscribe(sessionId, callback) {
    return subscribe(sessionId, callback);
  },
};
