import { describe, expect, it } from "vitest";
import {
  INITIAL_BAR,
  INITIAL_BOARD,
  INITIAL_BORNE_OFF,
  advanceTurnState,
  applySeriesPoints,
  createOpeningGameState,
  type Bar,
  type Board,
  type BorneOff,
  type Dice,
} from "@appgammon/common";

function openBoard(): Board {
  const board: Board = Array.from({ length: 24 }, () => 0);
  board[0] = 2;
  board[5] = 3;
  board[11] = 5;
  board[18] = 5;
  board[23] = -5;
  board[20] = -5;
  board[13] = -5;
  return board;
}

describe("game state helpers", () => {
  it("creates the opening game state with the correct first player", () => {
    const game = createOpeningGameState({
      seriesId: "series-1",
      player1Id: "player-1",
      player2Id: "player-2",
      openingDice: [6, 3],
      initialBoard: INITIAL_BOARD,
      initialBar: INITIAL_BAR,
      initialBorneOff: INITIAL_BORNE_OFF,
    });

    expect(game.currentTurn).toBe("player-1");
    expect(game.turnPhase).toBe("moving");
    expect(game.dice).toEqual([6, 3]);
    expect(game.diceUsed).toEqual([false, false]);
    expect(game.doublingCube).toBe(1);
  });

  it("applies series points and marks the series complete at the target score", () => {
    const result = applySeriesPoints({
      player1Score: 2,
      player2Score: 0,
      bestOf: 3,
      winnerRole: "player1",
      points: 1,
    });

    expect(result.player1Score).toBe(3);
    expect(result.player2Score).toBe(0);
    expect(result.status).toBe("complete");
    expect(result.winnerRole).toBe("player1");
  });

  it("advances into the double-or-roll phase when the next player can own the cube", () => {
    const result = advanceTurnState({
      board: openBoard(),
      bar: INITIAL_BAR,
      borneOff: INITIAL_BORNE_OFF,
      player1Id: "player-1",
      currentPlayerId: "player-1",
      opponentId: "player-2",
      doublingCube: 2,
      cubeOwner: null,
      opponentRoll: [2, 3],
      currentPlayerRoll: [4, 5],
    });

    expect(result.currentTurn).toBe("player-2");
    expect(result.turnPhase).toBe("waiting_for_roll_or_double");
    expect(result.dice).toEqual([2, 3]);
  });

  it("keeps the current player when the opponent is blocked and the re-roll is playable", () => {
    const board: Board = Array.from({ length: 24 }, () => 0);
    board[0] = 2;
    board[23] = 2;
    const bar: Bar = { player1: 0, player2: 1 };
    const borneOff: BorneOff = { player1: 0, player2: 0 };

    const result = advanceTurnState({
      board,
      bar,
      borneOff,
      player1Id: "player-1",
      currentPlayerId: "player-1",
      opponentId: "player-2",
      doublingCube: 64,
      cubeOwner: "player-1",
      opponentRoll: [1, 1],
      currentPlayerRoll: [6, 6],
    });

    expect(result.currentTurn).toBe("player-1");
    expect(result.turnPhase).toBe("moving");
    expect(result.dice).toEqual([6, 6]);
  });

  it("falls back to the opponent when both players are blocked", () => {
    const board: Board = Array.from({ length: 24 }, () => 0);
    board[0] = -2;
    board[23] = 2;
    const bar: Bar = { player1: 1, player2: 1 };
    const borneOff: BorneOff = { player1: 0, player2: 0 };
    const fallbackRoll: Dice = [5, 6];

    const result = advanceTurnState({
      board,
      bar,
      borneOff,
      player1Id: "player-1",
      currentPlayerId: "player-1",
      opponentId: "player-2",
      doublingCube: 64,
      cubeOwner: "player-1",
      opponentRoll: [1, 1],
      currentPlayerRoll: [1, 1],
      fallbackOpponentRoll: fallbackRoll,
    });

    expect(result.currentTurn).toBe("player-2");
    expect(result.turnPhase).toBe("moving");
    expect(result.dice).toEqual(fallbackRoll);
  });
});
