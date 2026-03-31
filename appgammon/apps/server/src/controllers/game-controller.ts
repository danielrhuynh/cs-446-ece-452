/**
 * Game controller — HTTP routes and SSE for backgammon gameplay.
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import {
  startSeriesPayloadSchema,
  submitMovesPayloadSchema,
  doubleActionSchema,
  emoteIdSchema,
} from "../schemas/game";
import { normalizeSessionId } from "../schemas/session";
import {
  jsonSchema,
  errorResponse,
  okResponse,
  seriesStateSchema,
} from "../schemas/openapi-responses";
import { gameEventBus } from "../event-bus/game-event-bus";
import { authenticateRequest } from "../middleware/auth";
import * as gameService from "../services/game-service";
import { runSSEKeepaliveLoop } from "./session-controller";

const validationHook = (
  result: { success: boolean },
  c: { json: (data: { error: string }, status: 400) => Response },
) => {
  if (!result.success) {
    return c.json({ error: "Validation failed" }, 400);
  }
};

export const gameRoutes = new Hono()
  .post(
    "/:id/series/start",
    describeRoute({
      tags: ["Game"],
      summary: "Start a new series",
      description:
        "Host-only. Creates a best-of-N series with the first game and opening dice roll.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(startSeriesPayloadSchema) } },
      },
      responses: {
        200: {
          description: "Series started",
          content: { "application/json": { schema: jsonSchema(seriesStateSchema) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        403: {
          description: "Not the host",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        400: {
          description: "Failed to start",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    sValidator("json", startSeriesPayloadSchema, validationHook),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (claims.role !== "host") {
        return c.json({ error: "Only the host can start a series" }, 403);
      }

      const { best_of } = c.req.valid("json");
      const result = await gameService.startSeries(sessionId, best_of);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json(result.data);
    },
  )
  .get(
    "/:id/sync",
    describeRoute({
      tags: ["Game"],
      summary: "Sync game state",
      description: "Returns the current series and game state for this session.",
      responses: {
        200: {
          description: "Current state",
          content: { "application/json": { schema: jsonSchema(seriesStateSchema) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        404: {
          description: "No active series",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const state = await gameService.getSeriesState(sessionId);

      if (!state) {
        return c.json({ error: "No active series found" }, 404);
      }

      return c.json(state);
    },
  )
  .put(
    "/:id/board-state",
    describeRoute({
      tags: ["Game"],
      summary: "Submit moves",
      description:
        "Submit a sequence of moves for the current turn. Uses optimistic locking via version.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(submitMovesPayloadSchema) } },
      },
      responses: {
        200: {
          description: "Moves accepted",
          content: { "application/json": { schema: jsonSchema(okResponse) } },
        },
        400: {
          description: "Invalid moves or version mismatch",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    sValidator("json", submitMovesPayloadSchema, validationHook),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { game_id, version, moves } = c.req.valid("json");
      const result = await gameService.submitMoves(game_id, claims.sub, version, moves, sessionId);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/double",
    describeRoute({
      tags: ["Game"],
      summary: "Doubling cube action",
      description:
        "Propose, accept, or decline a double. Query params: ?action=propose|accept|decline&game_id=UUID",
      responses: {
        200: {
          description: "Action successful",
          content: { "application/json": { schema: jsonSchema(okResponse) } },
        },
        400: {
          description: "Invalid action or state",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const action = c.req.query("action");
      const parsed = doubleActionSchema.safeParse(action);
      if (!parsed.success) {
        return c.json({ error: "Invalid action. Use ?action=propose|accept|decline" }, 400);
      }

      const gameId = c.req.query("game_id");
      if (!gameId) {
        return c.json({ error: "game_id query parameter required" }, 400);
      }

      let result: { success: boolean; error?: string; status?: number };

      if (parsed.data === "propose") {
        result = await gameService.proposeDouble(gameId, claims.sub, sessionId);
      } else {
        result = await gameService.respondToDouble(gameId, claims.sub, parsed.data, sessionId);
      }

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/roll",
    describeRoute({
      tags: ["Game"],
      summary: "Roll dice",
      description: "Roll dice for the current turn (skip doubling). Query param: ?game_id=UUID",
      responses: {
        200: {
          description: "Dice rolled",
          content: { "application/json": { schema: jsonSchema(okResponse) } },
        },
        400: {
          description: "Cannot roll in this phase",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const gameId = c.req.query("game_id");
      if (!gameId) {
        return c.json({ error: "game_id query parameter required" }, 400);
      }

      const result = await gameService.rollForTurn(gameId, claims.sub, sessionId);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/emote",
    describeRoute({
      tags: ["Game"],
      summary: "Send an emote",
      description:
        "Send an emote to the opponent. Rate limited to 1 per 3 seconds. Query param: ?id=emoteId",
      responses: {
        200: {
          description: "Emote sent",
          content: { "application/json": { schema: jsonSchema(okResponse) } },
        },
        400: {
          description: "Invalid emote",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        429: {
          description: "Rate limited",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
      },
    }),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await authenticateRequest(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const emoteId = c.req.query("id");
      const parsed = emoteIdSchema.safeParse(emoteId);
      if (!parsed.success) {
        return c.json({ error: "Invalid emote ID" }, 400);
      }

      const result = gameService.sendEmote(sessionId, claims.sub, parsed.data);

      if (!result.success) {
        return c.json({ error: result.error }, 429);
      }

      return c.json({ ok: true });
    },
  );

// SSE controller — separate instance (streaming can't flow through RPC types)
export const gameSSEController = new Hono().get("/:id/events", async (c) => {
  const sessionId = normalizeSessionId(c.req.param("id"));
  const claims = await authenticateRequest(c, sessionId);

  if (!claims) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const state = await gameService.getSeriesState(sessionId);
  if (!state) {
    return c.json({ error: "No active series found" }, 404);
  }

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      event: "game_state",
      data: JSON.stringify(state),
    });

    const unsubscribe = gameEventBus.subscribe(sessionId, (event) => {
      // Filter targeted events
      if (event.forPlayer && event.forPlayer !== claims.sub) return;

      stream
        .writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
        })
        .catch(() => {});
    });

    await runSSEKeepaliveLoop(stream, unsubscribe);
  });
});
