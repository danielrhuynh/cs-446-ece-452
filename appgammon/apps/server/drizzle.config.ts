import path from "node:path";
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, ".env") });

const connString = process.env.DB_CONN_STRING!;
const parsed = new URL(connString);
const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

// For local Docker Postgres, use the docker-compose credentials directly
const url = isLocal
  ? `postgresql://${process.env.DB_USER || "appgammon"}:${process.env.DB_PASSWORD || "password"}@localhost:5432/${process.env.DB_NAME || "appgammon"}`
  : connString;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});
