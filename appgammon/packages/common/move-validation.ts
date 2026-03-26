/**
 * Single-move validation for backgammon.
 * Validates individual moves against a single die value.
 */

import type { Board, Bar, BorneOff, Move, PlayerRole } from "./game-types";
import {
  getDirection,
  getSign,
  getBarCount,
  getBarEntryStart,
  getBearOffTarget,
  getHomeRange,
  allCheckersInHome,
  isBlocked,
  checkerCount,
} from "./board";

/**
 * Compute the die value consumed by a move for the given player.
 * Returns the absolute distance moved.
 */
export function getDieValueForMove(move: Move, role: PlayerRole): number {
  const dir = getDirection(role);
  if (move.from === -1 || move.from === 24) {
    // Bar entry: distance from bar entry start to destination
    const entryStart = getBarEntryStart(role);
    return Math.abs(move.to - entryStart) + 1;
  }
  const bearOff = getBearOffTarget(role);
  if (move.to === bearOff) {
    // Bearing off
    if (role === "player1") return 24 - move.from;
    return move.from + 1;
  }
  return Math.abs(move.to - move.from);
}

/**
 * Get all valid destination points for a single die value.
 * Returns an array of Move objects.
 */
export function getValidMoves(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  role: PlayerRole,
  dieValue: number,
): Move[] {
  const moves: Move[] = [];
  const dir = getDirection(role);
  const sign = getSign(role);
  const barCount = getBarCount(bar, role);

  // If player has checkers on bar, they MUST enter first
  if (barCount > 0) {
    const entryStart = getBarEntryStart(role);
    // Entry point = entryStart + (dieValue - 1) * dir
    const target = entryStart + (dieValue - 1) * dir;
    if (target >= 0 && target <= 23 && !isBlocked(board, target, role)) {
      const from = role === "player1" ? -1 : 24;
      moves.push({ from, to: target });
    }
    return moves; // Must enter from bar before any other move
  }

  // Normal moves + bearing off
  const canBearOff = allCheckersInHome(board, bar, role);
  const [homeStart, homeEnd] = getHomeRange(role);
  const bearOffTarget = getBearOffTarget(role);

  for (let i = 0; i < 24; i++) {
    // Only move own checkers
    if (sign > 0 && board[i] <= 0) continue;
    if (sign < 0 && board[i] >= 0) continue;

    const target = i + dieValue * dir;

    // Normal move within the board
    if (target >= 0 && target <= 23) {
      if (!isBlocked(board, target, role)) {
        moves.push({ from: i, to: target });
      }
      continue;
    }

    // Bearing off
    if (canBearOff) {
      if (role === "player1" && target >= 24) {
        if (target === 24) {
          // Exact bear off
          moves.push({ from: i, to: bearOffTarget });
        } else {
          // Overshoot: only allowed if no checker on a higher point
          let hasHigher = false;
          for (let j = homeStart; j < i; j++) {
            if (board[j] > 0) { hasHigher = true; break; }
          }
          if (!hasHigher) {
            moves.push({ from: i, to: bearOffTarget });
          }
        }
      } else if (role === "player2" && target < 0) {
        if (target === -1) {
          moves.push({ from: i, to: bearOffTarget });
        } else {
          // Overshoot: only if no checker on a higher point (higher index for player2)
          let hasHigher = false;
          for (let j = i + 1; j <= homeEnd; j++) {
            if (board[j] < 0) { hasHigher = true; break; }
          }
          if (!hasHigher) {
            moves.push({ from: i, to: bearOffTarget });
          }
        }
      }
    }
  }

  return moves;
}

/**
 * Validate a single move against a specific die value.
 */
export function validateMove(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  move: Move,
  role: PlayerRole,
  dieValue: number,
): { valid: boolean; error?: string } {
  const validMoves = getValidMoves(board, bar, borneOff, role, dieValue);
  const isValid = validMoves.some((m) => m.from === move.from && m.to === move.to);
  if (!isValid) {
    return { valid: false, error: `Invalid move: ${move.from} → ${move.to} with die ${dieValue}` };
  }
  return { valid: true };
}
