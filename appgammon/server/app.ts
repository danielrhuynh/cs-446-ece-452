import { Hono } from "hono";
import { sessionController } from "./controllers/session-controller";

const app = new Hono();

app.route("/sessions", sessionController);

export default app;
