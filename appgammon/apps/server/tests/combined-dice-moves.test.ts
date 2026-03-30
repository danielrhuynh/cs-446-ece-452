import { describe, it, expect } from "vitest";
import {
  type Board,
  type Bar,
  type BorneOff,
  type Dice,
  type Move,
  INITIAL_BAR,
  INITIAL_BORNE_OFF,
  initializeDiceUsed,
  getAvailableDice,
  getValidMoves,
  getDieValueForMove,
  markDieUsed,
  applyMove,
  validateTurn,
  hasAnyLegalMove,
} from "@appgammon/common";

// Board where player1 has checkers on points 0, 5, 11 with clear paths forward.
// Player1 moves 0→23.
function openBoard(): Board {
  const board: Board = new Array(24).fill(0);
  board[0] = 2;
  board[5] = 3;
  board[11] = 5;
  board[18] = 5;
  // player2 checkers far away
  board[23] = -5;
  board[20] = -5;
  board[13] = -5;
  return board;
}

// Simulates the client's combined-dice logic from handlePointPress.
// Given a selected source and tapped destination, tries to find a two-move path.
function findCombinedMove(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: ReturnType<typeof initializeDiceUsed>,
  selectedFrom: number,
  destination: number,
  role: "player1" | "player2",
): Move[] | null {
  const available = getAvailableDice(dice, diceUsed);
  if (available.length < 2) return null;

  const uniqueDice = [...new Set(available)];
  for (const die1 of uniqueDice) {
    const firstMoves = getValidMoves(board, bar, borneOff, role, die1);
    for (const firstMove of firstMoves) {
      if (firstMove.from !== selectedFrom) continue;
      const after = applyMove(board, bar, borneOff, firstMove, role);
      const updatedDiceUsed = markDieUsed(dice, diceUsed, die1);
      const remaining = getAvailableDice(dice, updatedDiceUsed);
      for (const die2 of [...new Set(remaining)]) {
        const secondMoves = getValidMoves(after.board, after.bar, after.borneOff, role, die2);
        const secondMove = secondMoves.find(
          (m) => m.from === firstMove.to && m.to === destination,
        );
        if (secondMove) {
          return [firstMove, secondMove];
        }
      }
    }
  }
  return null;
}

describe("combined dice moves", () => {
  it("finds a 2+3=5 combined move on an open board", () => {
    const board = openBoard();
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    // Player1 at point 0, tap point 5 (distance 5 = 2+3)
    const result = findCombinedMove(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, 0, 5, "player1");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    // Should route through either 0→2→5 or 0→3→5
    const totalDistance = getDieValueForMove(result![0], "player1") + getDieValueForMove(result![1], "player1");
    expect(totalDistance).toBe(5);
    expect(result![0].from).toBe(0);
    expect(result![1].to).toBe(5);
  });

  it("server validates the two-move sequence from combined dice", () => {
    const board = openBoard();
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    // Submit [0→2, 2→5] (using die 2 then die 3)
    const moves: Move[] = [
      { from: 0, to: 2 },
      { from: 2, to: 5 },
    ];
    const result = validateTurn(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, moves, "player1");
    expect(result.valid).toBe(true);
  });

  it("server validates reversed die order [0→3, 3→5]", () => {
    const board = openBoard();
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    const moves: Move[] = [
      { from: 0, to: 3 },
      { from: 3, to: 5 },
    ];
    const result = validateTurn(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, moves, "player1");
    expect(result.valid).toBe(true);
  });

  it("routes through unblocked intermediate when one path is blocked", () => {
    const board = openBoard();
    // Block point 2 with opponent checkers
    board[2] = -2;
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    // 0→2 is blocked, so must go 0→3→5
    const result = findCombinedMove(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, 0, 5, "player1");

    expect(result).not.toBeNull();
    expect(result![0]).toEqual({ from: 0, to: 3 });
    expect(result![1]).toEqual({ from: 3, to: 5 });
  });

  it("returns null when both intermediate points are blocked", () => {
    const board = openBoard();
    // Block both intermediate points
    board[2] = -2; // blocks 0+2
    board[3] = -2; // blocks 0+3
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    const result = findCombinedMove(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, 0, 5, "player1");
    expect(result).toBeNull();
  });

  it("works with doubles (3+3=6)", () => {
    const board = openBoard();
    const dice: Dice = [3, 3];
    const diceUsed = initializeDiceUsed(dice); // [false, false, false, false]

    // Player1 at point 0, tap point 6
    const result = findCombinedMove(board, INITIAL_BAR, INITIAL_BORNE_OFF, dice, diceUsed, 0, 6, "player1");

    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ from: 0, to: 3 });
    expect(result![1]).toEqual({ from: 3, to: 6 });
  });

  it("incremental moves still work (move 2, then move 3 separately)", () => {
    const board = openBoard();
    const dice: Dice = [2, 3];
    const diceUsed = initializeDiceUsed(dice);

    // First move: 0→2 using die value 2
    const move1: Move = { from: 0, to: 2 };
    const die1 = getDieValueForMove(move1, "player1");
    expect(die1).toBe(2);

    const after1 = applyMove(board, INITIAL_BAR, INITIAL_BORNE_OFF, move1, "player1");
    const diceUsed1 = markDieUsed(dice, diceUsed, die1);

    // Second move: 2→5 using die value 3
    const move2: Move = { from: 2, to: 5 };
    const die2 = getDieValueForMove(move2, "player1");
    expect(die2).toBe(3);

    const available = getAvailableDice(dice, diceUsed1);
    expect(available).toContain(3);

    const validMoves = getValidMoves(after1.board, after1.bar, after1.borneOff, "player1", 3);
    const isValid = validMoves.some((m) => m.from === 2 && m.to === 5);
    expect(isValid).toBe(true);
  });
});

describe("auto-skip turn (no legal moves)", () => {
  it("detects no legal moves when bar entry is fully blocked", () => {
    const board: Board = new Array(24).fill(0);
    // Player2 blocks all 6 entry points for player1 (points 0-5)
    board[0] = -2;
    board[1] = -2;
    board[2] = -2;
    board[3] = -2;
    board[4] = -2;
    board[5] = -2;
    // Player1 has a checker on the bar
    const bar: Bar = { player1: 1, player2: 0 };

    const dice: Dice = [3, 5];
    const diceUsed = initializeDiceUsed(dice);

    const canMove = hasAnyLegalMove(board, bar, INITIAL_BORNE_OFF, dice, diceUsed, "player1");
    expect(canMove).toBe(false);
  });

  it("detects legal move when one bar entry point is open", () => {
    const board: Board = new Array(24).fill(0);
    board[0] = -2;
    board[1] = -2;
    board[2] = 0; // point 2 is open, die value 3 enters here
    board[3] = -2;
    board[4] = -2;
    board[5] = -2;
    const bar: Bar = { player1: 1, player2: 0 };

    const dice: Dice = [3, 5];
    const diceUsed = initializeDiceUsed(dice);

    const canMove = hasAnyLegalMove(board, bar, INITIAL_BORNE_OFF, dice, diceUsed, "player1");
    expect(canMove).toBe(true);
  });

  it("validates empty move submission when no moves possible", () => {
    const board: Board = new Array(24).fill(0);
    board[0] = -2;
    board[1] = -2;
    board[2] = -2;
    board[3] = -2;
    board[4] = -2;
    board[5] = -2;
    const bar: Bar = { player1: 1, player2: 0 };

    const dice: Dice = [3, 5];
    const diceUsed = initializeDiceUsed(dice);

    // Submitting zero moves should be valid when no moves are possible
    const result = validateTurn(board, bar, INITIAL_BORNE_OFF, dice, diceUsed, [], "player1");
    expect(result.valid).toBe(true);
  });
});
