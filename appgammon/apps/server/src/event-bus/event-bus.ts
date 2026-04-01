/**
 * Observer pattern as defined in the lecture content.
 * https://pengyunie.github.io/cs446-1261/docs/lectures/design-patterns/behavioral/#observer
 */
export interface Observer<T> {
  update(event: T): void | Promise<void>;
}

export interface Subject<T> {
  attach(channel: string, observer: Observer<T>): void;
  detach(channel: string, observer: Observer<T>): void;
  notify(channel: string, event: T): void;
}

/**
 * An in-memory implementation for the observer pattern. This can be swapped for
 * other implementations, say using Redis for this, allowing for distributing the
 * events across multiple backend instances.
 */
export class InMemorySubject<T> implements Subject<T> {
  private readonly observers = new Map<string, Set<Observer<T>>>();

  attach(channel: string, observer: Observer<T>): void {
    const channelObservers = this.observers.get(channel) ?? new Set<Observer<T>>();
    channelObservers.add(observer);
    this.observers.set(channel, channelObservers);
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
