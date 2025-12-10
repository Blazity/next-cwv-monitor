import { describe, afterAll, beforeAll } from "vitest";
import { runAdapterTest } from "better-auth/adapters/test";
import { clickHouseAdapter } from "./clickhouse-adapter";
import { db } from "./db";

describe("ClickHouse Adapter Tests", async () => {
  const cleanupTables = async () => {
    const tables = ['user', 'session', 'account', 'verification'];
    for (const table of tables) {
      try {
        await db.command({ query: `TRUNCATE TABLE IF EXISTS ${table}` });
      } catch {
        // Table might not exist yet, that's ok
      }
    }
  };

  beforeAll(async () => {
    await cleanupTables();
  });

  afterAll(async () => {
    await cleanupTables();
  });

  // clickHouseAdapter() returns a factory (from createAdapterFactory)
  // that factory needs to be called with betterAuthOptions
  const adapterFactory = clickHouseAdapter();

  runAdapterTest({
    getAdapter: async (betterAuthOptions: Record<string, unknown> = {}) => {
      return adapterFactory(betterAuthOptions);
    },
  });
});
