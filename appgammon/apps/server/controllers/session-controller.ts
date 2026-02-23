import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { sValidator } from "@hono/standard-validator";
import {
  createSessionPayloadSchema,
  deviceIdInputSchema,
  joinSessionPayloadSchema,
  normalizeSessionId,
  sessionIdInputSchema,
} from "../schemas/session";
import * as sessionService from "../services/session-service";
import { get_or_create_player } from "../services/session-service";
import {
  getBearerToken,
  signSessionToken,
  verifySessionToken,
} from "../utils/auth";
import { publish, subscribe } from "../utils/session-events";

type KeepAliveStream = {
  aborted: boolean;
  closed: boolean;
  sleep: (ms: number) => Promise<unknown>;
  write: (input: string) => Promise<unknown>;
  onAbort: (listener: () => void) => void;
};

export async function runSSEKeepaliveLoop(
  stream: KeepAliveStream,
  unsubscribe: () => void,
  intervalMs = 15000,
) {
  let active = true;
  let unsubscribed = false;
  const unsubscribeOnce = () => {
    if (unsubscribed) return;
    unsubscribed = true;
    unsubscribe();
  };

  stream.onAbort(() => {
    active = false;
    unsubscribeOnce();
  });

  try {
    while (active && !stream.aborted && !stream.closed) {
      await stream.sleep(intervalMs);
      if (!active || stream.aborted || stream.closed) break;
      await stream.write(":keepalive\n\n");
    }
  } finally {
    unsubscribeOnce();
  }
}

/** Verify auth headers and return claims, or null on failure. */
async function authenticateRequest(c: {
  req: { header: (name: string) => string | undefined };
}, sessionId: string) {
  const token = getBearerToken(c.req.header("Authorization"));
  const deviceIdHeader = c.req.header("X-Device-Id") ?? "";
  const parsedDeviceId = deviceIdInputSchema.safeParse(deviceIdHeader);

  if (!sessionIdInputSchema.safeParse(sessionId).success || !token || !parsedDeviceId.success) {
    return null;
  }

  try {
    const claims = await verifySessionToken(token);
    if (claims.sid !== sessionId || !claims.sub || claims.did !== parsedDeviceId.data) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

const validationHook = (
  result: { success: boolean },
  c: { json: (data: { error: string }, status: 400) => Response },
) => {
  if (!result.success) {
    return c.json({ error: "Validation failed" }, 400);
  }
};

export const sessionRoutes = new Hono()
  .post(
    "/create",
    sValidator("json", createSessionPayloadSchema, validationHook),
    async (c) => {
      const { device_id, display_name } = c.req.valid("json");

      const player = await get_or_create_player(device_id, display_name);
      const session = await sessionService.create_session(player.id);

      const authToken = await signSessionToken({
        playerId: player.id,
        sessionId: session.id,
        role: "host",
        deviceId: device_id,
      });

      return c.json({
        ...session,
        created_at: session.created_at.toISOString(),
        auth_token: authToken,
      });
    },
  )
  .post(
    "/join",
    sValidator("json", joinSessionPayloadSchema, validationHook),
    async (c) => {
      const { device_id, display_name, session_id } = c.req.valid("json");

      const player = await get_or_create_player(device_id, display_name);
      const session = await sessionService.join_session(player.id, session_id);

      if (!session) {
        return c.json({ error: "Failed to join session. It may not exist, be full, or already started." }, 400);
      }

      const fullSession = await sessionService.get_session(session_id);
      if (fullSession) {
        publish(session_id, { type: "player_joined", session: fullSession });
      }

      const authToken = await signSessionToken({
        playerId: player.id,
        sessionId: session.id,
        role: "guest",
        deviceId: device_id,
      });

      return c.json({
        ...session,
        created_at: session.created_at.toISOString(),
        auth_token: authToken,
      });
    },
  )
  .get("/:id", async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const session = await sessionService.get_session(sessionId);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const isParticipant =
      session.player_1_id === claims.sub || session.player_2_id === claims.sub;

    if (!isParticipant) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return c.json(session);
  })
  .post("/:id/start", async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (claims.role !== "host") {
      return c.json({ error: "Only the host can start the game" }, 403);
    }

    const updated = await sessionService.start_session(sessionId, claims.sub);

    if (!updated) {
      return c.json({ error: "Cannot start game. Session may not be ready." }, 400);
    }

    const session = await sessionService.get_session(sessionId);
    if (session) {
      publish(sessionId, { type: "game_started", session });
    }

    return c.json(session!);
  })
  .post("/:id/cancel", async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updated = await sessionService.cancel_session(sessionId, claims.sub);

    if (!updated) {
      return c.json({ error: "Cannot cancel session." }, 400);
    }

    const session = await sessionService.get_session(sessionId);
    if (session) {
      publish(sessionId, { type: "session_cancelled", session });
    }

    return c.json(session!);
  });

// SSE on a separate instance — streaming responses can't flow through RPC types
export const sessionSSEController = new Hono()
  .get("/:id/events", async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const session = await sessionService.get_session(sessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const isParticipant =
      session.player_1_id === claims.sub || session.player_2_id === claims.sub;
    if (!isParticipant) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        event: "session_state",
        data: JSON.stringify(session),
      });

      const unsubscribe = subscribe(sessionId, (event) => {
        stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.session),
        }).catch(() => {});
      });

      await runSSEKeepaliveLoop(stream, unsubscribe);
    });
  });
