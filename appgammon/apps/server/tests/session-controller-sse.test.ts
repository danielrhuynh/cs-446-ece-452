import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkAuth: vi.fn(),
  getSession: vi.fn(),
  getMatchState: vi.fn(),
  sessionSubscribe: vi.fn(),
  sessionUnsubscribe: vi.fn(),
  matchSubscribe: vi.fn(),
  matchUnsubscribe: vi.fn(),
  streamWriteSSE: vi.fn(),
  streamSleep: vi.fn(),
  streamWrite: vi.fn(),
  streamOnAbort: vi.fn(),
  currentStream: undefined as { closed: boolean } | undefined,
}));

vi.mock("../src/utils/auth", () => ({
  checkAuth: mocks.checkAuth,
}));

vi.mock("../src/services/session-service", () => ({
  sessionService: {
    getSession: mocks.getSession,
  },
}));

vi.mock("../src/services/match-service", () => ({
  matchService: {
    getMatchState: mocks.getMatchState,
  },
}));

vi.mock("../src/event-bus/session-event-bus", () => ({
  sessionEventBus: {
    subscribe: mocks.sessionSubscribe,
    unsubscribe: mocks.sessionUnsubscribe,
  },
}));

vi.mock("../src/event-bus/match-event-bus", () => ({
  matchEventBus: {
    subscribe: mocks.matchSubscribe,
    unsubscribe: mocks.matchUnsubscribe,
  },
}));

vi.mock("hono/streaming", () => ({
  streamSSE: async (_c: unknown, handler: (stream: unknown) => Promise<unknown>) => {
    const stream = {
      aborted: false,
      closed: false,
      writeSSE: mocks.streamWriteSSE,
      sleep: mocks.streamSleep,
      write: mocks.streamWrite,
      onAbort: mocks.streamOnAbort,
    };
    mocks.currentStream = stream;

    try {
      await handler(stream);
      return new Response(null, { status: 200 });
    } catch {
      return new Response(null, { status: 500 });
    }
  },
}));

import { sessionRoutes } from "../src/controllers/session-controller";

const app = new Hono().route("/sessions", sessionRoutes);

describe("session events SSE errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const sessionObserver = { update: vi.fn() };
    const matchObserver = { update: vi.fn() };

    mocks.checkAuth.mockResolvedValue({ sub: "player-1" });
    mocks.getSession.mockResolvedValue({
      id: "ABC123",
      player_1_id: "player-1",
      player_2_id: "player-2",
    });
    mocks.getMatchState.mockResolvedValue(null);
    mocks.sessionSubscribe.mockReturnValue(sessionObserver);
    mocks.matchSubscribe.mockReturnValue(matchObserver);
    mocks.streamWriteSSE.mockResolvedValue(undefined);
    mocks.streamSleep.mockResolvedValue(undefined);
    mocks.streamWrite.mockResolvedValue(undefined);
    mocks.streamOnAbort.mockImplementation(() => undefined);
  });

  it("returns 500 when match-state setup fails before streaming begins", async () => {
    mocks.getMatchState.mockRejectedValue(new Error("match state unavailable"));

    const res = await app.request("/sessions/ABC123/events", {
      headers: {
        Authorization: "Bearer test-token",
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(500);
    expect(mocks.streamWriteSSE).not.toHaveBeenCalled();
    expect(mocks.sessionSubscribe).not.toHaveBeenCalled();
    expect(mocks.matchSubscribe).not.toHaveBeenCalled();
  });

  it("returns 500 when the initial SSE write fails", async () => {
    mocks.streamWriteSSE.mockRejectedValueOnce(new Error("broken pipe"));

    const res = await app.request("/sessions/ABC123/events", {
      headers: {
        Authorization: "Bearer test-token",
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(500);
    expect(mocks.sessionSubscribe).not.toHaveBeenCalled();
    expect(mocks.matchSubscribe).not.toHaveBeenCalled();
  });

  it("explicitly unsubscribes both observers when the stream closes", async () => {
    mocks.streamSleep.mockImplementation(async () => {
      const stream = mocks.currentStream;
      if (stream) {
        stream.closed = true;
      }
    });

    const res = await app.request("/sessions/ABC123/events", {
      headers: {
        Authorization: "Bearer test-token",
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(200);
    expect(mocks.sessionSubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.matchSubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.sessionUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mocks.matchUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
