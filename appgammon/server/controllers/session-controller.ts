import { Hono } from "hono";
import * as sessionService from "../services/session-service";
import { get_or_create_player } from "../services/session-service";

export const sessionController = new Hono();

sessionController.post("/create", async (c) => {
  const body = await c.req.json<{ device_id: string; display_name: string }>();
  const { device_id, display_name } = body;

  if (!device_id || !display_name) {
      return c.json({ error: "device_id and display_name are required" }, 400);
  }

  const player = await get_or_create_player(device_id, display_name);
  const session = await sessionService.create_session(player.id);
  return c.json(session);
});

sessionController.post("/join", async (c) => {
  const body = await c.req.json<{ device_id: string; display_name: string, session_id: string }>();
  const { device_id, display_name, session_id } = body;

  const player = await get_or_create_player(device_id, display_name);
  const session = await sessionService.join_session(player.id, session_id);

  if (!session) {
    return c.json({error: "Failed to join session"})
  }
  return c.json(session);
})
