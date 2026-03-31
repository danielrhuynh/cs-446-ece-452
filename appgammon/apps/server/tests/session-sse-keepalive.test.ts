import { describe, expect, it, vi } from "vitest";
import { runSSEKeepaliveLoop } from "../src/controllers/session-controller";

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
});
