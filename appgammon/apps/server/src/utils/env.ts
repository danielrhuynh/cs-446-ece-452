import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod/v4";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false, quiet: true });

const DEV_APP_JWT_SECRET = "dev-only-session-secret-change-me";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["test", "development", "staging", "production"]).default("development"),
    APP_JWT_SECRET: z.string().default(DEV_APP_JWT_SECRET),

    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().default(5432),
    DB_USER: z.string().default("appgammon"),
    DB_PASSWORD: z.string().default("password"),
    DB_NAME: z.string().default("appgammon"),
  })
  .check((ctx) => {
    const val = ctx.value;

    if (["test", "development"].includes(val.NODE_ENV)) {
      return;
    }

    if (val.APP_JWT_SECRET === DEV_APP_JWT_SECRET) {
      ctx.issues.push({
        code: "custom",
        message: "cannot use default session secret in a non testing or development environment",
        input: val.APP_JWT_SECRET,
        fatal: true,
      });
    }
  });

export const env = envSchema.parse(process.env);
export const isLocalhost = env.DB_HOST === "localhost" || env.DB_HOST === "127.0.0.1";
export const databaseUrl = new URL(
  `postgresql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
).toString();
