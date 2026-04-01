import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionRepo } from "../src/repositories/session-repository";
import { SessionService } from "../src/services/session-service";

vi.mock("../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

function buildMappedSession() {
  return {
    id: "ABC123",
    status: "ready" as const,
    player_1_id: "player-1",
    player_2_id: "player-2",
    player_1_connected: true,
    player_2_connected: true,
    reconnect_deadline_at: null,
    created_at: new Date().toISOString(),
    player_1: { id: "player-1", name: "Host" },
    player_2: { id: "player-2", name: "Guest" },
  };
}

describe("session service reconnect flow", () => {
  const repo = {
    create: vi.fn(),
    join: vi.fn(),
    get: vi.fn(),
    cancel: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    upsertPlayer: vi.fn(),
  } satisfies Record<keyof typeof sessionRepo, ReturnType<typeof vi.fn>>;

  const eventBus = {
    publish: vi.fn(),
    subscribe: vi.fn(),
  };

  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new SessionService(repo as unknown as typeof sessionRepo, eventBus);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes session_ready for a brand-new guest join", async () => {
    const session = buildMappedSession();
    repo.join.mockResolvedValue({
      sessionId: "ABC123",
      role: "guest",
      joined: true,
    });
    repo.get.mockResolvedValue(session);

    const result = await service.joinSession("player-2", "ABC123");

    expect(result).toEqual({ session, role: "guest" });
    expect(eventBus.publish).toHaveBeenCalledWith("ABC123", {
      type: "session_ready",
      session,
    });
  });

  it("returns a host resume without publishing session_ready", async () => {
    const session = buildMappedSession();
    repo.join.mockResolvedValue({
      sessionId: "ABC123",
      role: "host",
      joined: false,
    });
    repo.get.mockResolvedValue(session);

    const result = await service.joinSession("player-1", "ABC123");

    expect(result).toEqual({ session, role: "host" });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("publishes session_state when a disconnected player reconnects", async () => {
    const session = {
      ...buildMappedSession(),
      reconnect_deadline_at: null,
    };
    repo.connect.mockResolvedValue(session);

    await service.registerConnection("ABC123", "player-2");

    expect(repo.connect).toHaveBeenCalledWith("ABC123", "player-2");
    expect(eventBus.publish).toHaveBeenCalledWith("ABC123", {
      type: "session_state",
      session,
    });
  });

  it("debounces disconnect publishing until the grace delay expires", async () => {
    repo.connect.mockResolvedValue(null);
    repo.disconnect.mockResolvedValue(buildMappedSession());

    await service.registerConnection("ABC123", "player-2");
    service.releaseConnection("ABC123", "player-2");

    await vi.advanceTimersByTimeAsync(9_999);
    expect(repo.disconnect).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(repo.disconnect).toHaveBeenCalledWith("ABC123", "player-2");
  });

  it("cancels a pending disconnect when the player reconnects before timeout", async () => {
    repo.connect.mockResolvedValue(null);
    repo.disconnect.mockResolvedValue(buildMappedSession());

    await service.registerConnection("ABC123", "player-2");
    service.releaseConnection("ABC123", "player-2");

    await vi.advanceTimersByTimeAsync(5_000);
    await service.registerConnection("ABC123", "player-2");
    await vi.advanceTimersByTimeAsync(10_000);

    expect(repo.disconnect).not.toHaveBeenCalled();
  });
});
