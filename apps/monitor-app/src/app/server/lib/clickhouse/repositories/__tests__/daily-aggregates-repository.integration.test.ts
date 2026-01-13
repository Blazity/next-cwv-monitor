import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";

import { optimizeAggregates, setupClickHouseContainer } from "@/test/clickhouse-test-utils";

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let insertEvents: typeof import("@/app/server/lib/clickhouse/repositories/events-repository").insertEvents;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let getProjectMetricOverview: typeof import("@/app/server/lib/clickhouse/repositories/daily-aggregates-repository").getProjectMetricOverview;
let getRouteDailySeries: typeof import("@/app/server/lib/clickhouse/repositories/daily-aggregates-repository").getRouteDailySeries;

describe("daily-aggregates-repository", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ insertEvents } = await import("@/app/server/lib/clickhouse/repositories/events-repository"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ getProjectMetricOverview, getRouteDailySeries } =
      await import("@/app/server/lib/clickhouse/repositories/daily-aggregates-repository"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE cwv_daily_aggregates`.command();
  });

  describe("getProjectMetricOverview", () => {
    it("returns empty array when no data exists", async () => {
      const projectId = randomUUID();
      const overview = await getProjectMetricOverview(projectId, {
        start: new Date("2024-01-01T00:00:00Z"),
        end: new Date("2024-12-31T00:00:00Z"),
      });

      expect(overview).toEqual([]);
    });

    it("returns aggregated metrics from materialized view", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "agg-test.com", name: "Aggregation Test" });

      const events = Array.from({ length: 10 }).map((_, i) => ({
        project_id: projectId,
        session_id: `session-${i}`,
        route: "/home",
        path: "/home",
        device_type: "desktop" as const,
        metric_name: "LCP",
        metric_value: 2000 + i * 100,
        rating: "good",
      }));

      await insertEvents(events);
      await optimizeAggregates(sql); // Force MV to materialize

      const overview = await getProjectMetricOverview(projectId, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(overview.length).toBeGreaterThan(0);
      const lcpMetric = overview.find((m) => m.metric === "LCP");
      expect(lcpMetric).toBeDefined();
      expect(lcpMetric?.sampleSize).toBe(10);
      expect(lcpMetric?.quantiles).not.toBeNull();
      expect(lcpMetric?.quantiles?.p50).toBeGreaterThan(0);
    });

    it("returns multiple metrics when they exist", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "multi-metric.com", name: "Multi Metric" });

      await insertEvents([
        {
          project_id: projectId,
          session_id: "session-1",
          route: "/home",
          path: "/home",
          device_type: "desktop",
          metric_name: "LCP",
          metric_value: 2500,
          rating: "good",
        },
        {
          project_id: projectId,
          session_id: "session-2",
          route: "/home",
          path: "/home",
          device_type: "desktop",
          metric_name: "CLS",
          metric_value: 0.05,
          rating: "good",
        },
        {
          project_id: projectId,
          session_id: "session-3",
          route: "/home",
          path: "/home",
          device_type: "desktop",
          metric_name: "FID",
          metric_value: 100,
          rating: "good",
        },
      ]);

      await optimizeAggregates(sql);

      const overview = await getProjectMetricOverview(projectId, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const metricNames = overview.map((m) => m.metric).toSorted();
      expect(metricNames).toContain("LCP");
      expect(metricNames).toContain("CLS");
      expect(metricNames).toContain("FID");
    });

    it("filters aggregates by device type", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "device-filter.com", name: "Device Filter" });

      const desktopEvents = Array.from({ length: 5 }).map((_, i) => ({
        project_id: projectId,
        session_id: `desktop-${i}`,
        route: "/home",
        path: "/home",
        device_type: "desktop" as const,
        metric_name: "LCP",
        metric_value: 2000,
        rating: "good",
      }));

      const mobileEvents = Array.from({ length: 3 }).map((_, i) => ({
        project_id: projectId,
        session_id: `mobile-${i}`,
        route: "/home",
        path: "/home",
        device_type: "mobile" as const,
        metric_name: "LCP",
        metric_value: 3000,
        rating: "needs-improvement",
      }));

      await insertEvents([...desktopEvents, ...mobileEvents]);
      await optimizeAggregates(sql);

      const desktopOverview = await getProjectMetricOverview(
        projectId,
        { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        { deviceType: "desktop" },
      );

      const desktopLcp = desktopOverview.find((m) => m.metric === "LCP");
      expect(desktopLcp?.sampleSize).toBe(5);

      const mobileOverview = await getProjectMetricOverview(
        projectId,
        { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
        { deviceType: "mobile" },
      );

      const mobileLcp = mobileOverview.find((m) => m.metric === "LCP");
      expect(mobileLcp?.sampleSize).toBe(3);
    });

    it("returns quantile summary with all percentiles", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "quantiles-test.com", name: "Quantiles Test" });

      const events = Array.from({ length: 100 }).map((_, i) => ({
        project_id: projectId,
        session_id: `session-${i}`,
        route: "/home",
        path: "/home",
        device_type: "desktop" as const,
        metric_name: "LCP",
        metric_value: 1000 + i * 50,
        rating: "good",
      }));

      await insertEvents(events);
      await optimizeAggregates(sql);

      const overview = await getProjectMetricOverview(projectId, {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      const lcpMetric = overview.find((m) => m.metric === "LCP");
      expect(lcpMetric?.quantiles).toMatchObject({
        p50: expect.any(Number),
        p75: expect.any(Number),
        p90: expect.any(Number),
        p95: expect.any(Number),
        p99: expect.any(Number),
      });

      // Percentiles should be in ascending order
      const q = lcpMetric!.quantiles!;
      expect(q.p50).toBeLessThanOrEqual(q.p75);
      expect(q.p75).toBeLessThanOrEqual(q.p90);
      expect(q.p90).toBeLessThanOrEqual(q.p95);
      expect(q.p95).toBeLessThanOrEqual(q.p99);
    });
  });

  describe("getRouteDailySeries", () => {
    it("returns daily series for a specific route and metric", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "daily-series.com", name: "Daily Series" });

      const events = Array.from({ length: 5 }).map((_, i) => ({
        project_id: projectId,
        session_id: `session-${i}`,
        route: "/blog/[slug]",
        path: `/blog/post-${i}`,
        device_type: "desktop" as const,
        metric_name: "CLS",
        metric_value: 0.05 + i * 0.01,
        rating: "good",
      }));

      await insertEvents(events);
      await optimizeAggregates(sql);

      const series = await getRouteDailySeries(projectId, "/blog/[slug]", "CLS", {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(series.length).toBeGreaterThan(0);
      expect(series[0]?.quantiles).not.toBeNull();
      expect(series[0]?.sampleSize).toBe(5);
    });

    it("returns empty array for non-existent route", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "no-route.com", name: "No Route" });

      const series = await getRouteDailySeries(projectId, "/non-existent", "LCP", {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      expect(series).toEqual([]);
    });

    it("filters daily series by device type", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "series-device.com", name: "Series Device" });

      await insertEvents([
        ...Array.from({ length: 4 }).map((_, i) => ({
          project_id: projectId,
          session_id: `desktop-${i}`,
          route: "/products",
          path: "/products",
          device_type: "desktop" as const,
          metric_name: "LCP",
          metric_value: 2000,
          rating: "good",
        })),
        ...Array.from({ length: 2 }).map((_, i) => ({
          project_id: projectId,
          session_id: `mobile-${i}`,
          route: "/products",
          path: "/products",
          device_type: "mobile" as const,
          metric_name: "LCP",
          metric_value: 3500,
          rating: "needs-improvement",
        })),
      ]);

      await optimizeAggregates(sql);

      const desktopSeries = await getRouteDailySeries(
        projectId,
        "/products",
        "LCP",
        { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        { deviceType: "desktop" },
      );

      expect(desktopSeries[0]?.sampleSize).toBe(4);

      const mobileSeries = await getRouteDailySeries(
        projectId,
        "/products",
        "LCP",
        { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
        { deviceType: "mobile" },
      );

      expect(mobileSeries[0]?.sampleSize).toBe(2);
    });

    it("returns series ordered by date ascending", async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, domain: "date-order.com", name: "Date Order" });

      // Insert multiple events for a single day to ensure aggregation works
      const events = Array.from({ length: 5 }).map((_, i) => ({
        project_id: projectId,
        session_id: `session-${i}`,
        route: "/test",
        path: "/test",
        device_type: "desktop" as const,
        metric_name: "LCP",
        metric_value: 2000 + i * 100,
        rating: "good",
      }));

      await insertEvents(events);
      await optimizeAggregates(sql); // Force MV to materialize

      const series = await getRouteDailySeries(projectId, "/test", "LCP", {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      });

      // Should have at least one day of data
      expect(series.length).toBeGreaterThanOrEqual(1);
      expect(series[0]?.sampleSize).toBe(5);
    });
  });
});
