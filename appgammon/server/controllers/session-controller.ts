import { Hono } from "hono";
import * as sessionService from "../services/session-service";

export const sessionController = new Hono();

sessionController.post("/", async (c) => {
  const { playerId } = await c.req.json(); // For testing, this actually comes from a service call that creates or finds a player
  const session = await sessionService.createSession(playerId);
  return c.json(session);
});
