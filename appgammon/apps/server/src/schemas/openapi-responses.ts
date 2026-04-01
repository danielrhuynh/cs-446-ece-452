/**
 * Shared Zod schemas and helpers for OpenAPI response documentation.
 */

import { z } from "zod";
import {
  GAME_STATUS,
  MATCH_STATUS,
  SESSION_ROLE,
  SESSION_STATUS,
  TURN_PHASE,
  type GameStatus as GameStatusType,
  type MatchStatus as MatchStatusType,
  type SessionRole as SessionRoleType,
  type SessionStatus as SessionStatusType,
  type TurnPhase as TurnPhaseType,
} from "@appgammon/common";

const sessionStatusValues = Object.values(SESSION_STATUS) as [
  SessionStatusType,
  ...SessionStatusType[],
];
const sessionRoleValues = Object.values(SESSION_ROLE) as [SessionRoleType, ...SessionRoleType[]];
const turnPhaseValues = Object.values(TURN_PHASE) as [TurnPhaseType, ...TurnPhaseType[]];
const gameStatusValues = Object.values(GAME_STATUS) as [GameStatusType, ...GameStatusType[]];
const matchStatusValues = Object.values(MATCH_STATUS) as [MatchStatusType, ...MatchStatusType[]];

/** Convert a Zod schema to a JSON Schema object for OpenAPI docs. */
export function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>;
}

export const errorResponse = z.object({
  error: z.string(),
});

export const okResponse = z.object({
  ok: z.literal(true),
});

export const playerInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
});

export const sessionResponse = z.object({
  id: z.string(),
  status: z.enum(sessionStatusValues),
  player_1_id: z.string().uuid(),
  player_2_id: z.string().uuid().nullable(),
  player_1_connected: z.boolean(),
  player_2_connected: z.boolean(),
  reconnect_deadline_at: z.string().nullable(),
  created_at: z.string(),
  player_1: playerInfoSchema,
  player_2: playerInfoSchema.nullable(),
});

export const sessionWithTokenResponse = sessionResponse.extend({
  auth_token: z.string(),
  role: z.enum(sessionRoleValues),
});

export const barSchema = z.object({
  player1: z.number().int(),
  player2: z.number().int(),
});

export const borneOffSchema = z.object({
  player1: z.number().int(),
  player2: z.number().int(),
});

export const gameStateSchema = z.object({
  id: z.string().uuid(),
  matchId: z.string().uuid(),
  board: z.array(z.number().int()).length(24),
  bar: barSchema,
  borneOff: borneOffSchema,
  currentTurn: z.string().uuid(),
  turnPhase: z.enum(turnPhaseValues),
  dice: z.tuple([z.number().int(), z.number().int()]).nullable(),
  diceUsed: z.array(z.boolean()).nullable(),
  doublingCube: z.number().int(),
  cubeOwner: z.string().uuid().nullable(),
  version: z.number().int(),
  status: z.enum(gameStatusValues),
  winnerId: z.string().uuid().nullable(),
});

export const matchStateSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  targetScore: z.number().int(),
  player1Score: z.number().int(),
  player2Score: z.number().int(),
  status: z.enum(matchStatusValues),
  winnerId: z.string().uuid().nullable(),
  currentGame: gameStateSchema.nullable(),
});
