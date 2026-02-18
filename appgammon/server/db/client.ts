// server/src/db/connection.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: "postgresql://appgammon:appgammon@localhost:5432/appgammon",
});

export const db = drizzle(pool, { schema });
