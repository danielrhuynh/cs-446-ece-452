import { serve } from "@hono/node-server";
import app from "./app";
import { logger } from "./utils/logger";

serve({ fetch: app.fetch, port: 3000 }, () => {
  logger.info("[APP] Server running");
});
