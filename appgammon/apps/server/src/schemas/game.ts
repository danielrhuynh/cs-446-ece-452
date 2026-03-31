import { z } from "zod";
import { EMOTES } from "@appgammon/common";

const emoteIds = EMOTES.map((e) => e.id);
export const emoteIdSchema = z.enum(emoteIds);

export const startMatchPayloadSchema = z.object({
  target_score: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
});

export const submitMovesPayloadSchema = z.object({
  version: z.number().int().positive(),
  moves: z.array(
    z.object({
      from: z.number().int().min(-1).max(24),
      to: z.number().int().min(-1).max(24),
    }),
  ),
});

export const doubleActionSchema = z.enum(["propose", "accept", "decline"]);
export const doubleActionPayloadSchema = z.object({ action: doubleActionSchema });
export const emotePayloadSchema = z.object({ emote_id: emoteIdSchema });
