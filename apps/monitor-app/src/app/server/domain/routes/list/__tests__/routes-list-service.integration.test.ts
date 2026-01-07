import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";

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
let RoutesListService: typeof import("../service").RoutesListService;

describe("routes-list-service (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ insertEvents } = await import("@/app/server/lib/clickhouse/repositories/events-repository"));
    ({ insertCustomEvents } = await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));
    ({ RoutesListService } = await import("../service"));
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

  it("lists routes with views, metric value, and status distribution (range + device filters applied)", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: "routes-list-int", name: "Routes List Integration" });

    const day2 = new Date();
    day2.setUTCHours(12, 0, 0, 0);
    const day1 = new Date(day2);
    day1.setUTCDate(day1.getUTCDate() - 1);

    const rangeStart = new Date(day1);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(day2);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const routes = [
      { route: "/good", lcp: 2000, viewsPerDay: 10, expectedStatus: "good" as const },
      { route: "/needs", lcp: 3000, viewsPerDay: 5, expectedStatus: "needs-improvement" as const },
      { route: "/poor", lcp: 5000, viewsPerDay: 2, expectedStatus: "poor" as const },
    ];

    const customEvents = [];
    const cwvEvents = [];

    for (const { route, lcp, viewsPerDay } of routes) {
      for (const recordedAt of [day1, day2]) {
        for (let i = 0; i < viewsPerDay; i++) {
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

          // Duplicate for one session to ensure views are distinct session_id, not raw row count.
          if (i === 0) {
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

          cwvEvents.push({
            project_id: projectId,
            session_id: sessionId,
            route,
            path: route,
            device_type: "desktop" as const,
            metric_name: "LCP" as const,
            metric_value: lcp,
            rating: "good",
            recorded_at: recordedAt,
          });
        }
      }
    }

    // Mobile noise that should not affect desktop-filtered queries.
    for (let i = 0; i < 50; i++) {
      const sessionId = `mobile-/good-${i}`;
      customEvents.push({
        project_id: projectId,
        session_id: sessionId,
        route: "/good",
        path: "/good",
        device_type: "mobile" as const,
        event_name: "$page_view",
        recorded_at: day2,
      });

      cwvEvents.push({
        project_id: projectId,
        session_id: sessionId,
        route: "/good",
        path: "/good",
        device_type: "mobile" as const,
        metric_name: "LCP" as const,
        metric_value: 9000,
        rating: "good",
        recorded_at: day2,
      });
    }

    await insertCustomEvents(customEvents);
    await insertEvents(cwvEvents);
    await optimizeAggregates(sql);

    const service = new RoutesListService();
    const result = await service.list({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: "desktop",
      search: undefined,
      metricName: "LCP",
      percentile: "p75",
      sort: { field: "views", direction: "desc" },
      page: { limit: 10, offset: 0 },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.totalRoutes).toBe(3);
    expect(result.data.statusDistribution).toEqual({
      good: 1,
      "needs-improvement": 1,
      poor: 1,
    });

    expect(result.data.items.map((r) => r.route)).toEqual(["/good", "/needs", "/poor"]);

    const good = result.data.items.find((r) => r.route === "/good");
    expect(good?.views).toBe(20); // 2 days * 10 distinct session_ids
    expect(good?.metricSampleSize).toBe(20);
    expect(good?.status).toBe("good");

    const needs = result.data.items.find((r) => r.route === "/needs");
    expect(needs?.views).toBe(10);
    expect(needs?.status).toBe("needs-improvement");

    const poor = result.data.items.find((r) => r.route === "/poor");
    expect(poor?.views).toBe(4);
    expect(poor?.status).toBe("poor");
  });

  it("falls back to CWV aggregates when $page_view events are missing", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: "routes-list-fallback", name: "Routes List Fallback" });

    const day2 = new Date();
    day2.setUTCHours(12, 0, 0, 0);
    const day1 = new Date(day2);
    day1.setUTCDate(day1.getUTCDate() - 1);

    const rangeStart = new Date(day1);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(day2);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const routes = [
      { route: "/good", lcp: 2000, viewsPerDay: 10, expectedStatus: "good" as const },
      { route: "/needs", lcp: 3000, viewsPerDay: 5, expectedStatus: "needs-improvement" as const },
      { route: "/poor", lcp: 5000, viewsPerDay: 2, expectedStatus: "poor" as const },
    ];

    const cwvEvents = [];

    for (const { route, lcp, viewsPerDay } of routes) {
      for (const recordedAt of [day1, day2]) {
        for (let i = 0; i < viewsPerDay; i++) {
          const sessionId = `cwv-${route}-${recordedAt.toISOString()}-${i}`;
          cwvEvents.push({
            project_id: projectId,
            session_id: sessionId,
            route,
            path: route,
            device_type: "desktop" as const,
            metric_name: "LCP" as const,
            metric_value: lcp,
            rating: "good",
            recorded_at: recordedAt,
          });
        }
      }
    }

    await insertEvents(cwvEvents);
    await optimizeAggregates(sql);

    const service = new RoutesListService();
    const result = await service.list({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: "desktop",
      search: undefined,
      metricName: "LCP",
      percentile: "p75",
      sort: { field: "views", direction: "desc" },
      page: { limit: 10, offset: 0 },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.totalRoutes).toBe(3);
    expect(result.data.statusDistribution).toEqual({
      good: 1,
      "needs-improvement": 1,
      poor: 1,
    });

    expect(result.data.items.map((r) => r.route)).toEqual(["/good", "/needs", "/poor"]);

    const good = result.data.items.find((r) => r.route === "/good");
    expect(good?.views).toBe(0);
    expect(good?.metricSampleSize).toBe(20);
    expect(good?.status).toBe("good");

    const needs = result.data.items.find((r) => r.route === "/needs");
    expect(needs?.views).toBe(0);
    expect(needs?.metricSampleSize).toBe(10);
    expect(needs?.status).toBe("needs-improvement");

    const poor = result.data.items.find((r) => r.route === "/poor");
    expect(poor?.views).toBe(0);
    expect(poor?.metricSampleSize).toBe(4);
    expect(poor?.status).toBe("poor");
  });

  it("supports route search (case-insensitive substring)", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: "routes-list-search", name: "Routes List Search" });

    const recordedAt = new Date();
    const rangeStart = new Date(recordedAt);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(recordedAt);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    await insertCustomEvents([
      {
        project_id: projectId,
        session_id: "pv-a",
        route: "/blog/[slug]",
        path: "/blog/hello",
        device_type: "desktop",
        event_name: "$page_view",
        recorded_at: recordedAt,
      },
      {
        project_id: projectId,
        session_id: "pv-b",
        route: "/checkout",
        path: "/checkout",
        device_type: "desktop",
        event_name: "$page_view",
        recorded_at: recordedAt,
      },
    ]);

    const service = new RoutesListService();
    const result = await service.list({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: "desktop",
      search: "BLoG",
      metricName: "LCP",
      percentile: "p75",
      sort: { field: "route", direction: "asc" },
      page: { limit: 10, offset: 0 },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.totalRoutes).toBe(1);
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0]?.route).toBe("/blog/[slug]");
  });
});
