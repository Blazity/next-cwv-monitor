import { describe, afterAll, beforeAll } from 'vitest';
import { runAdapterTest } from 'better-auth/adapters/test';
import { sql } from '@/app/server/lib/clickhouse/client';
import { clickHouseAdapter } from '@/lib/clickhouse-adapter';

const cleanupTables = async () => {
  const tables = ['user', 'session', 'account', 'verification'];
  for (const table of tables) {
    try {
      await sql.unsafe(`TRUNCATE TABLE IF EXISTS ${table}`).command();
      await sql.unsafe(`OPTIMIZE TABLE ${table} FINAL`).command();
    } catch {
      // Table might not exist yet, that's ok
    }
  }
};

describe('ClickHouse Adapter Tests', async () => {
  beforeAll(async () => {
    await cleanupTables();
  });

  afterAll(async () => {
    await cleanupTables();
  });

  const adapterFactory = clickHouseAdapter();

  runAdapterTest({
    getAdapter: async (betterAuthOptions: Record<string, unknown> = {}) => {
      return adapterFactory(betterAuthOptions);
    }
  });
});
