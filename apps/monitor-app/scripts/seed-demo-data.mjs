#!/usr/bin/env node
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createClient } from '@clickhouse/client';

const {
  CLICKHOUSE_HOST = 'localhost',
  CLICKHOUSE_PORT = '8123',
  CLICKHOUSE_DB = 'cwv_monitor',
  CLICKHOUSE_USER = 'default',
  CLICKHOUSE_PASSWORD = ''
} = process.env;

function toPositiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const DEMO_PROJECT_ID = process.env.SEED_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000';
const DEMO_PROJECT_SLUG = process.env.SEED_PROJECT_SLUG ?? 'demo-project';
const DEMO_PROJECT_NAME = process.env.SEED_PROJECT_NAME ?? 'Next CWV Demo';
const DAYS_TO_GENERATE = toPositiveInt(process.env.SEED_DAYS, 14);
const EVENTS_PER_COMBO = toPositiveInt(process.env.SEED_EVENTS_PER_COMBO, 3);
const RESET_BEFORE_SEED = process.env.SEED_RESET === 'true';
const RANDOM_SEED = Number.parseInt(process.env.SEED_RANDOM_SEED ?? '42', 10);

const METRICS = ['LCP', 'CLS', 'INP', 'TTFB'];
const ROUTES = [
  { route: '/', paths: ['/'] },
  { route: '/docs', paths: ['/docs', '/docs/getting-started'] },
  { route: '/blog/[slug]', paths: ['/blog/core-web-vitals', '/blog/rendering-patterns'] },
  { route: '/checkout', paths: ['/checkout', '/checkout/review'] }
];
const DEVICES = ['desktop', 'mobile'];

const metricProfiles = {
  LCP: {
    desktop: { base: 2300, spread: 1200 },
    mobile: { base: 2800, spread: 1400 }
  },
  CLS: {
    desktop: { base: 0.08, spread: 0.08, min: 0 },
    mobile: { base: 0.12, spread: 0.08, min: 0 }
  },
  INP: {
    desktop: { base: 190, spread: 160 },
    mobile: { base: 260, spread: 200 }
  },
  TTFB: {
    desktop: { base: 450, spread: 320 },
    mobile: { base: 600, spread: 380 }
  }
};

function createRng(seed) {
  let t = seed + 1_831_565_813;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const rng = createRng(Number.isFinite(RANDOM_SEED) ? RANDOM_SEED : 42);

function randomItem(list) {
  return list[Math.floor(rng() * list.length)];
}

function startOfDayUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function randomTimeOnDay(dayStart) {
  const offsetMs = Math.floor(rng() * 86_400_000); // 24h in ms
  const jitter = Math.floor(rng() * 120_000); // add up to 2 minutes of jitter
  return new Date(dayStart.getTime() + offsetMs + jitter);
}

function sampleMetricValue(metric, device) {
  const profile = metricProfiles[metric]?.[device];
  if (!profile) return 0;
  const noise = (rng() - 0.5) * 2 * profile.spread;
  const raw = profile.base + noise;
  return Math.max(profile.min ?? 0, Number(raw.toFixed(metric === 'CLS' ? 3 : 2)));
}

function ratingFor(metric, value) {
  if (metric === 'CLS') {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }
  if (metric === 'LCP') {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }
  if (metric === 'INP') {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }
  if (metric === 'TTFB') {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }
  return 'needs-improvement';
}

function toDateTimeSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function formatDateTime64Utc(date) {
  const iso = date.toISOString(); // e.g., 2025-12-10T04:27:37.990Z
  const [day, timeWithMs] = iso.split('T');
  const time = timeWithMs.replace('Z', '');
  return `${day} ${time}`;
}

function buildEvents(projectId) {
  const now = new Date();
  const events = [];

  for (let dayOffset = 0; dayOffset < DAYS_TO_GENERATE; dayOffset++) {
    const dayStart = startOfDayUtc(new Date(now.getTime() - dayOffset * 86_400_000));

    for (const routeDef of ROUTES) {
      for (const device of DEVICES) {
        for (const metric of METRICS) {
          for (let i = 0; i < EVENTS_PER_COMBO; i++) {
            const path = randomItem(routeDef.paths);
            const recordedAt = randomTimeOnDay(dayStart);
            const value = sampleMetricValue(metric, device);

            events.push({
              project_id: projectId,
              session_id: randomUUID(),
              route: routeDef.route,
              path,
              device_type: device,
              metric_name: metric,
              metric_value: value,
              rating: ratingFor(metric, value),
              recorded_at: formatDateTime64Utc(recordedAt),
              ingested_at: formatDateTime64Utc(now)
            });
          }
        }
      }
    }
  }

  return events;
}

function extractRows(jsonResult) {
  if (!jsonResult) return [];
  if (Array.isArray(jsonResult)) return jsonResult;
  if (Array.isArray(jsonResult.data)) return jsonResult.data;
  return [];
}

async function ensureProject(client) {
  const existing = await client.query({
    query: 'SELECT id FROM projects WHERE id = {id:UUID} LIMIT 1',
    query_params: { id: DEMO_PROJECT_ID },
    format: 'JSONEachRow'
  });
  const existingRows = extractRows(await existing.json());
  if (existingRows.length > 0) {
    return;
  }

  await client.insert({
    table: 'projects',
    values: [
      {
        id: DEMO_PROJECT_ID,
        slug: DEMO_PROJECT_SLUG,
        name: DEMO_PROJECT_NAME,
        created_at: toDateTimeSeconds(new Date()),
        updated_at: toDateTimeSeconds(new Date())
      }
    ],
    format: 'JSONEachRow'
  });
}

async function countExistingEvents(client) {
  const response = await client.query({
    query: 'SELECT count() AS count FROM cwv_events WHERE project_id = {projectId:UUID}',
    query_params: { projectId: DEMO_PROJECT_ID },
    format: 'JSONEachRow'
  });
  const rows = extractRows(await response.json());
  const count = rows[0]?.count ?? 0;
  return typeof count === 'string' ? Number.parseInt(count, 10) : Number(count);
}

async function deleteExistingData(client) {
  await client.command({
    query: 'ALTER TABLE cwv_events DELETE WHERE project_id = {projectId:UUID}',
    query_params: { projectId: DEMO_PROJECT_ID }
  });
  await client.command({
    query: 'ALTER TABLE cwv_daily_aggregates DELETE WHERE project_id = {projectId:UUID}',
    query_params: { projectId: DEMO_PROJECT_ID }
  });
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const client = createClient({
  url: `http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`,
  database: CLICKHOUSE_DB,
  username: CLICKHOUSE_USER,
  password: CLICKHOUSE_PASSWORD
});

try {
  await client.query({ query: 'SELECT 1' });
} catch (error) {
  console.error('Unable to reach ClickHouse. Check CLICKHOUSE_* env vars.', error);
  await client.close();
  process.exit(1);
}

try {
  await ensureProject(client);

  const existingEvents = await countExistingEvents(client);
  if (existingEvents > 0 && !RESET_BEFORE_SEED) {
    console.log(
      `Demo data already present for project ${DEMO_PROJECT_SLUG} (${existingEvents} events). Skipping seeding.`
    );
    await client.close();
    process.exit(0);
  }

  if (existingEvents > 0 && RESET_BEFORE_SEED) {
    console.log(`Resetting existing demo data for project ${DEMO_PROJECT_SLUG} (${existingEvents} events)`);
    await deleteExistingData(client);
  }

  const events = buildEvents(DEMO_PROJECT_ID);
  const batches = chunk(events, 500);

  for (const batch of batches) {
    await client.insert({
      table: 'cwv_events',
      values: batch,
      format: 'JSONEachRow'
    });
  }

  console.log(
    `Seeded ${events.length} events over ${DAYS_TO_GENERATE} days for project ${DEMO_PROJECT_SLUG} (${DEMO_PROJECT_ID}).`
  );
} catch (error) {
  console.error('Seeding failed', error);
  process.exitCode = 1;
} finally {
  await client.close();
}
