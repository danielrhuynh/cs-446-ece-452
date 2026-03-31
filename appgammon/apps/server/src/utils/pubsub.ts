/**
 * Generic in-memory pub/sub factory.
 * Used by both session and game event systems.
 */

type Callback<T> = (event: T) => void;

export interface PubSub<T> {
  subscribe(channel: string, callback: Callback<T>): () => void;
  publish(channel: string, event: T): void;
}

export function createPubSub<T>(): PubSub<T> {
  const subscribers = new Map<string, Set<Callback<T>>>();

  return {
    subscribe(channel: string, callback: Callback<T>): () => void {
      if (!subscribers.has(channel)) {
        subscribers.set(channel, new Set());
      }
      subscribers.get(channel)!.add(callback);

      return () => {
        const subs = subscribers.get(channel);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) subscribers.delete(channel);
        }
      };
    },

    publish(channel: string, event: T) {
      const subs = subscribers.get(channel);
      if (subs) {
        for (const cb of subs) {
          cb(event);
        }
      }
    },
  };
}
