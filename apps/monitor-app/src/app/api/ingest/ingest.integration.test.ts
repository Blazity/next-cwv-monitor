import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { NextRequest } from "next/server";
import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";

import type { InsertableProjectRow } from "@/app/server/lib/clickhouse/schema";
import { ipRateLimiter } from "@/app/server/lib/rate-limit";
import { setupClickHouseContainer, wait } from "@/test/clickhouse-test-utils";

let container: StartedTestContainer;
let POST: typeof import("./route").POST;
let OPTIONS: typeof import("./route").OPTIONS;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let fetchEvents: typeof import("@/app/server/lib/clickhouse/repositories/events-repository").fetchEvents;
let fetchCustomEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchCustomEvents;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;

function buildRequest(
  body: Record<string, unknown> | string,
  headers: Record<string, string> = {},
  method: "POST" | "OPTIONS" = "POST",
) {
  return new NextRequest("http://localhost/api/ingest", {
    method,
    body: method === 'OPTIONS' ? null : (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "x-forwarded-for": headers["x-forwarded-for"] ?? "203.0.113.14",
      "user-agent": headers["user-agent"] ?? "Mozilla/5.0 Vitest",
      ...headers,
    },
  });
}

async function waitForPersistedEvents(
  projectId: string,
  expectedCount: number,
  options?: { limit?: number; timeoutMs?: number },
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

async function waitForPersistedCustomEvents(
  projectId: string,
  expectedCount: number,
  options?: { limit?: number; timeoutMs?: number },
) {
  const limit = Math.max(expectedCount, options?.limit ?? 10);
  const timeoutMs = options?.timeoutMs ?? 2000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const rows = await fetchCustomEvents({ projectId, limit });
    if (rows.length >= expectedCount) {
      return rows;
    }
    await wait(50);
  }

  throw new Error(`Timed out waiting for ${expectedCount} custom events for project ${projectId}`);
}

describe("POST /api/ingest integration", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ POST, OPTIONS } = await import("./route"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ fetchEvents } = await import("@/app/server/lib/clickhouse/repositories/events-repository"));
    ({ fetchCustomEvents } = await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));
    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await ipRateLimiter.reset();
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE custom_events`.command();
  });

  it("ingests events and persists them in ClickHouse", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "Test Project",
    };
    await createProject(project);

    const recordedAt = new Date().toISOString();

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events: [
          {
            sessionId: "session-1",
            route: "/about",
            path: "/about",
            metric: "CLS",
            value: 0.02,
            rating: "needs-improvement",
            recordedAt,
          },
        ],
      }),
    );

    expect(response.status).toBe(204);

    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.route).toBe("/about");
    expect(stored[0]?.path).toBe("/about");
    expect(stored[0]?.metric_name).toBe("CLS");
    expect(stored[0]?.rating).toBe("needs-improvement");
    expect(stored[0]?.device_type).toBe("desktop");
  });

  it("ingests custom events and persists them in ClickHouse", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "Custom Events Project",
    };
    await createProject(project);

    const recordedAt = new Date().toISOString();

    const response = await POST(
      buildRequest({
        projectId: project.id,
        customEvents: [
          {
            sessionId: "session-1",
            route: "/checkout",
            path: "/checkout",
            name: "purchase",
            recordedAt,
          },
        ],
      }),
    );

    expect(response.status).toBe(204);

    const stored = await waitForPersistedCustomEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.route).toBe("/checkout");
    expect(stored[0]?.path).toBe("/checkout");
    expect(stored[0]?.event_name).toBe("purchase");
    expect(stored[0]?.device_type).toBe("desktop");
  });

  it("returns 404 when project does not exist", async () => {
    const response = await POST(
      buildRequest({
        projectId: randomUUID(),
        events: [
          {
            route: "/",
            metric: "CLS",
            value: 0.1,
            rating: "good",
          },
        ],
      }),
    );

    expect(response.status).toBe(404);
  });

  it("ingests multiple events in a single batch", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "Batch Project",
    };
    await createProject(project);

    const events = Array.from({ length: 5 }).map((_, index) => ({
      sessionId: `session-${index}`,
      route: `/docs/${index}`,
      metric: "INP",
      value: 120 + index,
      rating: "poor",
    }));

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events,
      }),
    );

    expect(response.status).toBe(204);

    const stored = await waitForPersistedEvents(project.id, events.length, { limit: 10 });
    expect(stored).toHaveLength(events.length);
  });

  it("fills defaults for optional fields when missing", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "Defaults Project",
    };
    await createProject(project);

    const response = await POST(
      buildRequest({
        projectId: project.id,
        events: [
          {
            metric: "TTFB",
            value: 75,
            rating: "good",
          },
        ],
      }),
    );

    expect(response.status).toBe(204);
    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
    const event = stored[0]!;
    expect(typeof event.session_id).toBe("string");
    expect(event.route).toBe("/");
    expect(event.path).toBe("/");
    expect(new Date(event.recorded_at).getTime()).toBeGreaterThan(0);
    expect(new Date(event.ingested_at).getTime()).toBeGreaterThan(0);
  });

  it("rejects invalid JSON payloads", async () => {
    const response = await POST(buildRequest("{"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid JSON payload" });
  });

  it("rejects schema violations before hitting ClickHouse", async () => {
    const response = await POST(
      buildRequest({
        projectId: "not-a-uuid",
        events: [
          {
            route: "/",
            metric: "CLS",
            value: 0.1,
            rating: "good",
          },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("issues");
  });

  it("rejects requests without events", async () => {
    const response = await POST(
      buildRequest({
        projectId: randomUUID(),
        events: [],
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "No events provided" });
  });

  it("enforces per-IP rate limits", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "Rate Limited",
    };
    await createProject(project);

    const ip = "198.51.100.200";
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: project.id,
          events: [
            {
              route: "/",
              metric: "CLS",
              value: 0.1,
              rating: "good",
            },
          ],
        },
        { "x-forwarded-for": ip },
      ),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  it("ignores rate limits when client IP is null", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "localhost",
      name: "No IP",
    };
    await createProject(project);

    // If the code ever falls back to 0.0.0.0 (or any placeholder), this request would be rate-limited.
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check("0.0.0.0");
    }

    const response = await POST(
      buildRequest(
        {
          projectId: project.id,
          events: [
            {
              route: "/",
              metric: "CLS",
              value: 0.1,
              rating: "good",
            },
          ],
        },
        // Empty forwarded-for means "no usable IP" while still allowing other tests to use the default.
        { "x-forwarded-for": "" },
      ),
    );

    expect(response.status).toBe(204);
    const stored = await waitForPersistedEvents(project.id, 1, { limit: 10 });
    expect(stored).toHaveLength(1);
  });

  it("uses the first x-forwarded-for entry for rate limiting", async () => {
    const ip = "198.51.100.201";
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: "/",
              metric: "CLS",
              value: 0.1,
              rating: "good",
            },
          ],
        },
        { "x-forwarded-for": `${ip}, 10.0.0.1` },
      ),
    );

    expect(response.status).toBe(429);
  });

  it("uses x-real-ip when x-forwarded-for is missing", async () => {
    const ip = "198.51.100.202";
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: "/",
              metric: "CLS",
              value: 0.1,
              rating: "good",
            },
          ],
        },
        { "x-forwarded-for": "", "x-real-ip": ip },
      ),
    );

    expect(response.status).toBe(429);
  });

  it("uses cf-connecting-ip when x-forwarded-for and x-real-ip are missing", async () => {
    const ip = "198.51.100.203";
    for (let i = 0; i < 1000; i++) {
      await ipRateLimiter.check(ip);
    }

    const response = await POST(
      buildRequest(
        {
          projectId: randomUUID(),
          events: [
            {
              route: "/",
              metric: "CLS",
              value: 0.1,
              rating: "good",
            },
          ],
        },
        { "x-forwarded-for": "", "cf-connecting-ip": ip },
      ),
    );

    expect(response.status).toBe(429);
  });

  it("responds to OPTIONS preflight with mirrored CORS headers", async () => {
    const testOrigin = 'https://example.com';
  
    const req = buildRequest({}, { 'origin': testOrigin }, 'OPTIONS');
  
    const res = await OPTIONS(req);
    
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(testOrigin);
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
    expect(res.headers.get('vary')).toBe('Origin');
  });

  it("authorizes subdomains using wildcard domains", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "*.test.com",
      name: "Wildcard Project",
    };
    await createProject(project);

    const response = await POST(
      buildRequest(
        { projectId: project.id, events: [{ metric: "LCP", value: 2000, rating: "good" }] },
        { origin: "https://sub.test.com" },
      ),
    );

    expect(response.status).toBe(204);
  });

  it("rejects subdomains if wildcard is not present", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "test.com",
      name: "Wildcard Project",
    };
    await createProject(project);

    const response = await POST(
      buildRequest(
        { projectId: project.id, events: [{ metric: "LCP", value: 2000, rating: "good" }] },
        { origin: "https://sub.test.com" },
      ),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Origin not authorized");
  });

  it("rejects mismatching domains", async () => {
    const project: InsertableProjectRow = {
      id: randomUUID(),
      domain: "example.com",
      name: "Wildcard Project",
    };
    await createProject(project);

    const response = await POST(
      buildRequest(
        { projectId: project.id, events: [{ metric: "LCP", value: 2000, rating: "good" }] },
        { origin: "http://malicious-site.com" },
      ),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Origin not authorized");
  });
});
