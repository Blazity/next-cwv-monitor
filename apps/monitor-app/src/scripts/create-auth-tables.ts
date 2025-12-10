import { createClient } from '@clickhouse/client';
import 'dotenv/config';

const db = createClient({
  url: process.env.CLICKHOUSE_URL,
  database: process.env.CLICKHOUSE_DATABASE,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
});

async function createAuthTables() {
  console.log('Creating auth tables in ClickHouse...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS user (
      id String,
      name String,
      email String,
      emailVerified UInt8 DEFAULT 0,
      image Nullable(String),
      createdAt DateTime DEFAULT now(),
      updatedAt DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY id`,

    `CREATE TABLE IF NOT EXISTS session (
      id String,
      expiresAt DateTime,
      token String,
      createdAt DateTime DEFAULT now(),
      updatedAt DateTime DEFAULT now(),
      ipAddress Nullable(String),
      userAgent Nullable(String),
      userId String
    ) ENGINE = MergeTree()
    ORDER BY id`,

    `CREATE TABLE IF NOT EXISTS account (
      id String,
      accountId String,
      providerId String,
      userId String,
      accessToken Nullable(String),
      refreshToken Nullable(String),
      idToken Nullable(String),
      accessTokenExpiresAt Nullable(DateTime),
      refreshTokenExpiresAt Nullable(DateTime),
      scope Nullable(String),
      password Nullable(String),
      createdAt DateTime DEFAULT now(),
      updatedAt DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY id`,

    `CREATE TABLE IF NOT EXISTS verification (
      id String,
      identifier String,
      value String,
      expiresAt DateTime,
      createdAt DateTime DEFAULT now(),
      updatedAt DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY id`,
  ];

  for (const query of tables) {
    try {
      await db.command({ query });
      console.log('✓ Table created');
    } catch (error) {
      console.error('Error creating table:', error);
    }
  }

  console.log('Done!');
  process.exit(0);
}

createAuthTables();
