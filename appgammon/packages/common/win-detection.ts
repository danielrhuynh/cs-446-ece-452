/**
 * Win detection and scoring for backgammon.
 */

import type { Board, Bar, BorneOff, PlayerRole } from "./game-types";
import { CHECKERS_PER_PLAYER } from "./game-types";
import { getSign, getBarCount } from "./board";

/** Check if a player has borne off all 15 checkers. */
export function checkWin(borneOff: BorneOff, role: PlayerRole): boolean {
  const count = role === "player1" ? borneOff.player1 : borneOff.player2;
  return count >= CHECKERS_PER_PLAYER;
}

/**
 * Calculate game points based on win type.
 *   - Normal win: 1 x cube value
 *   - Gammon (loser has 0 borne off): 2 x cube value
 *   - Backgammon (loser has 0 borne off AND has checker on bar or winner's home): 3 x cube value
 */
export function calculateGamePoints(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  winnerRole: PlayerRole,
  cubeValue: number,
): number {
  const loserRole: PlayerRole = winnerRole === "player1" ? "player2" : "player1";
  const loserBorneOff = loserRole === "player1" ? borneOff.player1 : borneOff.player2;

  // Normal win
  if (loserBorneOff > 0) return cubeValue;

  // Gammon or Backgammon — loser has 0 borne off
  const loserBarCount = getBarCount(bar, loserRole);
  const loserSign = getSign(loserRole);

  // Check if loser has a checker on the bar or in winner's home board
  if (loserBarCount > 0) return 3 * cubeValue; // Backgammon

  // Check winner's home board for loser's checkers
  const [winnerHomeStart, winnerHomeEnd] =
    winnerRole === "player1" ? [18, 23] : [0, 5];

  for (let i = winnerHomeStart; i <= winnerHomeEnd; i++) {
    if (loserSign > 0 && board[i] > 0) return 3 * cubeValue; // Backgammon
    if (loserSign < 0 && board[i] < 0) return 3 * cubeValue; // Backgammon
  }

  return 2 * cubeValue; // Gammon
}

/**
 * Check if the series is complete.
 * best_of is the target score — a player wins when they reach that many points.
 * e.g. best_of=3 means first to 3 points wins.
 */
export function checkSeriesComplete(
  player1Score: number,
  player2Score: number,
  bestOf: number,
): { complete: boolean; winner: PlayerRole | null } {
  const winsNeeded = bestOf;
  if (player1Score >= winsNeeded) {
    return { complete: true, winner: "player1" };
  }
  if (player2Score >= winsNeeded) {
    return { complete: true, winner: "player2" };
  }
  return { complete: false, winner: null };
}
