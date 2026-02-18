import { Hono } from "hono";
import * as sessionService from "../services/session-service";
import { get_or_create_player } from "../services/session-service";

export const sessionController = new Hono();

sessionController.post("/", async (c) => {
  const DEVICE_ID = "TEST";
  const DISPLAY_NAME = "TEST NAME";

  const player = await get_or_create_player(DEVICE_ID, DISPLAY_NAME);
  const session = await sessionService.create_session(player.id);
  return c.json(session);
});
