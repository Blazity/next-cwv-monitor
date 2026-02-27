import { createEnv } from "@t3-oss/env-nextjs";
import z from "zod";

const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const lifecycleEvent = process.env.npm_lifecycle_event ?? "";
const isBuildCommand = lifecycleEvent === "build" || lifecycleEvent.startsWith("build:");

function resolveAuthBaseUrl(): string | undefined {
  const explicit = process.env.AUTH_BASE_URL;
  if (explicit && explicit.trim().length > 0) return explicit;

  // Vercel provides `VERCEL_URL` (without protocol) for every deployment, including previews.
  // Use it as a fallback so Preview deployments don't require manual `AUTH_BASE_URL` configuration.
  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_BRANCH_URL;
  if (vercelUrl && vercelUrl.trim().length > 0) return `https://${vercelUrl}`;

  // As a last resort on Vercel, fall back to the canonical production URL.
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl && vercelProductionUrl.trim().length > 0) return `https://${vercelProductionUrl}`;

  return undefined;
}

const resolvedAuthBaseUrl = resolveAuthBaseUrl();

export const env = createEnv({
  server: {
    AUTH_BASE_URL: z.url(),
    TRUST_PROXY: z.enum(["true", "false"]).default("false"),
    CLICKHOUSE_HOST: z.string().min(1, "CLICKHOUSE_HOST is required"),
    CLICKHOUSE_PORT: z.string().min(1, "CLICKHOUSE_PORT is required"),
    CLICKHOUSE_USER: z.string().min(1, "CLICKHOUSE_USER is required"),
    CLICKHOUSE_PASSWORD: z.string(),
    CLICKHOUSE_DB: z.string().min(1, "CLICKHOUSE_DB is required"),
    AI_ANALYST_CLICKHOUSE_USER: z.string().min(1).default("ai_analyst_user"),
    AI_ANALYST_CLICKHOUSE_PASSWORD: z.string().min(1),
    BETTER_AUTH_SECRET: z.string(),
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: z.coerce.boolean().default(false),
    MIN_PASSWORD_SCORE: z.coerce.number().min(0).max(4).default(2),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60_000),
    MAX_LOGIN_ATTEMPTS: z.coerce.number().positive().default(5),
    INITIAL_USER_EMAIL: z.email(),
    INITIAL_USER_PASSWORD: z.string().min(8),
    INITIAL_USER_NAME: z.string().min(3),
    AI_API_KEY: z.string().optional(),
    AI_PROVIDER: z.string().optional(),
    AI_MODEL: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  },
  client: {},
  skipValidation: process.env.SKIP_VALIDATION === "true" || isBuildCommand,
  runtimeEnv: {
    MIN_PASSWORD_SCORE: process.env.MIN_PASSWORD_SCORE,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    MAX_LOGIN_ATTEMPTS: process.env.MAX_LOGIN_ATTEMPTS,
    AUTH_BASE_URL: resolvedAuthBaseUrl,
    TRUST_PROXY: process.env.TRUST_PROXY,
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    CLICKHOUSE_PORT: process.env.CLICKHOUSE_PORT,
    CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
    CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD,
    CLICKHOUSE_DB: process.env.CLICKHOUSE_DB,
    AI_ANALYST_CLICKHOUSE_USER: process.env.AI_ANALYST_CLICKHOUSE_USER,
    AI_ANALYST_CLICKHOUSE_PASSWORD: process.env.AI_ANALYST_CLICKHOUSE_PASSWORD,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    CLICKHOUSE_ADAPTER_DEBUG_LOGS: process.env.CLICKHOUSE_ADAPTER_DEBUG_LOGS,
    INITIAL_USER_EMAIL: process.env.INITIAL_USER_EMAIL,
    INITIAL_USER_PASSWORD: process.env.INITIAL_USER_PASSWORD,
    INITIAL_USER_NAME: process.env.INITIAL_USER_NAME,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  },
});
