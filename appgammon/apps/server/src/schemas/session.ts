import { z } from "zod";

export const normalizeSessionId = (input: string) => input.toUpperCase().replace(/-/g, "").trim();

export const sessionIdRegex = /^[A-Z0-9]{6}$/;

export const deviceIdInputSchema = z.string().trim().min(8).max(128);
export const deviceIdValueSchema = z.string().min(8).max(128);

export const displayNameInputSchema = z.string().trim().min(1).max(20);

export const sessionIdInputSchema = z
  .string()
  .transform((value) => normalizeSessionId(value))
  .refine((value) => sessionIdRegex.test(value));

export const sessionIdValueSchema = z.string().regex(sessionIdRegex);

export const createSessionPayloadSchema = z.object({
  device_id: deviceIdInputSchema,
  display_name: displayNameInputSchema,
});

export const joinSessionPayloadSchema = z.object({
  device_id: deviceIdInputSchema,
  display_name: displayNameInputSchema,
});
