import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config({ path: "../.env", override: false });

const host = process.env.DB_HOST || "localhost";
const isLocalhost = host === "localhost" || host === "127.0.0.1";

const pool = new Pool({
  host: host,
  port: 5432,
  user: process.env.DB_USER || "appgammon",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "appgammon",
  // Only use SSL for remote hosts, not localhost
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
