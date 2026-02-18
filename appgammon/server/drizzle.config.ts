import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../.env" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_CONN_STRING!,
  },
});
