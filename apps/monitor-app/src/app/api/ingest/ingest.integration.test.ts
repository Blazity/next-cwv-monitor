import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { NextRequest } from 'next/server';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

import type { InsertableProjectRow } from '@/app/server/lib/clickhouse/schema';
import { ipRateLimiter } from '@/app/server/lib/rate-limit';
import { createClient } from '@clickhouse/client';

let container: StartedTestContainer;
let POST: typeof import('./route').POST;
let OPTIONS: typeof import('./route').OPTIONS;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let fetchEvents: typeof import('@/app/server/lib/clickhouse/repositories/events-repository').fetchEvents;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;

const CLICKHOUSE_IMAGE = 'clickhouse/clickhouse-server:24.8-alpine';
const HTTP_PORT = 8123;
const DATABASE = 'cwv_monitor';
const CLICKHOUSE_USER = 'default';
const CLICKHOUSE_PASSWORD = 'secret';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildRequest(body: Record<string, unknown> | string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/ingest', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': headers['x-forwarded-for'] ?? '203.0.113.14',
      'user-agent': headers['user-agent'] ?? 'Mozilla/5.0 Vitest',
      ...headers
    }
  });
}

async function waitForClickHouse(host: string, port: number, attempts = 30, options?: { database?: string }) {
  for (let i = 0; i < attempts; i++) {
    try {
      const client = createClient({
        url: `http://${host}:${port}`,
        database: options?.database ?? DATABASE,
        username: CLICKHOUSE_USER,
        password: CLICKHOUSE_PASSWORD
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

async function execOrThrow(target: StartedTestContainer, command: string[], context: string) {
  const result = await target.exec(command);
  if (result.exitCode !== 0) {
    throw new Error(`${context} failed (exit ${result.exitCode}): ${result.stderr || result.stdout || result.output}`);
  }
}

async function runClickHouseMigrations(host: string, port: number) {
  const scriptPath = path.resolve(process.cwd(), 'scripts/run-clickhouse-migrate.mjs');
  const migrationsDir = path.resolve(process.cwd(), 'clickhouse/migrations');

  const envOverrides = {
    ...process.env,
    CH_MIGRATIONS_HOST: `http://${host}:${port}`,
    CH_MIGRATIONS_PORT: String(port),
    CH_MIGRATIONS_DATABASE: DATABASE,
    CH_MIGRATIONS_USER: CLICKHOUSE_USER,
    CH_MIGRATIONS_PASSWORD: CLICKHOUSE_PASSWORD,
    CH_MIGRATIONS_DIR: migrationsDir
  };

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.resolve(process.cwd()),
      env: envOverrides,
      stdio: 'inherit'
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

async function waitForPersistedEvents(
  projectId: string,
  expectedCount: number,
  options?: { limit?: number; timeoutMs?: number }
) {
  const limit = Math.max(expectedCount, options?.limit ?? 10);
  const timeoutMs = options?.timeoutMs ?? 2000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const rows = await fetchEvents({ projectId, limit });
    if (rows.length >= expectedCount) {
      return rows;
    }
    await wait(50);
  }

  throw new Error(`Timed out waiting for ${expectedCount} events for project ${projectId}`);
}

describe('POST /api/ingest integration', () => {
  beforeAll(async () => {
    container = await new GenericContainer(CLICKHOUSE_IMAGE)
      .withExposedPorts(HTTP_PORT)
      .withEnvironment({ CLICKHOUSE_DB: DATABASE, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD })
      .start();

    const dockerHost = container.getHost();
    const host = dockerHost === 'localhost' ? '127.0.0.1' : dockerHost;
    const port = container.getMappedPort(HTTP_PORT);

    process.env.CLICKHOUSE_HOST = host;
    process.env.CLICKHOUSE_PORT = String(port);
    process.env.CLICKHOUSE_DB = DATABASE;
    process.env.CLICKHOUSE_USER = CLICKHOUSE_USER;
    process.env.CLICKHOUSE_PASSWORD = CLICKHOUSE_PASSWORD;
    process.env.CLIENT_APP_ORIGIN = 'http://localhost:3001';
    process.env.BETTER_AUTH_SECRET = 'integration-test-secret';
    process.env.TRUST_PROXY = 'true';
    process.env.LOG_LEVEL = 'debug';

    await waitForClickHouse(host, port, 30, { database: 'default' });

    await execOrThrow(
      container,
      [
        'clickhouse-client',
        '--user',
        CLICKHOUSE_USER,
        '--password',
        CLICKHOUSE_PASSWORD,
        '--query',
        `CREATE DATABASE IF NOT EXISTS ${DATABASE}`
      ],
      'CREATE DATABASE'
    );

    await runClickHouseMigrations(host, port);
    await waitForClickHouse(host, port);

    ({ POST, OPTIONS } = await import('./route'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ fetchEvents } = await import('@/app/server/lib/clickhouse/repositories/events-repository'));
    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  beforeEach(async () => {
    await ipRateLimiter.reset();
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
  });

  it('ingests events and persists them in ClickHouse', async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      slug: 'test-project',
      name: 'Test Project'
    };
    await createProject(project);

    const recordedAt = new Date().toISOString();

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events: [
          {
            sessionId: 'session-1',
            route: '/about',
            path: '/about',
            metric: 'CLS',
            value: 0.02,
            rating: 'needs-improvement',
            recordedAt
          }
        ]
      })
    );

    expect(response.status).toBe(204);

    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.route).toBe('/about');
    expect(stored[0]?.path).toBe('/about');
    expect(stored[0]?.metric_name).toBe('CLS');
    expect(stored[0]?.rating).toBe('needs-improvement');
    expect(stored[0]?.device_type).toBe('desktop');
  });

  it('returns 404 when project does not exist', async () => {
    const response = await POST(
      buildRequest({
        projectId: randomUUID(),
        events: [
          {
            route: '/',
            metric: 'CLS',
            value: 0.1,
            rating: 'good'
          }
        ]
      })
    );

    expect(response.status).toBe(404);
  });

  it('ingests multiple events in a single batch', async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      slug: 'batch-project',
      name: 'Batch Project'
    };
    await createProject(project);

    const events = Array.from({ length: 5 }).map((_, index) => ({
      sessionId: `session-${index}`,
      route: `/docs/${index}`,
      metric: 'INP',
      value: 120 + index,
      rating: 'poor'
    }));

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events
      })
    );

    expect(response.status).toBe(204);

    const stored = await waitForPersistedEvents(project.id, events.length, { limit: 10 });
    expect(stored).toHaveLength(events.length);
  });

  it('fills defaults for optional fields when missing', async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      slug: 'defaults-project',
      name: 'Defaults Project'
    };
    await createProject(project);

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events: [
          {
            metric: 'TTFB',
            value: 75,
            rating: 'good'
          }
        ]
      })
    );

    expect(response.status).toBe(204);
    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
    const event = stored[0]!;
    expect(typeof event.session_id).toBe('string');
    expect(event.route).toBe('/');
    expect(event.path).toBe('/');
    expect(new Date(event.recorded_at).getTime()).toBeGreaterThan(0);
    expect(new Date(event.ingested_at).getTime()).toBeGreaterThan(0);
  });

  it('rejects invalid JSON payloads', async () => {
    const response = await POST(buildRequest('{'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'Invalid JSON payload' });
  });

  it('rejects schema violations before hitting ClickHouse', async () => {
    const response = await POST(
      buildRequest({
        projectId: 'not-a-uuid',
        events: [
          {
            route: '/',
            metric: 'CLS',
            value: 0.1,
            rating: 'good'
          }
        ]
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty('issues');
  });

  it('rejects requests without events', async () => {
    const response = await POST(
      buildRequest({
        projectId: randomUUID(),
        events: []
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'No events provided' });
  });

  it('enforces per-IP rate limits', async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      slug: 'rate-limited',
      name: 'Rate Limited'
    };
    await createProject(project);

    const ip = '198.51.100.200';
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: project.id,
          events: [
            {
              route: '/',
              metric: 'CLS',
              value: 0.1,
              rating: 'good'
            }
          ]
        },
        { 'x-forwarded-for': ip }
      )
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
  });

  it('ignores rate limits when client IP is null', async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      slug: 'no-ip',
      name: 'No IP'
    };
    await createProject(project);

    // If the code ever falls back to 0.0.0.0 (or any placeholder), this request would be rate-limited.
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check('0.0.0.0');
    }

    const response = await POST(
      buildRequest(
        {
          projectId: project.id,
          events: [
            {
              route: '/',
              metric: 'CLS',
              value: 0.1,
              rating: 'good'
            }
          ]
        },
        // Empty forwarded-for means "no usable IP" while still allowing other tests to use the default.
        { 'x-forwarded-for': '' }
      )
    );

    expect(response.status).toBe(204);
    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
  });

  it('uses the first x-forwarded-for entry for rate limiting', async () => {
    const ip = '198.51.100.201';
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: '/',
              metric: 'CLS',
              value: 0.1,
              rating: 'good'
            }
          ]
        },
        { 'x-forwarded-for': `${ip}, 10.0.0.1` }
      )
    );

    expect(response.status).toBe(429);
  });

  it('uses x-real-ip when x-forwarded-for is missing', async () => {
    const ip = '198.51.100.202';
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: '/',
              metric: 'CLS',
              value: 0.1,
              rating: 'good'
            }
          ]
        },
        { 'x-forwarded-for': '', 'x-real-ip': ip }
      )
    );

    expect(response.status).toBe(429);
  });

  it('uses cf-connecting-ip when x-forwarded-for and x-real-ip are missing', async () => {
    const ip = '198.51.100.203';
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: '/',
              metric: 'CLS',
              value: 0.1,
              rating: 'good'
            }
          ]
        },
        { 'x-forwarded-for': '', 'cf-connecting-ip': ip }
      )
    );

    expect(response.status).toBe(429);
  });

  it('responds to OPTIONS preflight with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });
});
