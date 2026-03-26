/**
 * Shared authentication middleware.
 * Verifies JWT Bearer token + X-Device-Id header for session-scoped requests.
 */

import { deviceIdInputSchema, sessionIdInputSchema } from "../schemas/session";
import { getBearerToken, verifySessionToken } from "../utils/auth";

export interface AuthClaims {
  sub: string;
  sessionId: string;
  role: string;
  deviceId: string;
  iat: number;
  exp: number;
}

/** Verify auth headers and return claims, or null on failure. */
export async function authenticateRequest(
  c: { req: { header: (name: string) => string | undefined } },
  sessionId: string,
): Promise<AuthClaims | null> {
  const token = getBearerToken(c.req.header("Authorization"));
  const deviceIdHeader = c.req.header("X-Device-Id") ?? "";
  const parsedDeviceId = deviceIdInputSchema.safeParse(deviceIdHeader);

  if (!sessionIdInputSchema.safeParse(sessionId).success || !token || !parsedDeviceId.success) {
    return null;
  }

  try {
    const claims = await verifySessionToken(token);
    if (claims.sessionId !== sessionId || !claims.sub || claims.deviceId !== parsedDeviceId.data) {
      return null;
    }
    return claims as AuthClaims;
  } catch {
    return null;
  }
}
