/**
 * Dice utilities for backgammon.
 * All randomness is server-side only — never trust client dice.
 */

import type { Dice, DiceUsed } from "../types";

/** Roll a single die (1-6). */
export function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Roll two dice. */
export function rollDice(): Dice {
  return [rollSingleDie(), rollSingleDie()];
}

/**
 * Initialize dice-used tracking array.
 * Normal roll: 2 entries. Doubles: 4 entries (all false).
 */
export function initializeDiceUsed(dice: Dice): DiceUsed {
  const isDoubles = dice[0] === dice[1];
  return Array.from({ length: isDoubles ? 4 : 2 }, () => false);
}

/**
 * Get remaining die values that haven't been used yet.
 * For doubles, dice[0] is repeated 4 times.
 */
export function getAvailableDice(dice: Dice, diceUsed: DiceUsed): number[] {
  const isDoubles = dice[0] === dice[1];
  const available: number[] = [];
  for (let i = 0; i < diceUsed.length; i++) {
    if (!diceUsed[i]) {
      available.push(isDoubles ? dice[0] : dice[i]);
    }
  }
  return available;
}

/**
 * Mark a specific die value as used. Returns new diceUsed array.
 * Finds the first unused die matching the value.
 */
export function markDieUsed(dice: Dice, diceUsed: DiceUsed, dieValue: number): DiceUsed {
  const isDoubles = dice[0] === dice[1];
  const result = [...diceUsed];
  for (let i = 0; i < result.length; i++) {
    if (!result[i]) {
      const val = isDoubles ? dice[0] : dice[i];
      if (val === dieValue) {
        result[i] = true;
        return result;
      }
    }
  }
  return result; // no matching die found (shouldn't happen if validated)
}
