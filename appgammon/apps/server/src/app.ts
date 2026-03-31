import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { sessionRoutes } from "./controllers/session-controller";
import { matchRoutes } from "./controllers/game-controller";
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

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
  }),
);

app.get(
  "/openapi",
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: "Appgammon API",
        version: "1.0.0",
        description:
          "Backend API for the Appgammon backgammon mobile app. Supports session management, real-time game play, doubling cube, and emotes.",
      },
      servers: [{ url: "http://localhost:3000", description: "Local dev" }],
    },
  }),
);

app.get("/docs", swaggerUI({ url: "/openapi" }));

app.get("/health", (c) => c.json({ ok: true }));

const routes = app.route("/sessions", sessionRoutes).route("/sessions", matchRoutes);

export type AppType = typeof routes;
export default app;
