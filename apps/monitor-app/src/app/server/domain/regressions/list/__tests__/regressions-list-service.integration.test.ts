import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { optimizeAggregates, setupClickHouseContainer } from "@/test/clickhouse-test-utils";

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-utils", () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
}));

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let insertEvents: typeof import("@/app/server/lib/clickhouse/repositories/events-repository").insertEvents;
let insertCustomEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").insertCustomEvents;
let RegressionsListService: typeof import("../service").RegressionsListService;

describe("regressions-list-service (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ insertEvents } = await import("@/app/server/lib/clickhouse/repositories/events-repository"));
    ({ insertCustomEvents } = await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));
    ({ RegressionsListService } = await import("../service"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE cwv_daily_aggregates`.command();
    await sql`TRUNCATE TABLE custom_events`.command();

    getAuthorizedSessionMock.mockReset();
    getAuthorizedSessionMock.mockResolvedValue({
      session: {
        id: "test-session-id",
        userId: "test-user-id",
        token: "test-token",
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("lists regressions with previous/current P75, summary stats, and tracked views (range + device filters applied)", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: "regressions-int", name: "Regressions Integration" });

    const day4 = new Date();
    day4.setUTCHours(12, 0, 0, 0);
    const day3 = new Date(day4);
    day3.setUTCDate(day3.getUTCDate() - 1);
    const day2 = new Date(day3);
    day2.setUTCDate(day2.getUTCDate() - 1);
    const day1 = new Date(day2);
    day1.setUTCDate(day1.getUTCDate() - 1);

    const rangeStart = new Date(day3);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(day4);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const customEvents = [];
    const cwvEvents = [];

    // Previous period: day1 + day2
    // Current period: day3 + day4
    const routes = [
      { route: "/a", previous: { LCP: 1000, INP: 100 }, current: { LCP: 1500, INP: 150 }, views: 10 },
      { route: "/b", previous: { LCP: 2000 }, current: { LCP: 5000 }, views: 5 },
    ] as const;

    for (const { route, previous, current, views } of routes) {
      for (const recordedAt of [day1, day2]) {
        for (const [metric, value] of Object.entries(previous)) {
          cwvEvents.push({
            project_id: projectId,
            session_id: `prev-${route}-${metric}-${recordedAt.toISOString()}`,
            route,
            path: route,
            device_type: "desktop" as const,
            metric_name: metric as "LCP" | "INP",
            metric_value: value,
            rating: "good",
            recorded_at: recordedAt,
          });
        }
      }

      for (const recordedAt of [day3, day4]) {
        for (let i = 0; i < views; i++) {
          const sessionId = `pv-${route}-${recordedAt.toISOString()}-${i}`;
          customEvents.push({
            project_id: projectId,
            session_id: sessionId,
            route,
            path: route,
            device_type: "desktop" as const,
            event_name: "$page_view",
            recorded_at: recordedAt,
          });
        }

        for (const [metric, value] of Object.entries(current)) {
          cwvEvents.push({
            project_id: projectId,
            session_id: `cur-${route}-${metric}-${recordedAt.toISOString()}`,
            route,
            path: route,
            device_type: "desktop" as const,
            metric_name: metric as "LCP" | "INP",
            metric_value: value,
            rating: "good",
            recorded_at: recordedAt,
          });
        }
      }
    }

    // Mobile noise that should not affect desktop-filtered queries.
    cwvEvents.push({
      project_id: projectId,
      session_id: "mobile-b-lcp",
      route: "/b",
      path: "/b",
      device_type: "mobile" as const,
      metric_name: "LCP" as const,
      metric_value: 30_000,
      rating: "good",
      recorded_at: day4,
    });

    await insertCustomEvents(customEvents);
    await insertEvents(cwvEvents);
    await optimizeAggregates(sql);

    const service = new RegressionsListService();
    const result = await service.list({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: "desktop",
      search: undefined,
      metric: "all",
      sort: { field: "change", direction: "desc" },
      page: { limit: 50, offset: 0 },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.summary.totalRegressions).toBe(3);
    expect(result.data.summary.criticalRegressions).toBe(1); // /b LCP is poor (> 4000)
    expect(result.data.summary.avgDegradationPct).not.toBeNull();
    expect(result.data.summary.avgDegradationPct ?? 0).toBeCloseTo(83.333, 2);

    const items = result.data.items;
    expect(items.map((r) => `${r.route}:${r.metricName}`)).toEqual(["/b:LCP", "/a:LCP", "/a:INP"]);

    expect(items[0]?.views).toBe(10); // /b views per day * 2 days
    expect(items[1]?.views).toBe(20); // /a views per day * 2 days
  });

  it("supports metric + route search filters", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: "regressions-search", name: "Regressions Search" });

    const day2 = new Date();
    day2.setUTCHours(12, 0, 0, 0);
    const day1 = new Date(day2);
    day1.setUTCDate(day1.getUTCDate() - 1);

    const rangeStart = new Date(day2);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(day2);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    await insertCustomEvents([
      {
        project_id: projectId,
        session_id: "pv-a",
        route: "/blog/[slug]",
        path: "/blog/hello",
        device_type: "desktop",
        event_name: "$page_view",
        recorded_at: day2,
      },
    ]);

    await insertEvents([
      // Previous
      {
        project_id: projectId,
        session_id: "prev-a",
        route: "/blog/[slug]",
        path: "/blog/hello",
        device_type: "desktop",
        metric_name: "LCP",
        metric_value: 1000,
        rating: "good",
        recorded_at: day1,
      },
      // Current
      {
        project_id: projectId,
        session_id: "cur-a",
        route: "/blog/[slug]",
        path: "/blog/hello",
        device_type: "desktop",
        metric_name: "LCP",
        metric_value: 2000,
        rating: "good",
        recorded_at: day2,
      },
    ]);
    await optimizeAggregates(sql);

    const service = new RegressionsListService();
    const result = await service.list({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: "desktop",
      search: "BLOG",
      metric: "LCP",
      sort: { field: "route", direction: "asc" },
      page: { limit: 10, offset: 0 },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.summary.baseTotalRegressions).toBe(1);
    expect(result.data.summary.totalRegressions).toBe(1);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]?.route).toBe("/blog/[slug]");
    expect(result.data.items[0]?.metricName).toBe("LCP");
  });
});
