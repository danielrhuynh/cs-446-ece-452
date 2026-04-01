/**
 * Canonical game types for backgammon engine.
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

export const PLAYER_ROLE = {
  player1: "player1",
  player2: "player2",
} as const;

export type PlayerRole = (typeof PLAYER_ROLE)[keyof typeof PLAYER_ROLE];

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
export const TURN_PHASE = {
  waitingForRollOrDouble: "waiting_for_roll_or_double",
  doubleProposed: "double_proposed",
  moving: "moving",
  turnComplete: "turn_complete",
} as const;

export type TurnPhase = (typeof TURN_PHASE)[keyof typeof TURN_PHASE];

export const GAME_STATUS = {
  inProgress: "in_progress",
  complete: "complete",
} as const;

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

export const MATCH_STATUS = {
  active: "active",
  complete: "complete",
} as const;

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

export const ACTION_TYPE = {
  move: "move",
  roll: "roll",
  doublePropose: "double_propose",
  doubleAccept: "double_accept",
  doubleDecline: "double_decline",
} as const;

export type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

export const MATCH_EVENT_TYPE = {
  state: "match_state",
  emote: "emote",
  doubleProposed: "double_proposed",
  doubleAccepted: "double_accepted",
  doubleDeclined: "double_declined",
  gameOver: "game_over",
  matchComplete: "match_complete",
} as const;

export type MatchEventType = (typeof MATCH_EVENT_TYPE)[keyof typeof MATCH_EVENT_TYPE];

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
  matchId: string;
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

export interface MatchState {
  id: string;
  sessionId: string;
  targetScore: number;
  player1Score: number;
  player2Score: number;
  status: MatchStatus;
  winnerId: string | null;
  currentGame: GameState | null;
}

// ── Constants ──

/** Starting board: signed int array. Positive = player1, negative = player2. */
export const INITIAL_BOARD: Board = [
  2, 0, 0, 0, 0, -5, 0, -3, 0, 0, 0, 5, -5, 0, 0, 0, 3, 0, 5, 0, 0, 0, 0, -2,
];

export const INITIAL_BAR: Bar = { player1: 0, player2: 0 };
export const INITIAL_BORNE_OFF: BorneOff = { player1: 0, player2: 0 };

export const CHECKERS_PER_PLAYER = 15;

// ── Player colour mapping ──

/**
 * Player role ↔ colour mapping:
 *   player1 = "white" (positive board values), moves 0→23
 *   player2 = "red"   (negative board values), moves 23→0
 */
export const PLAYER_COLOUR = {
  white: "white",
  red: "red",
} as const;

export type PlayerColour = (typeof PLAYER_COLOUR)[keyof typeof PLAYER_COLOUR];

export function roleToColor(role: PlayerRole): PlayerColour {
  return role === PLAYER_ROLE.player1 ? PLAYER_COLOUR.white : PLAYER_COLOUR.red;
}

export function colorToRole(color: PlayerColour): PlayerRole {
  return color === PLAYER_COLOUR.white ? PLAYER_ROLE.player1 : PLAYER_ROLE.player2;
}

// ── Emotes ──
export const EMOTE_ID = {
  thumbsUp: "thumbs_up",
  gg: "gg",
  oops: "oops",
  thinking: "thinking",
  niceMove: "nice_move",
} as const;

export type EmoteId = (typeof EMOTE_ID)[keyof typeof EMOTE_ID];

export const EMOTES = [
  { id: EMOTE_ID.thumbsUp, label: "👍" },
  { id: EMOTE_ID.gg, label: "GG" },
  { id: EMOTE_ID.oops, label: "😅" },
  { id: EMOTE_ID.thinking, label: "🤔" },
  { id: EMOTE_ID.niceMove, label: "🔥" },
] satisfies ReadonlyArray<{ id: EmoteId; label: string }>;
