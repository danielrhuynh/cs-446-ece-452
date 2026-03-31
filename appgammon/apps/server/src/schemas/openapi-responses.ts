/**
 * Shared Zod schemas and helpers for OpenAPI response documentation.
 */

import { z } from "zod";
import { session_status } from "@appgammon/common";

const sessionStatusValues = Object.values(session_status) as [string, ...string[]];

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
  created_at: z.string(),
  player_1: playerInfoSchema,
  player_2: playerInfoSchema.nullable(),
});

export const sessionWithTokenResponse = z.object({
  id: z.string(),
  status: z.enum(sessionStatusValues),
  player_1_id: z.string().uuid(),
  player_2_id: z.string().uuid().nullable(),
  created_at: z.string(),
  auth_token: z.string(),
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
  seriesId: z.string().uuid(),
  board: z.array(z.number().int()).length(24),
  bar: barSchema,
  borneOff: borneOffSchema,
  currentTurn: z.string().uuid(),
  turnPhase: z.enum(["waiting_for_roll_or_double", "double_proposed", "moving", "turn_complete"]),
  dice: z.tuple([z.number().int(), z.number().int()]).nullable(),
  diceUsed: z.array(z.boolean()).nullable(),
  doublingCube: z.number().int(),
  cubeOwner: z.string().uuid().nullable(),
  version: z.number().int(),
  status: z.enum(["in_progress", "complete"]),
  winnerId: z.string().uuid().nullable(),
});

export const seriesStateSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  bestOf: z.number().int(),
  player1Score: z.number().int(),
  player2Score: z.number().int(),
  status: z.enum(["active", "complete"]),
  winnerId: z.string().uuid().nullable(),
  currentGame: gameStateSchema.nullable(),
});
