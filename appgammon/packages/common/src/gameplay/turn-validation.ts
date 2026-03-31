/**
 * Full turn validation for backgammon.
 * Validates a sequence of moves against available dice.
 * Enforces the must-use-maximum-dice rule.
 */

import type { Board, Bar, BorneOff, Dice, DiceUsed, Move, PlayerRole } from "../types";
import { getAvailableDice, initializeDiceUsed, markDieUsed } from "./dice";
import { applyMove } from "./board";
import { getValidMoves } from "./move-validation";

interface TurnValidationResult {
  valid: boolean;
  newBoard: Board;
  newBar: Bar;
  newBorneOff: BorneOff;
  newDiceUsed: DiceUsed;
  error?: string;
}

/**
 * Validate and apply a full turn (sequence of moves).
 * Checks each move is legal, uses the correct die, and the player uses
 * the maximum number of dice possible.
 */
export function validateTurn(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  moves: Move[],
  role: PlayerRole,
): TurnValidationResult {
  let curBoard = board;
  let curBar = bar;
  let curBorneOff = borneOff;
  let curDiceUsed = [...diceUsed];
  const matchedDice: number[] = [];

  // Apply each move sequentially
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const matchedDie = findMatchingDieForMove(
      curBoard,
      curBar,
      curBorneOff,
      dice,
      curDiceUsed,
      move,
      role,
    );

    if (matchedDie === null) {
      return {
        valid: false,
        newBoard: curBoard,
        newBar: curBar,
        newBorneOff: curBorneOff,
        newDiceUsed: curDiceUsed,
        error: `Move ${i + 1}: no available die for ${move.from} → ${move.to}`,
      };
    }

    matchedDice.push(matchedDie);

    // Apply the move
    const result = applyMove(curBoard, curBar, curBorneOff, move, role);
    curBoard = result.board;
    curBar = result.bar;
    curBorneOff = result.borneOff;
    curDiceUsed = markDieUsed(dice, curDiceUsed, matchedDie);
  }

  // Check must-use-maximum-dice rule
  const maxUsable = getMaxDiceUsable(board, bar, borneOff, dice, diceUsed, role);
  const usedCount = moves.length;

  if (usedCount < maxUsable) {
    return {
      valid: false,
      newBoard: curBoard,
      newBar: curBar,
      newBorneOff: curBorneOff,
      newDiceUsed: curDiceUsed,
      error: `Must use ${maxUsable} dice but only used ${usedCount}`,
    };
  }

  // When only one die can be used and both are individually usable, must use the larger one
  if (dice[0] && dice[1] && dice[0] !== dice[1] && maxUsable === 1 && usedCount === 1) {
    const canUseLarger = canUseSpecificDie(
      board,
      bar,
      borneOff,
      dice,
      diceUsed,
      role,
      Math.max(dice[0], dice[1]),
    );
    const canUseSmaller = canUseSpecificDie(
      board,
      bar,
      borneOff,
      dice,
      diceUsed,
      role,
      Math.min(dice[0], dice[1]),
    );
    if (canUseLarger && canUseSmaller) {
      if (matchedDice[0] !== Math.max(dice[0], dice[1])) {
        return {
          valid: false,
          newBoard: curBoard,
          newBar: curBar,
          newBorneOff: curBorneOff,
          newDiceUsed: curDiceUsed,
          error: "When only one die can be used, must use the larger one",
        };
      }
    }
  }

  return {
    valid: true,
    newBoard: curBoard,
    newBar: curBar,
    newBorneOff: curBorneOff,
    newDiceUsed: curDiceUsed,
  };
}

export function findMatchingDieForMove(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  move: Move,
  role: PlayerRole,
): number | null {
  const available = getAvailableDice(dice, diceUsed);

  for (const die of new Set(available)) {
    const validMoves = getValidMoves(board, bar, borneOff, role, die);
    if (validMoves.some((candidate) => candidate.from === move.from && candidate.to === move.to)) {
      return die;
    }
  }

  return null;
}

/** Check if a specific die value can be used (has at least one legal move). */
function canUseSpecificDie(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  role: PlayerRole,
  dieValue: number,
): boolean {
  const available = getAvailableDice(dice, diceUsed);
  if (!available.includes(dieValue)) return false;
  return getValidMoves(board, bar, borneOff, role, dieValue).length > 0;
}

/**
 * Calculate the maximum number of dice that can be used from the current state.
 * Uses DFS to explore all possible move orderings.
 */
export function getMaxDiceUsable(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  role: PlayerRole,
): number {
  const available = getAvailableDice(dice, diceUsed);
  if (available.length === 0) return 0;

  let maxUsed = 0;

  // Try each available die value
  const triedValues = new Set<number>();
  for (let i = 0; i < diceUsed.length; i++) {
    if (diceUsed[i]) continue;
    const dieValue = dice[0] === dice[1] ? dice[0] : dice[i];
    if (triedValues.has(dieValue)) continue;
    triedValues.add(dieValue);

    const validMoves = getValidMoves(board, bar, borneOff, role, dieValue);
    for (const move of validMoves) {
      const result = applyMove(board, bar, borneOff, move, role);
      const newDiceUsed = markDieUsed(dice, diceUsed, dieValue);
      const subMax =
        1 + getMaxDiceUsable(result.board, result.bar, result.borneOff, dice, newDiceUsed, role);
      if (subMax > maxUsed) maxUsed = subMax;
      // Early exit: can't do better than all remaining dice
      if (maxUsed >= available.length) return maxUsed;
    }
  }

  return maxUsed;
}

/**
 * Generate all maximal-length legal turn sequences.
 * Returns move sequences that use the maximum possible dice.
 */
export function generateAllLegalTurns(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  role: PlayerRole,
): Move[][] {
  const diceUsed = initializeDiceUsed(dice);
  const maxUsable = getMaxDiceUsable(board, bar, borneOff, dice, diceUsed, role);
  if (maxUsable === 0) return [[]]; // no moves possible

  const results: Move[][] = [];
  generateTurnsHelper(board, bar, borneOff, dice, diceUsed, role, [], maxUsable, results);
  return results.length > 0 ? results : [[]];
}

function generateTurnsHelper(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  role: PlayerRole,
  currentMoves: Move[],
  targetLength: number,
  results: Move[][],
): void {
  if (currentMoves.length === targetLength) {
    results.push([...currentMoves]);
    return;
  }

  const triedValues = new Set<number>();
  for (let i = 0; i < diceUsed.length; i++) {
    if (diceUsed[i]) continue;
    const dieValue = dice[0] === dice[1] ? dice[0] : dice[i];
    if (triedValues.has(dieValue)) continue;
    triedValues.add(dieValue);

    const validMoves = getValidMoves(board, bar, borneOff, role, dieValue);
    for (const move of validMoves) {
      const result = applyMove(board, bar, borneOff, move, role);
      const newDiceUsed = markDieUsed(dice, diceUsed, dieValue);

      currentMoves.push(move);
      generateTurnsHelper(
        result.board,
        result.bar,
        result.borneOff,
        dice,
        newDiceUsed,
        role,
        currentMoves,
        targetLength,
        results,
      );
      currentMoves.pop();
    }
  }
}

/**
 * Quick check: does the player have any legal move with the current dice?
 */
export function hasAnyLegalMove(
  board: Board,
  bar: Bar,
  borneOff: BorneOff,
  dice: Dice,
  diceUsed: DiceUsed,
  role: PlayerRole,
): boolean {
  const available = getAvailableDice(dice, diceUsed);
  const uniqueValues = [...new Set(available)];
  for (const dieValue of uniqueValues) {
    if (getValidMoves(board, bar, borneOff, role, dieValue).length > 0) {
      return true;
    }
  }
  return false;
}
