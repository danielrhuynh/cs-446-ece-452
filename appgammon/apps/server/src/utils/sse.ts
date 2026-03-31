import type { SSEMessage } from "hono/streaming";

type KeepaliveStream = {
  aborted: boolean;
  closed: boolean;
  sleep: (ms: number) => Promise<unknown>;
  write: (input: string) => Promise<unknown>;
  onAbort: (listener: () => void | Promise<void>) => void;
};

type SubscriptionStream = KeepaliveStream & {
  writeSSE: (message: SSEMessage) => Promise<unknown>;
};

export async function runSSEKeepaliveLoop(
  stream: KeepaliveStream,
  unsubscribe: () => void,
  intervalMs = 15000,
) {
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    unsubscribe();
  };

  stream.onAbort(cleanup);

  try {
    for (;;) {
      await stream.sleep(intervalMs);
      if (stream.aborted || stream.closed) return;
      await stream.write(":keepalive\n\n");
    }
  } finally {
    cleanup();
  }
}

export async function runSSESubscription(
  stream: SubscriptionStream,
  {
    initialMessage,
    subscribe,
    intervalMs,
  }: {
    initialMessage: SSEMessage;
    subscribe: (send: (message: SSEMessage) => void) => () => void;
    intervalMs?: number;
  },
) {
  await stream.writeSSE(initialMessage);
  const unsubscribe = subscribe((message) => {
    stream.writeSSE(message).catch(() => {});
  });
  await runSSEKeepaliveLoop(stream, unsubscribe, intervalMs);
}
