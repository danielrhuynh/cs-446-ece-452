import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import {
  createSessionPayloadSchema,
  joinSessionPayloadSchema,
  normalizeSessionId,
} from "../schemas/session";
import {
  jsonSchema,
  errorResponse,
  sessionResponse,
  sessionWithTokenResponse,
} from "../schemas/openapi-responses";
import * as sessionService from "../services/session-service";
import { getOrCreatePlayer } from "../services/session-service";
import { signSessionToken } from "../utils/auth";
import { publish, subscribe } from "../utils/session-events";
import { authenticateRequest } from "../middleware/auth";

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
    describeRoute({
      tags: ["Sessions"],
      summary: "Create a new game session",
      description: "Creates a session and returns the session ID with an auth token for the host.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(createSessionPayloadSchema) } },
      },
      responses: {
        200: { description: "Session created", content: { "application/json": { schema: jsonSchema(sessionWithTokenResponse) } } },
        400: { description: "Validation error", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
      },
    }),
    sValidator("json", createSessionPayloadSchema, validationHook),
    async (c) => {
      const { device_id, display_name } = c.req.valid("json");

      const player = await getOrCreatePlayer(device_id, display_name);
      const session = await sessionService.createSession(player.id);

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
    "/:id/join",
    describeRoute({
      tags: ["Sessions"],
      summary: "Join an existing session",
      description: "Joins a session by code (path param). Returns the session with an auth token for the guest.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(joinSessionPayloadSchema) } },
      },
      responses: {
        200: { description: "Joined session", content: { "application/json": { schema: jsonSchema(sessionWithTokenResponse) } } },
        400: { description: "Session not found or full", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
      },
    }),
    sValidator("json", joinSessionPayloadSchema, validationHook),
    async (c) => {
      const { device_id, display_name } = c.req.valid("json");
      const session_id = normalizeSessionId(c.req.param("id"));

      const player = await getOrCreatePlayer(device_id, display_name);
      const session = await sessionService.joinSession(player.id, session_id);

      if (!session) {
        return c.json({ error: "Failed to join session. It may not exist, be full, or already started." }, 400);
      }

      const fullSession = await sessionService.getSession(session_id);
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
  .get(
    "/:id",
    describeRoute({
      tags: ["Sessions"],
      summary: "Get session details",
      description: "Returns the current session state including both players. Requires auth.",
      responses: {
        200: { description: "Session details", content: { "application/json": { schema: jsonSchema(sessionResponse) } } },
        401: { description: "Unauthorized", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
        404: { description: "Session not found", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
      },
    }),
    async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const session = await sessionService.getSession(sessionId);

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
  .post(
    "/:id/start",
    describeRoute({
      tags: ["Sessions"],
      summary: "Start the game",
      description: "Host-only. Transitions session from 'closed' to 'in_game'.",
      responses: {
        200: { description: "Game started", content: { "application/json": { schema: jsonSchema(sessionResponse) } } },
        401: { description: "Unauthorized", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
        403: { description: "Not the host", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
      },
    }),
    async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (claims.role !== "host") {
      return c.json({ error: "Only the host can start the game" }, 403);
    }

    const updated = await sessionService.startSession(sessionId, claims.sub);

    if (!updated) {
      return c.json({ error: "Cannot start game. Session may not be ready." }, 400);
    }

    const session = await sessionService.getSession(sessionId);
    if (session) {
      publish(sessionId, { type: "game_started", session });
    }

    return c.json(session!);
  })
  .post(
    "/:id/cancel",
    describeRoute({
      tags: ["Sessions"],
      summary: "Cancel the session",
      description: "Cancels the session. Both players are notified via SSE.",
      responses: {
        200: { description: "Session cancelled", content: { "application/json": { schema: jsonSchema(sessionResponse) } } },
        401: { description: "Unauthorized", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
        400: { description: "Cannot cancel", content: { "application/json": { schema: jsonSchema(errorResponse) } } },
      },
    }),
    async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await authenticateRequest(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updated = await sessionService.cancelSession(sessionId, claims.sub);

    if (!updated) {
      return c.json({ error: "Cannot cancel session." }, 400);
    }

    const session = await sessionService.getSession(sessionId);
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

    const session = await sessionService.getSession(sessionId);
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
