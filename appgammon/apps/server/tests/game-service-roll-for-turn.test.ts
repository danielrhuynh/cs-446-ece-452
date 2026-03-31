import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState } from "@appgammon/common";
import type { GameEventBus } from "../src/event-bus/game-event-bus";
import type { GameRepository } from "../src/repositories/game-repository";
import { MatchService } from "../src/services/game-service";

const mocks = vi.hoisted(() => ({
  rollDice: vi.fn(),
  hasAnyLegalMove: vi.fn(),
  advanceTurnState: vi.fn(),
}));

vi.mock("@appgammon/common", async () => {
  const actual = await vi.importActual<typeof import("@appgammon/common")>("@appgammon/common");
  return {
    ...actual,
    hasAnyLegalMove: mocks.hasAnyLegalMove,
    rollDice: mocks.rollDice,
    advanceTurnState: mocks.advanceTurnState,
  };
});

vi.mock("../src/utils/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("rollForTurn", () => {
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
  } satisfies Record<keyof GameRepository, ReturnType<typeof vi.fn>>;

  const eventBus = {
    publish: vi.fn(),
    subscribe: vi.fn(),
  } satisfies GameEventBus;

  let service: MatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MatchService(repo as unknown as GameRepository, eventBus);
    repo.getActiveMatch.mockResolvedValue(null);
  });

  it("falls back to the opponent pre-roll when both players are blocked", async () => {
    const game: GameState = {
      id: "game-1",
      matchId: "match-1",
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

    repo.getGameInSession.mockResolvedValue({
      game,
      player1Id: "player-1",
      player2Id: "player-2",
      player1Connected: true,
      player2Connected: true,
    });
    mocks.hasAnyLegalMove.mockReturnValueOnce(false);
    mocks.rollDice
      .mockReturnValueOnce([2, 2])
      .mockReturnValueOnce([5, 6])
      .mockReturnValueOnce([4, 1]);
    mocks.advanceTurnState.mockReturnValue({
      currentTurn: "player-2",
      turnPhase: "waiting_for_roll_or_double",
      dice: [4, 1],
      diceUsed: [false, false],
    });

    const result = await service.rollForTurn("game-1", "player-1", "session-1");

    expect(result).toEqual({ success: true });
    expect(mocks.advanceTurnState).toHaveBeenCalledWith({
      board: game.board,
      bar: game.bar,
      borneOff: game.borneOff,
      player1Id: "player-1",
      currentPlayerId: "player-1",
      opponentId: "player-2",
      doublingCube: 64,
      cubeOwner: "player-1",
      opponentRoll: [2, 2],
      currentPlayerRoll: [5, 6],
      fallbackOpponentRoll: [4, 1],
    });
    expect(repo.updateGame).toHaveBeenCalledWith("game-1", {
      currentTurn: "player-2",
      turnPhase: "waiting_for_roll_or_double",
      dice: [4, 1],
      diceUsed: [false, false],
      version: 8,
    });
  });
});
