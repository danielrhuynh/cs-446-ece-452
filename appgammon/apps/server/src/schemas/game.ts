/**
 * Zod validation schemas for game endpoints.
 */

import { z } from "zod";
import { EMOTES } from "@appgammon/common";

const emoteIds = EMOTES.map((e) => e.id) as [string, ...string[]];

export const startSeriesPayloadSchema = z.object({
  best_of: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
});

export const submitMovesPayloadSchema = z.object({
  game_id: z.string().uuid(),
  version: z.number().int().positive(),
  moves: z.array(
    z.object({
      from: z.number().int().min(-1).max(24),
      to: z.number().int().min(-1).max(24),
    }),
  ),
});

export const doubleActionSchema = z.enum(["propose", "accept", "decline"]);

export const emoteIdSchema = z.enum(emoteIds);
