import { spawn } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { createClient } from "@clickhouse/client";
import type { ClickHouseSQL } from "waddler/clickhouse";

export const CLICKHOUSE_IMAGE = "clickhouse/clickhouse-server:25.8-alpine";
export const HTTP_PORT = 8123;

type ClickHouseTestConfig = {
  database: string;
  username: string;
  password: string;
};

const DEFAULT_TEST_DATABASE = "cwv_monitor_test";
const DEFAULT_TEST_USERNAME = "default";
const DEFAULT_TEST_PASSWORD = "secret";

function getClickHouseTestConfig(): ClickHouseTestConfig {
  return {
    database: process.env.CLICKHOUSE_DB ?? DEFAULT_TEST_DATABASE,
    username: process.env.CLICKHOUSE_USER ?? DEFAULT_TEST_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD ?? DEFAULT_TEST_PASSWORD,
  };
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForClickHouse(
  host: string,
  port: number,
  attempts = 30,
  options?: { database?: string; username?: string; password?: string },
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const client = createClient({
        url: `http://${host}:${port}`,
        database: options?.database ?? "default",
        username: options?.username ?? "default",
        password: options?.password ?? "",
      });
      await client.query({ query: "SELECT 1" });
      await client.close();
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await wait(1000);
    }
  }
}

export async function execOrThrow(
    target: StartedTestContainer | { exec: (cmd: string[]) => Promise<{ exitCode: number; stderr?: string; stdout?: string; output?: string }> }, 
    command: string[], 
    context: string
): Promise<void> {
  const result = await target.exec(command);
  if (result.exitCode !== 0) {
    throw new Error(`${context} failed (exit ${result.exitCode}): ${result.stderr || result.stdout || result.output}`);
  }
}

export async function runClickHouseMigrations(dynamicOverrides: Record<string, string>): Promise<void> {
  const scriptPath = path.resolve(process.cwd(), "scripts/run-clickhouse-migrate.mjs");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.resolve(process.cwd()),
      stdio: "inherit",
      env: {
        ...process.env,
        ...dynamicOverrides,
      },
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Migrations script exited with code ${code}`));
      }
    });
  });
}

export async function optimizeAggregates(sqlClient: ClickHouseSQL): Promise<void> {
  const deadlineMs = Date.now() + 10_000;

  const readEventsCount = async (): Promise<number> => {
    const rows = await sqlClient<{ cnt: string }>`
      SELECT toString(count()) AS cnt
      FROM cwv_events
    `;
    const raw = rows[0]?.cnt;
    return typeof raw === "number" ? raw : Number(raw);
  };

  const readAggregatesCount = async (): Promise<number> => {
    const rows = await sqlClient<{ cnt: string }>`
      SELECT toString(count()) AS cnt
      FROM cwv_daily_aggregates
    `;
    const raw = rows[0]?.cnt;
    return typeof raw === "number" ? raw : Number(raw);
  };

  while (Date.now() < deadlineMs) {
    const eventsCount = await readEventsCount();
    if (eventsCount === 0) {
      await wait(50);
      continue;
    }
    break;
  }

  const finalEventsCount = await readEventsCount();
  if (finalEventsCount === 0) {
    await sqlClient`OPTIMIZE TABLE cwv_daily_aggregates FINAL`.command();
    return;
  }

  while (Date.now() < deadlineMs) {
    const aggregatesCount = await readAggregatesCount();
    if (aggregatesCount > 0) break;
    await wait(50);
  }

  const finalAggregatesCount = await readAggregatesCount();
  if (finalAggregatesCount === 0) {
    throw new Error(
      `Timed out waiting for mv_cwv_daily_aggregates to populate: cwv_events=${finalEventsCount}, cwv_daily_aggregates=${finalAggregatesCount}`,
    );
  }

  await sqlClient`OPTIMIZE TABLE cwv_daily_aggregates FINAL`.command();
}

export async function optimizeAnomalies(sqlClient: ClickHouseSQL): Promise<void> {
  const deadlineMs = Date.now() + 10_000;
  while (Date.now() < deadlineMs) {
    const rows = await sqlClient<{ cnt: string }>`
      SELECT toString(count()) AS cnt FROM cwv_stats_hourly
    `;
    const raw = rows[0]?.cnt;
    const count = typeof raw === "number" ? raw : Number(raw);
    if (count > 0) break;
    await wait(50);
  }
  await sqlClient`OPTIMIZE TABLE cwv_stats_hourly FINAL`.command();
}

export function overrideClickHousePortForTest(port: number): void {
  process.env.CLICKHOUSE_PORT = String(port);
}

export async function setupClickHouseContainer(): Promise<{
  container: StartedTestContainer;
  host: string;
  port: number;
}> {
  const cfg = getClickHouseTestConfig();
  
  // Use existing shared global container if available
  const globalHost = process.env.TEST_CH_HOST;
  const globalPort = process.env.TEST_CH_PORT;

  if (globalHost && globalPort) {
    const host = globalHost;
    const port = Number(globalPort);
    
    // Isolation: each test file gets its own database name
    const uniqueDbName = `db_${randomUUID().replaceAll("-", "_")}`;
    
    // Create the unique database in the global container
    const adminClient = createClient({
        url: `http://${host}:${port}`,
        database: "default",
        username: cfg.username,
        password: cfg.password,
    });
    
    await adminClient.query({ query: `CREATE DATABASE IF NOT EXISTS ${uniqueDbName}` });
    await adminClient.close();

    // Set port for env.ts and set database name
    overrideClickHousePortForTest(port);
    process.env.CLICKHOUSE_DB = uniqueDbName;
    process.env.CLICKHOUSE_HOST = host;

    // Run migrations on this unique database
    await runClickHouseMigrations({
      CH_MIGRATIONS_HOST: host,
      CH_MIGRATIONS_PORT: String(port),
      CH_MIGRATIONS_DB: uniqueDbName,
      CH_MIGRATIONS_USER: cfg.username,
      CH_MIGRATIONS_PASSWORD: cfg.password,
    });

    // Mock StartedTestContainer stop() method since it's shared
    const mockContainer = {
        stop: async () => {
            const cleanerClient = createClient({
                url: `http://${host}:${port}`,
                database: "default",
                username: cfg.username,
                password: cfg.password,
            });
            await cleanerClient.query({ query: `DROP DATABASE IF EXISTS ${uniqueDbName}` });
            await cleanerClient.close();
        },
        getHost: () => host,
        getMappedPort: () => port,
        exec: async () => ({ exitCode: 0 })
    } as unknown as StartedTestContainer;

    return { container: mockContainer, host, port };
  }

  // Fallback to standalone container if global setup is not used
  const container = await new GenericContainer(CLICKHOUSE_IMAGE)
    .withExposedPorts(HTTP_PORT)
    .withEnvironment({
      CLICKHOUSE_DB: cfg.database,
      CLICKHOUSE_USER: cfg.username,
      CLICKHOUSE_PASSWORD: cfg.password,
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
    })
    .start();

  const dockerHost = container.getHost();
  const host = dockerHost === "localhost" ? "127.0.0.1" : dockerHost;
  const port = container.getMappedPort(HTTP_PORT);

  await waitForClickHouse(host, port, 30, { database: "default", username: cfg.username, password: cfg.password });

  await execOrThrow(
    container,
    [
      "clickhouse-client",
      "--user",
      cfg.username,
      "--password",
      cfg.password,
      "--query",
      `CREATE DATABASE IF NOT EXISTS ${cfg.database}`,
    ],
    "CREATE DATABASE",
  );

  overrideClickHousePortForTest(port);
  await runClickHouseMigrations({
    CH_MIGRATIONS_HOST: host,
    CH_MIGRATIONS_PORT: String(port),
    CH_MIGRATIONS_DB: cfg.database,
    CH_MIGRATIONS_USER: cfg.username,
    CH_MIGRATIONS_PASSWORD: cfg.password,
  });

  await waitForClickHouse(host, port, 30, {
    database: cfg.database,
    username: cfg.username,
    password: cfg.password,
  });

  return { container, host, port };
}
