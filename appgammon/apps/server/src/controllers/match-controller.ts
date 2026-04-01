import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { describeRoute } from "hono-openapi";
import { SESSION_ROLE } from "@appgammon/common";
import {
  doubleActionPayloadSchema,
  emotePayloadSchema,
  startMatchPayloadSchema,
  submitMovesPayloadSchema,
} from "../schemas/match";
import { normalizeSessionId } from "../schemas/session";
import {
  jsonSchema,
  errorResponse,
  matchStateSchema,
  okResponse,
} from "../schemas/openapi-responses";
import { matchService } from "../services/match-service";
import { checkAuth } from "../utils/auth";

export const matchRoutes = new Hono()
  .post(
    "/:id/match",
    describeRoute({
      tags: ["Match"],
      summary: "Start a new match",
      description: "Host-only. Creates a target-score match with the first game and opening roll.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(startMatchPayloadSchema) } },
      },
      responses: {
        200: {
          description: "Match started",
          content: { "application/json": { schema: jsonSchema(matchStateSchema) } },
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
    sValidator("json", startMatchPayloadSchema),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (claims.role !== SESSION_ROLE.host) {
        return c.json({ error: "Only the host can start a match" }, 403);
      }

      const { target_score } = c.req.valid("json");
      const result = await matchService.startMatch(sessionId, target_score);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json(result.data);
    },
  )
  .get(
    "/:id/match",
    describeRoute({
      tags: ["Match"],
      summary: "Sync match state",
      description: "Returns the current match and game state for this session.",
      responses: {
        200: {
          description: "Current state",
          content: { "application/json": { schema: jsonSchema(matchStateSchema) } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: jsonSchema(errorResponse) } },
        },
        404: {
          description: "No active match",
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

      const state = await matchService.getMatchState(sessionId);

      if (!state) {
        return c.json({ error: "No active match found" }, 404);
      }

      return c.json(state);
    },
  )
  .put(
    "/:id/match/games/:gameId/moves",
    describeRoute({
      tags: ["Match"],
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
    sValidator("json", submitMovesPayloadSchema),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { version, moves } = c.req.valid("json");
      const gameId = c.req.param("gameId");
      const result = await matchService.submitMoves(gameId, claims.sub, version, moves, sessionId);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/match/games/:gameId/double",
    describeRoute({
      tags: ["Match"],
      summary: "Doubling cube action",
      description: "Propose, accept, or decline a double.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(doubleActionPayloadSchema) } },
      },
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
    sValidator("json", doubleActionPayloadSchema),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { action } = c.req.valid("json");
      const gameId = c.req.param("gameId");

      let result: { success: boolean; error?: string; status?: number };

      if (action === "propose") {
        result = await matchService.proposeDouble(gameId, claims.sub, sessionId);
      } else {
        result = await matchService.respondToDouble(gameId, claims.sub, action, sessionId);
      }

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/match/games/:gameId/roll",
    describeRoute({
      tags: ["Match"],
      summary: "Roll dice",
      description: "Roll dice for the current turn (skip doubling).",
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
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const gameId = c.req.param("gameId");

      const result = await matchService.rollForTurn(gameId, claims.sub, sessionId);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  )
  .post(
    "/:id/match/emotes",
    describeRoute({
      tags: ["Match"],
      summary: "Send an emote",
      description: "Send an emote to the opponent. Rate limited to 1 per 3 seconds.",
      requestBody: {
        required: true,
        content: { "application/json": { schema: jsonSchema(emotePayloadSchema) } },
      },
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
    sValidator("json", emotePayloadSchema),
    async (c) => {
      const sessionId = normalizeSessionId(c.req.param("id"));
      const claims = await checkAuth(c, sessionId);

      if (!claims) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { emote_id } = c.req.valid("json");

      const result = await matchService.sendEmote(sessionId, claims.sub, emote_id);

      if (!result.success) {
        return c.json({ error: result.error }, (result.status ?? 400) as 400);
      }

      return c.json({ ok: true });
    },
  );
