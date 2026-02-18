import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { config } from "dotenv";

config({ path: "../.env" });

const pool = new Pool({
  connectionString: process.env.DB_CONN_STRING,
});

export const db = drizzle(pool, { schema });
