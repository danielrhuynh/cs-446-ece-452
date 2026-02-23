import { Hono } from "hono";
import { cors } from "hono/cors";
import { sessionRoutes, sessionSSEController } from "./controllers/session-controller";
import { logger } from "./utils/logger";

const app = new Hono();

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: Date.now() - start,
    },
    "[HTTP] request",
  );
});

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
}));

app.get("/health", (c) => c.json({ ok: true }));

const routes = app.route("/sessions", sessionRoutes);
app.route("/sessions", sessionSSEController);

export type AppType = typeof routes;
export default app;
