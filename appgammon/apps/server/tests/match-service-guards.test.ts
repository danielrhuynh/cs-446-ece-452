import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchRepo } from "../src/repositories/match-repository";
import type { MatchGameContext, SessionPlayers } from "../src/repositories/match-repository";
import { MatchService } from "../src/services/match-service";

vi.mock("../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

function buildSessionPlayers(overrides: Partial<SessionPlayers> = {}): SessionPlayers {
  return {
    player1Id: "player-1",
    player2Id: "player-2",
    ...overrides,
  };
}

function buildGameContext(overrides: Partial<MatchGameContext> = {}): MatchGameContext {
  return {
    game: {
      id: "game-1",
      matchId: "match-1",
      board: Array(24).fill(0),
      bar: { player1: 0, player2: 0 },
      borneOff: { player1: 0, player2: 0 },
      currentTurn: "player-1",
      turnPhase: "moving",
      dice: [1, 2],
      diceUsed: [false, false],
      doublingCube: 1,
      cubeOwner: null,
      version: 1,
      status: "in_progress",
      winnerId: null,
    },
    ...buildSessionPlayers(),
    ...overrides,
  };
}

describe("match-service guards", () => {
  const repo = {
    getSessionPlayers: vi.fn(),
    getGameInSession: vi.fn(),
    getActiveGame: vi.fn(),
    createGame: vi.fn(),
    updateGame: vi.fn(),
    createMatch: vi.fn(),
    getMatch: vi.fn(),
    getActiveMatch: vi.fn(),
    updateMatch: vi.fn(),
    countMoves: vi.fn(),
    appendMoves: vi.fn(),
  } satisfies Record<keyof typeof matchRepo, ReturnType<typeof vi.fn>>;

  const eventBus = {
    publish: vi.fn(),
    subscribe: vi.fn(),
  };

  let service: MatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MatchService(repo as unknown as typeof matchRepo, eventBus);
    repo.getActiveMatch.mockResolvedValue(null);
    repo.getSessionPlayers.mockResolvedValue(buildSessionPlayers());
  });

  it("rejects creating a second active match for the same session", async () => {
    repo.getActiveMatch.mockResolvedValue({
      id: "match-1",
      sessionId: "ABC123",
      targetScore: 3,
      player1Score: 0,
      player2Score: 0,
      status: "active",
      winnerId: null,
    });

    const result = await service.startMatch("ABC123", 3);

    expect(result).toEqual({
      success: false,
      error: "An active match already exists for this session",
      status: 409,
    });
    expect(repo.createMatch).not.toHaveBeenCalled();
  });

  it("rejects move submission when the game does not belong to the session", async () => {
    repo.getGameInSession.mockResolvedValue(null);

    const result = await service.submitMoves("game-1", "player-1", 1, [], "ABC123");

    expect(result).toEqual({
      success: false,
      error: "Game not found for session",
      status: 404,
    });
  });

  it("rejects starting a match when the session is missing a guest", async () => {
    repo.getSessionPlayers.mockResolvedValue(null);

    const result = await service.startMatch("ABC123", 3);

    expect(result).toEqual({
      success: false,
      error: "Session not found or missing player 2",
      status: 404,
    });
    expect(repo.createMatch).not.toHaveBeenCalled();
  });
});
