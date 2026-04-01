import { beforeEach, describe, expect, it, vi } from "vitest";
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
    created_at: new Date().toISOString(),
    player_1: { id: "player-1", name: "Host" },
    player_2: { id: "player-2", name: "Guest" },
  };
}

describe("session service", () => {
  const repo = {
    create: vi.fn(),
    join: vi.fn(),
    get: vi.fn(),
    cancel: vi.fn(),
    upsertPlayer: vi.fn(),
  } satisfies Record<keyof typeof sessionRepo, ReturnType<typeof vi.fn>>;

  const eventBus = {
    publish: vi.fn(),
  };

  let service: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionService(repo as unknown as typeof sessionRepo, eventBus);
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

  it("publishes session_cancelled after a successful cancel", async () => {
    const session = buildMappedSession();
    repo.cancel.mockResolvedValue(session);
    repo.get.mockResolvedValue(session);

    const result = await service.cancelSession("ABC123", "player-1");

    expect(result).toEqual(session);
    expect(eventBus.publish).toHaveBeenCalledWith("ABC123", {
      type: "session_cancelled",
      session,
    });
  });
});
