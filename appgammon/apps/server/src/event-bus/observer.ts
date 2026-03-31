export interface Observer<T> {
  update(event: T): void | Promise<void>;
}

export interface Subject<T> {
  attach(channel: string, observer: Observer<T>): () => void;
  detach(channel: string, observer: Observer<T>): void;
  notify(channel: string, event: T): void;
}
