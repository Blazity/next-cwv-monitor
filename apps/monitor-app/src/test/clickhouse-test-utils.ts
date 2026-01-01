import { spawn } from 'node:child_process';
import path from 'node:path';

import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createClient } from '@clickhouse/client';

export const CLICKHOUSE_IMAGE = 'clickhouse/clickhouse-server:24.8-alpine';
export const HTTP_PORT = 8123;

type ClickHouseTestConfig = {
  database: string;
  username: string;
  password: string;
};

const DEFAULT_TEST_DATABASE = 'cwv_monitor_test';
const DEFAULT_TEST_USERNAME = 'default';
const DEFAULT_TEST_PASSWORD = 'secret';

function getClickHouseTestConfig(): ClickHouseTestConfig {
  return {
    database: process.env.CLICKHOUSE_DB ?? DEFAULT_TEST_DATABASE,
    username: process.env.CLICKHOUSE_USER ?? DEFAULT_TEST_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD ?? DEFAULT_TEST_PASSWORD
  };
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForClickHouse(
  host: string,
  port: number,
  attempts = 30,
  options?: { database?: string; username?: string; password?: string }
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const client = createClient({
        url: `http://${host}:${port}`,
        database: options?.database ?? 'default',
        username: options?.username ?? 'default',
        password: options?.password ?? ''
      });
      await client.query({ query: 'SELECT 1' });
      await client.close();
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await wait(1000);
    }
  }
}

export async function execOrThrow(target: StartedTestContainer, command: string[], context: string): Promise<void> {
  const result = await target.exec(command);
  if (result.exitCode !== 0) {
    throw new Error(`${context} failed (exit ${result.exitCode}): ${result.stderr || result.stdout || result.output}`);
  }
}

export async function runClickHouseMigrations(): Promise<void> {
  const scriptPath = path.resolve(process.cwd(), 'scripts/run-clickhouse-migrate.mjs');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.resolve(process.cwd()),
      stdio: 'inherit',
      env: {...process.env}
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Migrations script exited with code ${code}`));
      }
    });
  });
}

export async function optimizeAggregates(
  sqlClient: (strings: TemplateStringsArray, ...values: unknown[]) => { command: () => PromiseLike<unknown> }
): Promise<void> {
  // The MV inserts happen asynchronously, wait briefly for them to complete
  await wait(100);
  // Force ClickHouse to merge all parts in the aggregates table
  await sqlClient`OPTIMIZE TABLE cwv_daily_aggregates FINAL`.command();
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

  const container = await new GenericContainer(CLICKHOUSE_IMAGE)
    .withExposedPorts(HTTP_PORT)
    .withEnvironment({
      CLICKHOUSE_DB: cfg.database,
      CLICKHOUSE_USER: cfg.username,
      CLICKHOUSE_PASSWORD: cfg.password
    })
    .start();

  const dockerHost = container.getHost();
  const host = dockerHost === 'localhost' ? '127.0.0.1' : dockerHost;
  const port = container.getMappedPort(HTTP_PORT);

  await waitForClickHouse(host, port, 30, { database: 'default', username: cfg.username, password: cfg.password });

  await execOrThrow(
    container,
    [
      'clickhouse-client',
      '--user',
      cfg.username,
      '--password',
      cfg.password,
      '--query',
      `CREATE DATABASE IF NOT EXISTS ${cfg.database}`
    ],
    'CREATE DATABASE'
  );

  // We only override the ClickHouse port for tests. Everything else comes from `.env.test` / `.env.ci`.
  overrideClickHousePortForTest(port);
  await runClickHouseMigrations();

  await waitForClickHouse(host, port, 30, {
    database: cfg.database,
    username: cfg.username,
    password: cfg.password
  });

  return { container, host, port };
}
