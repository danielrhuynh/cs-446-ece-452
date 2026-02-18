import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: "../.env" });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  user: process.env.DB_USER || "appgammon",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "appgammon",
});

export const db = drizzle(pool, { schema });
