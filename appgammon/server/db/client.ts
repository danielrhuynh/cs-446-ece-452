import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: "../.env" });

const pool = new Pool({
  host: process.env.RDSHOST || "localhost",
  port: 5432,
  user: process.env.USER || "appgammon",
  password: process.env.PASSWORD || "password",
  database: process.env.DBNAME || "appgammon",
  ssl: process.env.RDSHOST ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
