import { Hono } from "hono";
import { cors } from "hono/cors";
import { sessionController } from "./controllers/session-controller";

const app = new Hono();

// Enable CORS for all origins (development)
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.route("/sessions", sessionController);

export default app;
