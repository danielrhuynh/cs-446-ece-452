/**
 * Board utilities for backgammon engine.
 *
 * Board: 24-element signed int array.
 *   Positive = player1 checkers, negative = player2 checkers.
 *   Player1 moves in + direction (0→23), player2 moves in - direction (23→0).
 *   Player1 bears off past index 23, player2 bears off past index 0.
 */

import type { Board, Bar, BorneOff, Move, PlayerRole } from "../types";

/** Player1 moves +, player2 moves -. */
export function getDirection(role: PlayerRole): 1 | -1 {
  return role === "player1" ? 1 : -1;
}

/** Get the sign used for this player's checkers on the board. */
export function getSign(role: PlayerRole): 1 | -1 {
  return role === "player1" ? 1 : -1;
}

/** Count of this player's checkers at a point. */
export function checkerCount(board: Board, point: number, role: PlayerRole): number {
  const sign = getSign(role);
  const val = board[point];
  return sign > 0 ? Math.max(val, 0) : Math.max(-val, 0);
}

/** True if the opponent has 2+ checkers at this point (blocked). */
export function isBlocked(board: Board, point: number, role: PlayerRole): boolean {
  const opSign = role === "player1" ? -1 : 1;
  const val = board[point];
  return opSign > 0 ? val >= 2 : val <= -2;
}

/** True if the opponent has exactly 1 checker (a blot). */
export function isBlot(board: Board, point: number, role: PlayerRole): boolean {
  const opSign = role === "player1" ? -1 : 1;
  const val = board[point];
  return opSign > 0 ? val === 1 : val === -1;
}

/** Home board range for a player: [start, end] inclusive. */
export function getHomeRange(role: PlayerRole): [number, number] {
  return role === "player1" ? [18, 23] : [0, 5];
}

/** Check if ALL of a player's checkers are in their home board (none on bar). */
export function allCheckersInHome(board: Board, bar: Bar, role: PlayerRole): boolean {
  if (getBarCount(bar, role) > 0) return false;
  const [homeStart, homeEnd] = getHomeRange(role);
  const sign = getSign(role);
  for (let i = 0; i < 24; i++) {
    if (i >= homeStart && i <= homeEnd) continue;
    const val = board[i];
    if (sign > 0 && val > 0) return false;
    if (sign < 0 && val < 0) return false;
  }
  return true;
}

/** Get number of checkers on the bar for a player. */
export function getBarCount(bar: Bar, role: PlayerRole): number {
  return role === "player1" ? bar.player1 : bar.player2;
}

/** The bearing-off "destination" index for a player (off the board). */
export function getBearOffTarget(role: PlayerRole): number {
  return role === "player1" ? 24 : -1;
}

/** Entry point from bar for a player. Player1 enters at low indices (0-5), player2 at high (18-23). */
export function getBarEntryStart(role: PlayerRole): number {
  return role === "player1" ? 0 : 23;
}

/** Clone board state for immutable operations. */
export function cloneBoard(board: Board): Board {
  return [...board];
}

export function cloneBar(bar: Bar): Bar {
  return { ...bar };
}

export function cloneBorneOff(borneOff: BorneOff): BorneOff {
  return { ...borneOff };
}

/**
 * Apply a single move to cloned board state. Returns new state.
 * Handles: normal moves, bar entry, bearing off, hitting blots.
 */
export function applyMove(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  move: Move,
  role: PlayerRole,
): { board: Board; bar: Bar; borneOff: BorneOff } {
  const newBoard = cloneBoard(board);
  const newBar = cloneBar(bar);
  const newBorneOff = cloneBorneOff(borneOff);
  const sign = getSign(role);
  const bearOffTarget = getBearOffTarget(role);

  // Remove checker from source
  if (move.from === -1 || move.from === 24) {
    // Entering from bar
    if (role === "player1") newBar.player1--;
    else newBar.player2--;
  } else {
    newBoard[move.from] -= sign;
  }

  // Place checker at destination
  if (move.to === bearOffTarget) {
    // Bearing off
    if (role === "player1") newBorneOff.player1++;
    else newBorneOff.player2++;
  } else {
    // Check for hit (opponent blot)
    if (isBlot(newBoard, move.to, role)) {
      // Remove opponent's checker to bar
      if (role === "player1") {
        newBoard[move.to] = 0; // remove opponent
        newBar.player2++;
      } else {
        newBoard[move.to] = 0;
        newBar.player1++;
      }
    }
    newBoard[move.to] += sign;
  }

  return { board: newBoard, bar: newBar, borneOff: newBorneOff };
}
