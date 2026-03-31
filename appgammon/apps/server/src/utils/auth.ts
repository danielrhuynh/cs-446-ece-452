import { sign, verify } from "hono/jwt";
import type { SessionRole } from "@appgammon/common";
import { z } from "zod";
import { deviceIdValueSchema, sessionIdValueSchema } from "../schemas/session";

const sessionTokenPayloadSchema = z.object({
  sub: z.uuid(),
  sessionId: sessionIdValueSchema,
  role: z.enum(["host", "guest"]),
  deviceId: deviceIdValueSchema,
  exp: z.number().int(),
  iat: z.number().int(),
});

export type SessionTokenPayload = z.infer<typeof sessionTokenPayloadSchema>;

function getJwtSecret() {
  const secret = process.env.APP_JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_JWT_SECRET is required in production");
    }

    return "dev-only-session-secret-change-me";
  }

  return secret;
}

export async function signSessionToken(input: {
  playerId: string;
  sessionId: string;
  role: SessionRole;
  deviceId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24;

  return sign(
    {
      sub: input.playerId,
      sessionId: input.sessionId,
      role: input.role,
      deviceId: input.deviceId,
      iat: now,
      exp,
    },
    getJwtSecret(),
  );
}

export async function verifySessionToken(token: string) {
  const payload = await verify(token, getJwtSecret(), "HS256");
  return sessionTokenPayloadSchema.parse(payload);
}

export function getBearerToken(authHeader: string | undefined) {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}
