import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@appgammon/common";

const mocks = vi.hoisted(() => ({
  rollDice: vi.fn(),
  hasAnyLegalMove: vi.fn(),
  repo: {
    getGame: vi.fn(),
    getSessionPlayers: vi.fn(),
    updateGame: vi.fn(),
    getActiveSeries: vi.fn(),
    getActiveGame: vi.fn(),
  },
  publish: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("@appgammon/common", async () => {
  const actual = await vi.importActual<typeof import("@appgammon/common")>("@appgammon/common");
  return {
    ...actual,
    hasAnyLegalMove: mocks.hasAnyLegalMove,
    rollDice: mocks.rollDice,
  };
});

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

describe("rollForTurn", () => {
  let rollForTurn: typeof import("../src/services/game-service.js").rollForTurn;

  beforeAll(async () => {
    ({ rollForTurn } = await import("../src/services/game-service.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repo.getActiveSeries.mockResolvedValue(null);
  });

  it("re-rolls for the original player when their dead pre-roll and the opponent roll are both blocked", async () => {
    const game: GameState = {
      id: "game-1",
      seriesId: "series-1",
      board: Array.from({ length: 24 }, () => 0),
      bar: { player1: 1, player2: 1 },
      borneOff: { player1: 0, player2: 0 },
      currentTurn: "player-1",
      turnPhase: "waiting_for_roll_or_double",
      dice: [1, 1],
      diceUsed: [false, false, false, false],
      doublingCube: 64,
      cubeOwner: "player-1",
      version: 7,
      status: "in_progress",
      winnerId: null,
    };

    game.board[0] = -2;
    game.board[23] = 2;

    mocks.repo.getGame.mockResolvedValue(game);
    mocks.repo.getSessionPlayers.mockResolvedValue({
      player1Id: "player-1",
      player2Id: "player-2",
    });
    mocks.hasAnyLegalMove
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    mocks.rollDice.mockReturnValueOnce([2, 2]).mockReturnValueOnce([5, 6]);

    const result = await rollForTurn("game-1", "player-1", "session-1");

    expect(result).toEqual({ success: true });
    expect(mocks.repo.updateGame).toHaveBeenCalledWith("game-1", {
      currentTurn: "player-1",
      turnPhase: "moving",
      dice: [5, 6],
      diceUsed: [false, false],
      version: 8,
    });
  });
});
