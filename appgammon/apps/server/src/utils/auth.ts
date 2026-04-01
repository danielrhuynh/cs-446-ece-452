import { sign, verify } from "hono/jwt";
import { SESSION_ROLE, type SessionRole as SessionRoleType } from "@appgammon/common";
import { z } from "zod";
import { deviceIdValueSchema, sessionIdValueSchema } from "../schemas/session";
import { env } from "./env";
import { Context } from "hono";

const sessionRoleValues = Object.values(SESSION_ROLE) as [SessionRoleType, ...SessionRoleType[]];

const sessionTokenPayloadSchema = z.object({
  sub: z.uuid(),
  sessionId: sessionIdValueSchema,
  role: z.enum(sessionRoleValues),
  deviceId: deviceIdValueSchema,
  exp: z.number().int(),
  iat: z.number().int(),
});

async function verifySessionToken(token: string) {
  const payload = await verify(token, env.APP_JWT_SECRET, "HS256");
  return sessionTokenPayloadSchema.parse(payload);
}

export async function signSessionToken(input: {
  playerId: string;
  sessionId: string;
  role: SessionRoleType;
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
    env.APP_JWT_SECRET,
  );
}

export async function checkAuth(c: Context, sessionId: string) {
  const rawToken = c.req.header("Authorization");
  if (!rawToken) {
    return null;
  }

  const [scheme, token] = rawToken.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  const deviceId = c.req.header("X-Device-Id");

  try {
    const claims = await verifySessionToken(token);
    if (claims.sessionId !== sessionId || !claims.sub || claims.deviceId !== deviceId) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
