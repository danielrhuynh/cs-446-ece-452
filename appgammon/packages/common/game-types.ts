/**
 * Canonical game types for backgammon engine.
 * Used by both server and client.
 *
 * Board: 24-element signed integer array.
 *   Positive values = player1 checkers, negative = player2 checkers.
 *   Index 0 = player1's 24-point, index 23 = player1's 1-point (bearing-off side).
 *   Player1 moves 0→23, player2 moves 23→0.
 */

// ── Primitives ──

export type Board = number[];

export interface Bar {
  player1: number;
  player2: number;
}

export interface BorneOff {
  player1: number;
  player2: number;
}

export type Dice = [number, number];
export type DiceUsed = boolean[];

export type PlayerRole = "player1" | "player2";

/**
 * Turn phase state machine:
 *
 *   [turn starts]
 *       │
 *       ├─ can double? ──► "waiting_for_roll_or_double"
 *       │                       │
 *       │                       ├─ roll ──► "moving"
 *       │                       └─ propose double ──► "double_proposed"
 *       │                                                  │
 *       │                                                  ├─ accept ──► "moving" (cube doubled)
 *       │                                                  └─ decline ──► "turn_complete" (game forfeited)
 *       │
 *       └─ can't double ──► "moving" (dice pre-rolled)
 *                                │
 *                                └─ submit moves ──► "turn_complete"
 *
 * On game start, the opening roll skips straight to "moving".
 */
export type TurnPhase =
  | "waiting_for_roll_or_double"
  | "double_proposed"
  | "moving"
  | "turn_complete";

export type GameStatus = "in_progress" | "complete";
export type SeriesStatus = "active" | "complete";

export type ActionType =
  | "move"
  | "roll"
  | "double_propose"
  | "double_accept"
  | "double_decline";

export type GameEventType =
  | "game_state"
  | "emote"
  | "double_proposed"
  | "double_accepted"
  | "double_declined"
  | "game_over"
  | "series_complete";

// ── Move ──

export interface Move {
  /** Point index to move from. -1 = entering from bar. */
  from: number;
  /** Point index to move to. 24 (player1) or -1 (player2) = bearing off. */
  to: number;
}

// ── Game State (what server stores / returns) ──

export interface GameState {
  id: string;
  seriesId: string;
  board: Board;
  bar: Bar;
  borneOff: BorneOff;
  currentTurn: string; // player UUID
  turnPhase: TurnPhase;
  dice: Dice | null;
  diceUsed: DiceUsed | null;
  doublingCube: number;
  cubeOwner: string | null; // player UUID, null = either can double
  version: number;
  status: GameStatus;
  winnerId: string | null;
}

export interface SeriesState {
  id: string;
  sessionId: string;
  bestOf: number;
  player1Score: number;
  player2Score: number;
  status: SeriesStatus;
  winnerId: string | null;
  currentGame: GameState | null;
}

// ── Constants ──

/** Starting board: signed int array. Positive = player1, negative = player2. */
export const INITIAL_BOARD: Board = [
  2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5,
  -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2,
];

export const INITIAL_BAR: Bar = { player1: 0, player2: 0 };
export const INITIAL_BORNE_OFF: BorneOff = { player1: 0, player2: 0 };

export const CHECKERS_PER_PLAYER = 15;

// ── Player color mapping ──

/**
 * Player role ↔ color mapping:
 *   player1 = "white" (positive board values), moves 0→23
 *   player2 = "red"   (negative board values), moves 23→0
 */
export type PlayerColor = "white" | "red";

export function roleToColor(role: PlayerRole): PlayerColor {
  return role === "player1" ? "white" : "red";
}

export function colorToRole(color: PlayerColor): PlayerRole {
  return color === "white" ? "player1" : "player2";
}

// ── Emotes ──

export type EmoteId = "thumbs_up" | "gg" | "oops" | "thinking" | "nice_move";

export const EMOTES: { id: EmoteId; label: string }[] = [
  { id: "thumbs_up", label: "👍" },
  { id: "gg", label: "GG" },
  { id: "oops", label: "😅" },
  { id: "thinking", label: "🤔" },
  { id: "nice_move", label: "🔥" },
];

