import { describe, expect, it, vi } from "vitest";
import type { SSEMessage } from "hono/streaming";
import { runSSEKeepaliveLoop, runSSESubscription } from "../src/utils/sse";

describe("runSSEKeepaliveLoop", () => {
  it("stops and unsubscribes when the stream aborts", async () => {
    const abortListeners: Array<() => void> = [];
    const writes: string[] = [];

    const stream = {
      aborted: false,
      closed: false,
      async sleep() {
        stream.aborted = true;
        for (const listener of abortListeners) {
          listener();
        }
      },
      async write(input: string) {
        writes.push(input);
      },
      onAbort(listener: () => void) {
        abortListeners.push(listener);
      },
    };

    const unsubscribe = vi.fn();
    await runSSEKeepaliveLoop(stream, unsubscribe, 1);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(0);
  });

  it("sends keepalive comments while open and unsubscribes on exit", async () => {
    const abortListeners: Array<() => void> = [];
    const writes: string[] = [];

    const stream = {
      aborted: false,
      closed: false,
      async sleep() {
        // no-op
      },
      async write(input: string) {
        writes.push(input);
        if (writes.length === 2) {
          stream.closed = true;
        }
      },
      onAbort(listener: () => void) {
        abortListeners.push(listener);
      },
    };

    const unsubscribe = vi.fn();
    await runSSEKeepaliveLoop(stream, unsubscribe, 1);

    expect(writes).toEqual([":keepalive\n\n", ":keepalive\n\n"]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("writes the initial event and forwards subscribed events", async () => {
    const writes: Array<{ event?: string; data: string }> = [];
    let unsubscribe: (() => void) | undefined;

    const stream = {
      aborted: false,
      closed: false,
      async sleep() {
        stream.closed = true;
      },
      async write() {
        return undefined;
      },
      async writeSSE(input: SSEMessage) {
        writes.push({
          event: input.event,
          data: await input.data,
        });
      },
      onAbort() {
        return undefined;
      },
    };

    await runSSESubscription(stream, {
      initialMessage: {
        event: "session_state",
        data: '{"id":"abc"}',
      },
      subscribe(send) {
        send({
          event: "session_updated",
          data: '{"id":"abc","status":"ready"}',
        });
        unsubscribe = vi.fn();
        return unsubscribe;
      },
      intervalMs: 1,
    });

    expect(writes).toEqual([
      { event: "session_state", data: '{"id":"abc"}' },
      { event: "session_updated", data: '{"id":"abc","status":"ready"}' },
    ]);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
