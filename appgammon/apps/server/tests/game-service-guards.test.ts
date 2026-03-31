import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  repo: {
    getActiveSeries: vi.fn(),
    getSessionPlayers: vi.fn(),
    createSeries: vi.fn(),
    createGame: vi.fn(),
    getGameInSession: vi.fn(),
  },
  publish: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("../src/repositories/game-repository", () => ({
  drizzleGameRepository: mocks.repo,
}));

vi.mock("../src/event-bus/game-event-bus", () => ({
  gameEventBus: {
    publish: mocks.publish,
  },
}));

vi.mock("../src/utils/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
  },
}));

describe("game-service guards", () => {
  let startSeries: typeof import("../src/services/game-service.js").startSeries;
  let submitMoves: typeof import("../src/services/game-service.js").submitMoves;

  beforeAll(async () => {
    ({ startSeries, submitMoves } = await import("../src/services/game-service.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.getActiveSeries.mockResolvedValue(null);
  });

  it("rejects creating a second active series for the same session", async () => {
    mocks.repo.getActiveSeries.mockResolvedValue({
      id: "series-1",
      sessionId: "ABC123",
      bestOf: 3,
      player1Score: 0,
      player2Score: 0,
      status: "active",
      winnerId: null,
    });

    const result = await startSeries("ABC123", 3);

    expect(result).toEqual({
      success: false,
      error: "An active series already exists for this session",
      status: 409,
    });
    expect(mocks.repo.createSeries).not.toHaveBeenCalled();
  });

  it("rejects move submission when the game does not belong to the session", async () => {
    mocks.repo.getGameInSession.mockResolvedValue(null);

    const result = await submitMoves("game-1", "player-1", 1, [], "ABC123");

    expect(result).toEqual({
      success: false,
      error: "Game not found for session",
      status: 404,
    });
  });
});
