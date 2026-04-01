import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { MATCH_EVENT_TYPE, SESSION_EVENT_TYPE, SESSION_ROLE } from "@appgammon/common";
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
import { matchEventBus } from "../event-bus/match-event-bus";
import { sessionEventBus } from "../event-bus/session-event-bus";
import { matchService } from "../services/match-service";
import { sessionService } from "../services/session-service";
import { signSessionToken, checkAuth } from "../utils/auth";
import { runSSEKeepaliveLoop } from "../utils/sse";

export const sessionRoutes = new Hono()
  .post(
    "/",
    describeRoute({
      tags: ["Sessions"],
      summary: "Create a new session",
      description: "Creates a session and returns the session ID with an auth token for the host.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(createSessionPayloadSchema) } },
      },
      responses: {
        200: {
          description: "Session created",
          content: { "application/json": { schema: jsonSchema(sessionWithTokenResponse) } },
        },
        400: {
          description: "Validation error",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    sValidator("json", createSessionPayloadSchema),
    async (c) => {
      const { device_id, display_name } = c.req.valid("json");

      const player = await sessionService.getOrCreatePlayer(device_id, display_name);
      const createdSession = await sessionService.createSession(player.id);
      const session = await sessionService.getSession(createdSession.id);

      if (!session) {
        return c.json({ error: "Failed to create session" }, 400);
      }

      const authToken = await signSessionToken({
        playerId: player.id,
        sessionId: createdSession.id,
        role: SESSION_ROLE.host,
        deviceId: device_id,
      });

      return c.json({
        ...session,
        auth_token: authToken,
        role: SESSION_ROLE.host,
      });
    },
  )
  .post(
    "/:id/join",
    describeRoute({
      tags: ["Sessions"],
      summary: "Join an existing session",
      description:
        "Joins a session by code (path param). Returns the session with an auth token for the guest.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(joinSessionPayloadSchema) } },
      },
      responses: {
        200: {
          description: "Joined session",
          content: { "application/json": { schema: jsonSchema(sessionWithTokenResponse) } },
        },
        400: {
          description: "Session not found or full",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    sValidator("json", joinSessionPayloadSchema),
    async (c) => {
      const { device_id, display_name } = c.req.valid("json");
      const session_id = normalizeSessionId(c.req.param("id"));

      const player = await sessionService.getOrCreatePlayer(device_id, display_name);
      const result = await sessionService.joinSession(player.id, session_id);

      if (!result) {
        return c.json(
          { error: "Failed to join session. It may not exist, be full, or no longer be joinable." },
          400,
        );
      }

      const authToken = await signSessionToken({
        playerId: player.id,
        sessionId: result.session.id,
        role: result.role,
        deviceId: device_id,
      });

      return c.json({
        ...result.session,
        auth_token: authToken,
        role: result.role,
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
        200: {
          description: "Session details",
          content: { "application/json": { schema: jsonSchema(sessionResponse) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        404: {
          description: "Session not found",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

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
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Sessions"],
      summary: "Cancel the session",
      description: "Ends the session for both players. Both players are notified via SSE.",
      responses: {
        200: {
          description: "Session cancelled",
          content: { "application/json": { schema: jsonSchema(sessionResponse) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        400: {
          description: "Cannot cancel",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const updated = await sessionService.cancelSession(sessionId, claims.sub);

      if (!updated) {
        return c.json({ error: "Cannot cancel session." }, 400);
      }

      const session = await sessionService.getSession(sessionId);
      return c.json(session!);
    },
  )
  .get("/:id/events", async (c) => {
    const sessionId = normalizeSessionId(c.req.param("id"));
    const claims = await checkAuth(c, sessionId);

    if (!claims) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const isParticipant = session.player_1_id === claims.sub || session.player_2_id === claims.sub;
    if (!isParticipant) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await sessionService.registerConnection(sessionId, claims.sub);

    let presenceReleased = false;
    const releasePresence = () => {
      if (presenceReleased) return;
      presenceReleased = true;
      sessionService.releaseConnection(sessionId, claims.sub);
    };

    try {
      const currentSession = await sessionService.getSession(sessionId);
      if (!currentSession) {
        releasePresence();
        return c.json({ error: "Session not found" }, 404);
      }

      const matchState = await matchService.getMatchState(sessionId);

      return streamSSE(c, async (stream) => {
        let unsubscribeSession = () => {};
        let unsubscribeMatch = () => {};
        let streamCleanedUp = false;
        const cleanupStream = () => {
          if (streamCleanedUp) return;
          streamCleanedUp = true;
          unsubscribeSession();
          unsubscribeMatch();
          releasePresence();
        };

        try {
          await stream.writeSSE({
            event: SESSION_EVENT_TYPE.state,
            data: JSON.stringify(currentSession),
          });

          if (matchState) {
            await stream.writeSSE({
              event: MATCH_EVENT_TYPE.state,
              data: JSON.stringify(matchState),
            });
          }

          unsubscribeSession = sessionEventBus.subscribe(sessionId, (event) => {
            stream
              .writeSSE({
                event: event.type,
                data: JSON.stringify(event.session),
              })
              .catch(() => {});
          });

          unsubscribeMatch = matchEventBus.subscribe(sessionId, (event) => {
            if (event.forPlayer && event.forPlayer !== claims.sub) return;

            stream
              .writeSSE({
                event: event.type,
                data: JSON.stringify(event.data),
              })
              .catch(() => {});
          });

          await runSSEKeepaliveLoop(stream, cleanupStream);
        } finally {
          cleanupStream();
        }
      });
    } catch (error) {
      releasePresence();
      throw error;
    }
  });
