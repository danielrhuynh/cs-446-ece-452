import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  registerConnection: vi.fn(),
  releaseConnection: vi.fn(),
  getSession: vi.fn(),
  getMatchState: vi.fn(),
  sessionSubscribe: vi.fn(),
  gameSubscribe: vi.fn(),
  streamWriteSSE: vi.fn(),
  streamSleep: vi.fn(),
  streamWrite: vi.fn(),
  streamOnAbort: vi.fn(),
}));

vi.mock("../src/middleware/auth", () => ({
  authenticateRequest: mocks.authenticateRequest,
}));

vi.mock("../src/services/session-service", () => ({
  sessionService: {
    registerConnection: mocks.registerConnection,
    releaseConnection: mocks.releaseConnection,
    getSession: mocks.getSession,
  },
}));

vi.mock("../src/services/game-service", () => ({
  matchService: {
    getMatchState: mocks.getMatchState,
  },
}));

vi.mock("../src/event-bus/session-event-bus", () => ({
  sessionEventBus: {
    subscribe: mocks.sessionSubscribe,
  },
}));

vi.mock("../src/event-bus/game-event-bus", () => ({
  gameEventBus: {
    subscribe: mocks.gameSubscribe,
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

describe("session events SSE cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.authenticateRequest.mockResolvedValue({ sub: "player-1" });
    mocks.registerConnection.mockResolvedValue(undefined);
    mocks.getSession.mockResolvedValue({
      id: "ABC123",
      player_1_id: "player-1",
      player_2_id: "player-2",
    });
    mocks.getMatchState.mockResolvedValue(null);
    mocks.sessionSubscribe.mockReturnValue(vi.fn());
    mocks.gameSubscribe.mockReturnValue(vi.fn());
    mocks.streamWriteSSE.mockResolvedValue(undefined);
    mocks.streamSleep.mockResolvedValue(undefined);
    mocks.streamWrite.mockResolvedValue(undefined);
    mocks.streamOnAbort.mockImplementation(() => undefined);
  });

  it("releases presence when match-state setup fails before streaming begins", async () => {
    mocks.getMatchState.mockRejectedValue(new Error("match state unavailable"));

    const res = await app.request("/sessions/ABC123/events", {
      headers: {
        Authorization: "Bearer test-token",
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(500);
    expect(mocks.releaseConnection).toHaveBeenCalledTimes(1);
    expect(mocks.releaseConnection).toHaveBeenCalledWith("ABC123", "player-1");
  });

  it("releases presence once when the initial SSE write fails", async () => {
    mocks.streamWriteSSE.mockRejectedValueOnce(new Error("broken pipe"));

    const res = await app.request("/sessions/ABC123/events", {
      headers: {
        Authorization: "Bearer test-token",
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(500);
    expect(mocks.releaseConnection).toHaveBeenCalledTimes(1);
    expect(mocks.releaseConnection).toHaveBeenCalledWith("ABC123", "player-1");
    expect(mocks.sessionSubscribe).not.toHaveBeenCalled();
    expect(mocks.gameSubscribe).not.toHaveBeenCalled();
  });
});
