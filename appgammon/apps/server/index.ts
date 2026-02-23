import { serve } from "@hono/node-server";
import app from "./app";
import { logger } from "./utils/logger";

const port = Number(process.env.PORT || 3000);

serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, "[APP] Server running");
});
