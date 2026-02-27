import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { createClient } from "@clickhouse/client";
import { HTTP_PORT, CLICKHOUSE_IMAGE, waitForClickHouse, runClickHouseMigrations } from "./clickhouse-test-utils";
import fs from "node:fs";
import path from "node:path";

let container: StartedTestContainer | undefined;

export async function setup() {  
  const instance = await new GenericContainer(CLICKHOUSE_IMAGE)
    .withExposedPorts(HTTP_PORT)
    .withEnvironment({
      CLICKHOUSE_DB: "default",
      CLICKHOUSE_USER: "default",
      CLICKHOUSE_PASSWORD: "secret",
      CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT: "1",
    })
    .start();

  container = instance;

  const host = container.getHost() === "localhost" ? "127.0.0.1" : container.getHost();
  const port = container.getMappedPort(HTTP_PORT);

  const configPath = path.resolve(process.cwd(), ".vitest-ch-config.json");
  fs.writeFileSync(configPath, JSON.stringify({ host, port }));

  await waitForClickHouse(host, port, 30, { 
    database: "default", 
    username: "default", 
    password: "secret" 
  });

  // Ensure the shared test database exists and has all migrations applied.
  // Most integration tests (including the Better Auth adapter tests) expect
  // `CLICKHOUSE_DB` (defaulting to "cwv_monitor_test") to be fully migrated.
  const targetDatabase = process.env.CLICKHOUSE_DB ?? "cwv_monitor_test";

  await runClickHouseMigrations({
    CH_MIGRATIONS_HOST: host,
    CH_MIGRATIONS_PORT: String(port),
    CH_MIGRATIONS_DATABASE: targetDatabase,
    CH_MIGRATIONS_USER: "default",
    CH_MIGRATIONS_PASSWORD: "secret",
  });

  // Backwards-compat for Better Auth adapter tests:
  // the schema migrations use snake_case column names, while the
  // adapter historically referenced camelCase fields. For the
  // dedicated test database we add lightweight aliases to keep
  // the tests (and adapter) working without affecting production.
  const adminClient = createClient({
    url: `http://${host}:${port}`,
    database: targetDatabase,
    username: "default",
    password: "secret",
  });

  await adminClient.query({
    query: `
      ALTER TABLE user 
        ADD COLUMN IF NOT EXISTS emailVerified Bool ALIAS email_verified,
        ADD COLUMN IF NOT EXISTS createdAt   DateTime ALIAS created_at,
        ADD COLUMN IF NOT EXISTS updatedAt   DateTime ALIAS updated_at,
        ADD COLUMN IF NOT EXISTS email_address String ALIAS email
    `,
  });

  await adminClient.close();
}

export async function teardown() {  
  const configPath = path.resolve(process.cwd(), ".vitest-ch-config.json");
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }

  if (container) {
    await container.stop();
  }
}
