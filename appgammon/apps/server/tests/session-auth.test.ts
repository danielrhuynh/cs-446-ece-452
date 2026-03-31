import { beforeEach, describe, expect, it } from "vitest";
import { sign } from "hono/jwt";
import app from "../src/app";

const TEST_SECRET = "test-secret";

beforeEach(() => {
  process.env.APP_JWT_SECRET = TEST_SECRET;
});

async function signTestToken(input: {
  sessionId: string;
  playerId?: string;
  deviceId?: string;
  expOffsetSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);

  return sign(
    {
      sub: input.playerId ?? "11111111-1111-4111-8111-111111111111",
      sid: input.sessionId,
      role: "host",
      did: input.deviceId ?? "device-id-1234",
      iat: now,
      exp: now + (input.expOffsetSeconds ?? 3600),
    },
    TEST_SECRET,
    "HS256",
  );
}

describe("session auth hardening", () => {
  it("returns 401 when auth token is missing", async () => {
    const res = await app.request("/sessions/ABC123", {
      method: "GET",
      headers: {
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when token sid does not match requested session", async () => {
    const token = await signTestToken({ sessionId: "ZZZ999" });

    const res = await app.request("/sessions/ABC123", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 when device header does not match token did", async () => {
    const token = await signTestToken({
      sessionId: "ABC123",
      deviceId: "expected-device",
    });

    const res = await app.request("/sessions/ABC123", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Device-Id": "different-device",
      },
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for expired tokens", async () => {
    const token = await signTestToken({
      sessionId: "ABC123",
      expOffsetSeconds: -60,
    });

    const res = await app.request("/sessions/ABC123", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Device-Id": "device-id-1234",
      },
    });

    expect(res.status).toBe(401);
  });
});
