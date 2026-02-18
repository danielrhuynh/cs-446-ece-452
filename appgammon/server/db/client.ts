import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config({ path: "../.env", override: false });

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  user: process.env.DB_USER || "appgammon",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "appgammon",
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
