import type { Observer, Subject } from "./observer";

/**
 * In-memory subject that manages observers per session/game channel.
 * This makes the Observer pattern explicit instead of hiding it behind callbacks.
 */
export class ChannelSubject<T> implements Subject<T> {
  private readonly observers = new Map<string, Set<Observer<T>>>();

  attach(channel: string, observer: Observer<T>): () => void {
    const channelObservers = this.observers.get(channel);
    if (channelObservers) {
      channelObservers.add(observer);
    } else {
      this.observers.set(channel, new Set([observer]));
    }

    return () => {
      this.detach(channel, observer);
    };
  }

  detach(channel: string, observer: Observer<T>): void {
    const channelObservers = this.observers.get(channel);
    if (!channelObservers) return;

    channelObservers.delete(observer);
    if (channelObservers.size === 0) {
      this.observers.delete(channel);
    }
  }

  notify(channel: string, event: T): void {
    const channelObservers = this.observers.get(channel);
    if (!channelObservers) return;

    for (const observer of channelObservers) {
      void Promise.resolve(observer.update(event)).catch(() => {});
    }
  }
}
