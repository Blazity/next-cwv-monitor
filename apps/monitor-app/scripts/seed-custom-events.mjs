#!/usr/bin/env node
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createClient } from '@clickhouse/client';
import { faker } from '@faker-js/faker';
import { subDays } from 'date-fns';

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

const PROJECT_ID =
  process.env.CUSTOM_EVENTS_PROJECT_ID ?? process.env.SEED_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000';
const PROJECT_SLUG = process.env.CUSTOM_EVENTS_PROJECT_SLUG ?? process.env.SEED_PROJECT_SLUG ?? 'demo-project';
const PROJECT_NAME = process.env.CUSTOM_EVENTS_PROJECT_NAME ?? process.env.SEED_PROJECT_NAME ?? 'Next CWV Demo';

const TARGET_EVENTS = toPositiveInt(process.env.CUSTOM_EVENTS_COUNT, 1_000_000);
const DAYS_RANGE = toPositiveInt(process.env.CUSTOM_EVENTS_DAYS, 90);
const BATCH_SIZE = toPositiveInt(process.env.CUSTOM_EVENTS_BATCH_SIZE, 1000);
const SESSION_POOL_SIZE = toPositiveInt(
  process.env.CUSTOM_EVENTS_SESSIONS,
  Math.max(2000, Math.floor(TARGET_EVENTS / 5))
);
const RESET_BEFORE_SEED = process.env.CUSTOM_EVENTS_RESET !== 'true';
const RANDOM_SEED = Number.parseInt(process.env.CUSTOM_EVENTS_RANDOM_SEED ?? '7331', 10);

const ROUTES = [
  { route: '/', paths: ['/'], events: ['docs_view', 'copy_snippet', 'search', 'cta_signup', '$page_view'] },
  {
    route: '/docs',
    paths: ['/docs', '/docs/getting-started', '/docs/faq'],
    events: ['docs_view', 'copy_snippet', 'search', 'cta_signup', '$page_view']
  },
  {
    route: '/blog/[slug]',
    paths: ['/blog/core-web-vitals', '/blog/rendering-patterns', '/blog/edge-performance'],
    events: ['docs_view', 'copy_snippet', 'search', 'cta_signup', '$page_view']
  },
  {
    route: '/checkout',
    paths: ['/checkout', '/checkout/review', '/checkout/confirmation'],
    events: ['docs_view', 'copy_snippet', 'search', 'cta_signup', '$page_view']
  },
  {
    route: '/dashboard',
    paths: ['/dashboard', '/dashboard/overview', '/dashboard/events'],
    events: ['docs_view', 'copy_snippet', 'search', 'cta_signup', '$page_view']
  }
];

const DEVICES = ['desktop', 'mobile'];

function createRng(seed) {
  let t = seed + 1_831_565_813;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const rng = createRng(Number.isFinite(RANDOM_SEED) ? RANDOM_SEED : 42);

const SESSION_IDS = Array.from({ length: SESSION_POOL_SIZE }, () => randomUUID());

function randomItem(list) {
  return list[Math.floor(rng() * list.length)];
}

function randomTimeOnDay() {
  return faker.date.between({
    from: subDays(new Date(), 90),
    to: new Date()
  });
}
function formatDateTime64Utc(date) {
  const iso = date.toISOString();
  const [day, timeWithMs] = iso.split('T');
  const time = timeWithMs.replace('Z', '');
  return `${day} ${time}`;
}

function buildEvents(projectId) {
  const events = [];

  for (let i = 0; i < TARGET_EVENTS; i++) {
    const routeDef = randomItem(ROUTES);
    const recordedAt = formatDateTime64Utc(randomTimeOnDay());
    events.push({
      project_id: projectId,
      session_id: randomItem(SESSION_IDS),
      route: routeDef.route,
      path: randomItem(routeDef.paths),
      device_type: randomItem(DEVICES),
      event_name: randomItem(routeDef.events),
      recorded_at: recordedAt,
      ingested_at: recordedAt
    });
  }

  return events;
}

function extractRows(jsonResult) {
  if (!jsonResult) return [];
  if (Array.isArray(jsonResult)) return jsonResult;
  if (Array.isArray(jsonResult.data)) return jsonResult.data;
  return [];
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function ensureProject(client) {
  const existing = await client.query({
    query: 'SELECT id FROM projects WHERE id = {id:UUID} LIMIT 1',
    query_params: { id: PROJECT_ID },
    format: 'JSONEachRow'
  });
  const rows = extractRows(await existing.json());
  if (rows.length > 0) return;

  await client.insert({
    table: 'projects',
    values: [
      {
        id: PROJECT_ID,
        slug: PROJECT_SLUG,
        name: PROJECT_NAME,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      }
    ],
    format: 'JSONEachRow'
  });
}

async function countExistingEvents(client) {
  const response = await client.query({
    query: 'SELECT count() AS count FROM custom_events WHERE project_id = {projectId:UUID}',
    query_params: { projectId: PROJECT_ID },
    format: 'JSONEachRow'
  });
  const rows = extractRows(await response.json());
  const rawCount = rows[0]?.count ?? 0;
  const count = typeof rawCount === 'string' ? Number.parseInt(rawCount, 10) : Number(rawCount);
  return Number.isFinite(count) ? count : 0;
}

async function deleteExistingData(client) {
  await client.command({
    query: 'ALTER TABLE custom_events DELETE WHERE project_id = {projectId:UUID}',
    query_params: { projectId: PROJECT_ID }
  });
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

  const existingCount = await countExistingEvents(client);
  if (existingCount > 0 && RESET_BEFORE_SEED) {
    console.log(`Resetting existing custom_events for project ${PROJECT_SLUG} (${existingCount} rows) before seeding`);
    await deleteExistingData(client);
  }

  const remaining = RESET_BEFORE_SEED ? TARGET_EVENTS : Math.max(TARGET_EVENTS - existingCount, 0);
  if (remaining === 0) {
    console.log(
      `custom_events already has ${existingCount} rows for project ${PROJECT_SLUG}; target ${TARGET_EVENTS}. Nothing to do.`
    );
    await client.close();
    process.exit(0);
  }

  const events = buildEvents(PROJECT_ID).slice(0, remaining);
  const batches = chunk(events, BATCH_SIZE);

  for (const [index, batch] of batches.entries()) {
    await client.insert({
      table: 'custom_events',
      values: batch,
      format: 'JSONEachRow'
    });

    if ((index + 1) % 10 === 0 || index === batches.length - 1) {
      console.log(`Inserted batch ${index + 1}/${batches.length} (${batch.length} rows)`);
    }
  }

  console.log(
    `Seeded ${events.length} custom_events over the last ${DAYS_RANGE} days for project ${PROJECT_SLUG} (${PROJECT_ID}).`
  );
} catch (error) {
  console.error('Seeding custom_events failed', error);
  process.exitCode = 1;
} finally {
  await client.close();
}
