#!/usr/bin/env node
import { spawn } from "node:child_process";

const getEnv = (key, fallback) => {
  const val = process.env[key];
  // Check if the value is literally "${VAR_NAME}" (unresolved template)
  if (!val || val.startsWith("${")) return fallback;
  return val;
};

const rawHost = getEnv("CH_MIGRATIONS_HOST", getEnv("CLICKHOUSE_HOST", "127.0.0.1"));
const port = getEnv("CH_MIGRATIONS_PORT", getEnv("CLICKHOUSE_PORT", "8123"));
const database = getEnv("CH_MIGRATIONS_DATABASE", getEnv("CLICKHOUSE_DB", "cwv_monitor"));
const user = getEnv("CH_MIGRATIONS_USER", getEnv("CLICKHOUSE_USER", "default"));
const password = getEnv("CH_MIGRATIONS_PASSWORD", getEnv("CLICKHOUSE_PASSWORD", ""));

if (rawHost.includes("${")) {
  throw new Error("Environment variables not properly resolved. Check your .env files.");
}

const hostHasProtocol = /^https?:\/\//.test(rawHost);
const resolvedHost = hostHasProtocol ? rawHost : `http://${rawHost}:${port}`;

const CH_MIGRATIONS_HOME = process.env.CH_MIGRATIONS_HOME ?? process.env.CH_MIGRATIONS_DIR ?? "clickhouse/migrations";
const extraArgs = process.argv.slice(2);

const args = [
  "migrate",
  "--host",
  resolvedHost,
  "--db",
  database,
  "--user",
  user,
  "--password",
  password,
  "--migrations-home",
  CH_MIGRATIONS_HOME,
  ...extraArgs,
];

const child = spawn("clickhouse-migrations", args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
