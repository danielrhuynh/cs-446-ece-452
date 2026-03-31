import { env, isLocalhost } from "../utils/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  // Only use SSL for remote hosts, not local development
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
