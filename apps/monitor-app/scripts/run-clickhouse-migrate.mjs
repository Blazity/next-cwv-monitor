#!/usr/bin/env node
import { spawn } from "node:child_process";

const {
  CH_MIGRATIONS_HOST,
  CH_MIGRATIONS_PORT,
  CH_MIGRATIONS_DATABASE,
  CH_MIGRATIONS_USER,
  CH_MIGRATIONS_PASSWORD,
  CLICKHOUSE_HOST,
  CLICKHOUSE_PORT,
  CLICKHOUSE_DB,
  CLICKHOUSE_USER,
  CLICKHOUSE_PASSWORD
} = process.env;

const rawHost = CH_MIGRATIONS_HOST ?? CLICKHOUSE_HOST ?? "localhost";
const port = CH_MIGRATIONS_PORT ?? CLICKHOUSE_PORT ?? "8123";
const hostHasProtocol = /^https?:\/\//.test(rawHost);
const resolvedHost = hostHasProtocol ? rawHost : `http://${rawHost}:${port}`;

const CH_MIGRATIONS_HOME = process.env.CH_MIGRATIONS_HOME ?? process.env.CH_MIGRATIONS_DIR ?? "clickhouse/migrations";

const database = CH_MIGRATIONS_DATABASE ?? CLICKHOUSE_DB ?? "cwv_monitor";
const user = CH_MIGRATIONS_USER ?? CLICKHOUSE_USER ?? "default";
const password = CH_MIGRATIONS_PASSWORD ?? CLICKHOUSE_PASSWORD ?? "";

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
  ...extraArgs
];

let child = spawn("clickhouse-migrations", args, {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
