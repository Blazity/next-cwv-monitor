#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createClient } from "@clickhouse/client";

const {
  CLICKHOUSE_HOST = "localhost",
  CLICKHOUSE_PORT = "8123",
  CLICKHOUSE_DB = "cwv_monitor",
  CLICKHOUSE_USER = "default",
  CLICKHOUSE_PASSWORD = "",
} = process.env;

function toPositiveInt(raw, fallback) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const DEMO_PROJECT_ID = process.env.SEED_PROJECT_ID ?? "00000000-0000-0000-0000-000000000000";
const DEMO_PROJECT_SLUG = process.env.SEED_PROJECT_SLUG ?? "localhost";
const DEMO_PROJECT_NAME = process.env.SEED_PROJECT_NAME ?? "Next CWV Demo";
const DAYS_TO_GENERATE = toPositiveInt(process.env.SEED_DAYS, 14);
const EVENTS_PER_COMBO = toPositiveInt(process.env.SEED_EVENTS_PER_COMBO, 3);
const RESET_BEFORE_SEED = process.env.SEED_RESET === "true";
const RANDOM_SEED = Number.parseInt(process.env.SEED_RANDOM_SEED ?? "42", 10);

const METRICS = ["LCP", "CLS", "INP", "TTFB"];
const ROUTES = [
  { route: "/", paths: ["/"] },
  { route: "/docs", paths: ["/docs", "/docs/getting-started"] },
  { route: "/blog/[slug]", paths: ["/blog/core-web-vitals", "/blog/rendering-patterns"] },
  { route: "/checkout", paths: ["/checkout", "/checkout/review"] },
];
const DEVICES = ["desktop", "mobile"];

const metricProfiles = {
  LCP: {
    desktop: { base: 2300, spread: 1200 },
    mobile: { base: 2800, spread: 1400 },
  },
  CLS: {
    desktop: { base: 0.08, spread: 0.08, min: 0 },
    mobile: { base: 0.12, spread: 0.08, min: 0 },
  },
  INP: {
    desktop: { base: 190, spread: 160 },
    mobile: { base: 260, spread: 200 },
  },
  TTFB: {
    desktop: { base: 450, spread: 320 },
    mobile: { base: 600, spread: 380 },
  },
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
  return Math.max(profile.min ?? 0, Number(raw.toFixed(metric === "CLS" ? 3 : 2)));
}

function ratingFor(metric, value) {
  if (metric === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }
  if (metric === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }
  if (metric === "INP") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs-improvement";
    return "poor";
  }
  if (metric === "TTFB") {
    if (value <= 800) return "good";
    if (value <= 1800) return "needs-improvement";
    return "poor";
  }
  return "needs-improvement";
}

function toDateTimeSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function formatDateTime64Utc(date) {
  const iso = date.toISOString(); // e.g., 2025-12-10T04:27:37.990Z
  const [day, timeWithMs] = iso.split("T");
  const time = timeWithMs.replace("Z", "");
  return `${day} ${time}`;
}

function parseArgs(argv) {
  const args = new Set(argv);
  const seedCustomEvents = !args.has("--no-custom-events");
  const seedCwvEvents = !args.has("--custom-events-only");
  return { seedCwvEvents, seedCustomEvents };
}

function buildEvents(projectId) {
  const now = new Date();
  const cwvEvents = [];
  const pageViewEvents = [];

  for (let dayOffset = 0; dayOffset < DAYS_TO_GENERATE; dayOffset++) {
    const dayStart = startOfDayUtc(new Date(now.getTime() - dayOffset * 86_400_000));

    for (const routeDef of ROUTES) {
      for (const device of DEVICES) {
        for (let i = 0; i < EVENTS_PER_COMBO; i++) {
          const path = randomItem(routeDef.paths);
          const recordedAt = randomTimeOnDay(dayStart);
          const sessionId = randomUUID();

          pageViewEvents.push({
            project_id: projectId,
            session_id: sessionId,
            route: routeDef.route,
            path,
            device_type: device,
            event_name: "$page_view",
            recorded_at: formatDateTime64Utc(recordedAt),
            ingested_at: formatDateTime64Utc(now),
          });

          for (const metric of METRICS) {
            const value = sampleMetricValue(metric, device);

            cwvEvents.push({
              project_id: projectId,
              session_id: sessionId,
              route: routeDef.route,
              path,
              device_type: device,
              metric_name: metric,
              metric_value: value,
              rating: ratingFor(metric, value),
              recorded_at: formatDateTime64Utc(recordedAt),
              ingested_at: formatDateTime64Utc(now),
            });
          }
        }
      }
    }
  }

  return { cwvEvents, pageViewEvents };
}

function extractRows(jsonResult) {
  if (!jsonResult) return [];
  if (Array.isArray(jsonResult)) return jsonResult;
  if (Array.isArray(jsonResult.data)) return jsonResult.data;
  return [];
}

async function ensureProject(client, { projectId, projectSlug, projectName }) {
  const existing = await client.query({
    query: "SELECT id FROM projects WHERE id = {id:UUID} LIMIT 1",
    query_params: { id: projectId },
    format: "JSONEachRow",
  });
  const existingRows = extractRows(await existing.json());
  if (existingRows.length > 0) {
    return;
  }

  await client.insert({
    table: "projects",
    values: [
      {
        id: projectId,
        slug: projectSlug,
        name: projectName,
        created_at: toDateTimeSeconds(new Date()),
        updated_at: toDateTimeSeconds(new Date()),
      },
    ],
    format: "JSONEachRow",
  });
}

async function countExistingEvents(client) {
  const response = await client.query({
    query: "SELECT count() AS count FROM cwv_events WHERE project_id = {projectId:UUID}",
    query_params: { projectId: DEMO_PROJECT_ID },
    format: "JSONEachRow",
  });
  const rows = extractRows(await response.json());
  const count = rows[0]?.count ?? 0;
  return typeof count === "string" ? Number.parseInt(count, 10) : Number(count);
}

async function countExistingPageViews(client) {
  const response = await client.query({
    query:
      "SELECT count() AS count FROM custom_events WHERE project_id = {projectId:UUID} AND event_name = '$page_view'",
    query_params: { projectId: DEMO_PROJECT_ID },
    format: "JSONEachRow",
  });
  const rows = extractRows(await response.json());
  const count = rows[0]?.count ?? 0;
  return typeof count === "string" ? Number.parseInt(count, 10) : Number(count);
}

async function buildPageViewsFromCwvEvents(client) {
  const response = await client.query({
    query: `
      SELECT
        session_id,
        any(route) AS route,
        any(path) AS path,
        any(device_type) AS device_type,
        min(recorded_at) AS recorded_at
      FROM cwv_events
      WHERE project_id = {projectId:UUID}
      GROUP BY session_id
    `,
    query_params: { projectId: DEMO_PROJECT_ID },
    format: "JSONEachRow",
  });

  const rows = extractRows(await response.json());
  return rows.map((row) => {
    const recordedAt = row.recorded_at ?? new Date().toISOString();
    return {
      project_id: DEMO_PROJECT_ID,
      session_id: row.session_id,
      route: row.route,
      path: row.path,
      device_type: row.device_type,
      event_name: "$page_view",
      recorded_at: recordedAt,
      ingested_at: recordedAt,
    };
  });
}

async function deleteExistingData(client) {
  await client.command({
    query: "ALTER TABLE cwv_events DELETE WHERE project_id = {projectId:UUID}",
    query_params: { projectId: DEMO_PROJECT_ID },
  });
  await client.command({
    query: "ALTER TABLE cwv_daily_aggregates DELETE WHERE project_id = {projectId:UUID}",
    query_params: { projectId: DEMO_PROJECT_ID },
  });
  await client.command({
    query: "ALTER TABLE custom_events DELETE WHERE project_id = {projectId:UUID}",
    query_params: { projectId: DEMO_PROJECT_ID },
  });
}

async function seedCustomEventsData(client) {
  const { faker } = await import("@faker-js/faker");
  const { subDays } = await import("date-fns");

  const PROJECT_ID = process.env.CUSTOM_EVENTS_PROJECT_ID ?? DEMO_PROJECT_ID;
  const PROJECT_SLUG = process.env.CUSTOM_EVENTS_PROJECT_SLUG ?? DEMO_PROJECT_SLUG;
  const PROJECT_NAME = process.env.CUSTOM_EVENTS_PROJECT_NAME ?? DEMO_PROJECT_NAME;

  const TARGET_EVENTS = toPositiveInt(process.env.CUSTOM_EVENTS_COUNT, 1_000_000);
  const DAYS_RANGE = toPositiveInt(process.env.CUSTOM_EVENTS_DAYS, 90);
  const BATCH_SIZE = toPositiveInt(process.env.CUSTOM_EVENTS_BATCH_SIZE, 1000);
  const SESSION_POOL_SIZE = toPositiveInt(
    process.env.CUSTOM_EVENTS_SESSIONS,
    Math.max(2000, Math.floor(TARGET_EVENTS / 5)),
  );
  const RESET_BEFORE_SEED = process.env.CUSTOM_EVENTS_RESET === "true";
  const RANDOM_SEED = Number.parseInt(process.env.CUSTOM_EVENTS_RANDOM_SEED ?? "7331", 10);

  const ROUTES_FOR_CUSTOM_EVENTS = [
    { route: "/", paths: ["/"], events: ["docs_view", "copy_snippet", "search", "cta_signup", "$page_view"] },
    {
      route: "/docs",
      paths: ["/docs", "/docs/getting-started", "/docs/faq"],
      events: ["docs_view", "copy_snippet", "search", "cta_signup", "$page_view"],
    },
    {
      route: "/blog/[slug]",
      paths: ["/blog/core-web-vitals", "/blog/rendering-patterns", "/blog/edge-performance"],
      events: ["docs_view", "copy_snippet", "search", "cta_signup", "$page_view"],
    },
    {
      route: "/checkout",
      paths: ["/checkout", "/checkout/review", "/checkout/confirmation"],
      events: ["docs_view", "copy_snippet", "search", "cta_signup", "$page_view"],
    },
    {
      route: "/dashboard",
      paths: ["/dashboard", "/dashboard/overview", "/dashboard/events"],
      events: ["docs_view", "copy_snippet", "search", "cta_signup", "$page_view"],
    },
  ];

  const rngForCustomEvents = createRng(Number.isFinite(RANDOM_SEED) ? RANDOM_SEED : 42);
  const SESSION_IDS = Array.from({ length: SESSION_POOL_SIZE }, () => randomUUID());

  function randomCustomItem(list) {
    return list[Math.floor(rngForCustomEvents() * list.length)];
  }

  function randomTimeOnDay() {
    return faker.date.between({
      from: subDays(new Date(), DAYS_RANGE),
      to: new Date(),
    });
  }

  function buildCustomEvents(remaining) {
    const events = [];

    for (let i = 0; i < remaining; i++) {
      const routeDef = randomCustomItem(ROUTES_FOR_CUSTOM_EVENTS);
      const recordedAt = formatDateTime64Utc(randomTimeOnDay());
      events.push({
        project_id: PROJECT_ID,
        session_id: randomCustomItem(SESSION_IDS),
        route: routeDef.route,
        path: randomCustomItem(routeDef.paths),
        device_type: randomCustomItem(DEVICES),
        event_name: randomCustomItem(routeDef.events),
        recorded_at: recordedAt,
        ingested_at: recordedAt,
      });
    }

    return events;
  }

  await ensureProject(client, {
    projectId: PROJECT_ID,
    projectSlug: PROJECT_SLUG,
    projectName: PROJECT_NAME,
  });

  const response = await client.query({
    query: "SELECT count() AS count FROM custom_events WHERE project_id = {projectId:UUID}",
    query_params: { projectId: PROJECT_ID },
    format: "JSONEachRow",
  });
  const rows = extractRows(await response.json());
  const rawCount = rows[0]?.count ?? 0;
  const existingCount = typeof rawCount === "string" ? Number.parseInt(rawCount, 10) : Number(rawCount);

  if (existingCount > 0 && RESET_BEFORE_SEED) {
    console.log(`Resetting existing custom_events for project ${PROJECT_NAME} (${existingCount} rows) before seeding`);
    await client.command({
      query: "ALTER TABLE custom_events DELETE WHERE project_id = {projectId:UUID}",
      query_params: { projectId: PROJECT_ID },
    });
  }

  const finalExistingCount = RESET_BEFORE_SEED ? 0 : existingCount;
  const remaining = RESET_BEFORE_SEED ? TARGET_EVENTS : Math.max(TARGET_EVENTS - finalExistingCount, 0);
  if (remaining === 0) {
    console.log(
      `custom_events already has ${existingCount} rows for project ${PROJECT_NAME}; target ${TARGET_EVENTS}. Nothing to do.`,
    );
    return;
  }

  const events = buildCustomEvents(remaining);
  const batches = chunk(events, BATCH_SIZE);

  for (const [index, batch] of batches.entries()) {
    await client.insert({
      table: "custom_events",
      values: batch,
      format: "JSONEachRow",
    });

    if ((index + 1) % 10 === 0 || index === batches.length - 1) {
      console.log(`Inserted custom_events batch ${index + 1}/${batches.length} (${batch.length} rows)`);
    }
  }

  console.log(
    `Seeded ${events.length} custom_events over the last ${DAYS_RANGE} days for project ${PROJECT_NAME} (${PROJECT_ID}).`,
  );
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
  password: CLICKHOUSE_PASSWORD,
});

export async function seedDemoData({ seedCwvEvents = true, seedCustomEvents = false } = {}) {
  try {
    await client.query({ query: "SELECT 1" });
  } catch (error) {
    console.error("Unable to reach ClickHouse. Check CLICKHOUSE_* env vars.", error);
    await client.close();
    process.exit(1);
  }

  try {
    if (seedCwvEvents) {
      await ensureProject(client, {
        projectId: DEMO_PROJECT_ID,
        projectSlug: DEMO_PROJECT_SLUG,
        projectName: DEMO_PROJECT_NAME,
      });

      const existingEvents = await countExistingEvents(client);
      if (existingEvents > 0 && !RESET_BEFORE_SEED) {
        const existingPageViews = await countExistingPageViews(client);
        if (existingPageViews === 0) {
          const pageViewEvents = await buildPageViewsFromCwvEvents(client);
          const batches = chunk(pageViewEvents, 1000);
          for (const [index, batch] of batches.entries()) {
            await client.insert({
              table: "custom_events",
              values: batch,
              format: "JSONEachRow",
            });

            if ((index + 1) % 20 === 0 || index === batches.length - 1) {
              console.log(`Inserted page_view batch ${index + 1}/${batches.length} (${batch.length} rows)`);
            }
          }
        }

        console.log(
          `Demo data already present for project ${DEMO_PROJECT_NAME} (${existingEvents} events). Skipping seeding.`,
        );
      } else {
        if (existingEvents > 0 && RESET_BEFORE_SEED) {
          console.log(`Resetting existing demo data for project ${DEMO_PROJECT_NAME} (${existingEvents} events)`);
          await deleteExistingData(client);
        }

        const { cwvEvents, pageViewEvents } = buildEvents(DEMO_PROJECT_ID);
        const cwvBatches = chunk(cwvEvents, 500);

        for (const batch of cwvBatches) {
          await client.insert({
            table: "cwv_events",
            values: batch,
            format: "JSONEachRow",
          });
        }

        const pageViewBatches = chunk(pageViewEvents, 1000);
        for (const batch of pageViewBatches) {
          await client.insert({
            table: "custom_events",
            values: batch,
            format: "JSONEachRow",
          });
        }

        console.log(
          `Seeded ${cwvEvents.length} events and ${pageViewEvents.length} page_view events over ${DAYS_TO_GENERATE} days for project ${DEMO_PROJECT_NAME} (${DEMO_PROJECT_ID}).`,
        );
      }
    }

    if (seedCustomEvents) {
      await seedCustomEventsData(client);
    }
  } catch (error) {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

const isCliInvocation = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliInvocation) {
  const { seedCwvEvents, seedCustomEvents } = parseArgs(process.argv.slice(2));
  await seedDemoData({ seedCwvEvents, seedCustomEvents });
}
