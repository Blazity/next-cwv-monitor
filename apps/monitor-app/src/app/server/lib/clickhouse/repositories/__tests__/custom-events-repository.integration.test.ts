import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import type { StartedTestContainer } from "testcontainers";
import { randomUUID } from "node:crypto";
import { subDays } from "date-fns";

import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";
import { TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import { timeRangeToDateRange, timeRangeToDays } from "@/lib/utils";

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let insertCustomEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").insertCustomEvents;
let fetchTotalStatsEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchTotalStatsEvents;
let fetchEventsStatsData: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchEventsStatsData;
let fetchConversionTrend: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchConversionTrend;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;

let projectId: string;
const range: TimeRangeKey = "7d";

describe("custom-events-repository integration", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;
    vi.resetModules();

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ insertCustomEvents, fetchTotalStatsEvents, fetchEventsStatsData, fetchConversionTrend } =
      await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));

    projectId = randomUUID();
    await createProject({ id: projectId, domain: "test.com", name: "Test" });
  }, 120_000);

  afterAll(async () => await container.stop());

  beforeEach(async () => {
    await sql`TRUNCATE TABLE custom_events`.command();
  });

  describe("insertCustomEvents", () => {
    it("should chunk inserts for large payloads without crashing", async () => {
      const manyEvents = Array.from({ length: 2000 }).map(() => ({
        project_id: projectId,
        event_name: "bulk",
        session_id: randomUUID(),
        route: "/",
        path: "/",
        device_type: "mobile" as const,
      }));

      await expect(insertCustomEvents(manyEvents)).resolves.not.toThrow();
    });
  });
  describe("fetchTotalStatsEvents", () => {
    it("should respect strict project isolation", async () => {
      const otherProjectId = randomUUID();
      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "s1",
          route: "/",
          path: "/",
          device_type: "mobile",
        },
        {
          project_id: otherProjectId,
          event_name: "$page_view",
          session_id: "s2",
          route: "/",
          path: "/",
          device_type: "mobile",
        },
      ]);

      const data = await fetchTotalStatsEvents({ projectId, range, deviceType: "all" });
      expect(data.total_views_cur).toBe(1);
    });

    it("should correctly separate current and previous periods at the boundary", async () => {
      const { start } = timeRangeToDateRange(range);

      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "cur",
          recorded_at: start,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "prev",
          recorded_at: new Date(start.getTime() - 1),
          route: "/",
          path: "/",
          device_type: "desktop",
        },
      ]);

      const data = await fetchTotalStatsEvents({ projectId, range, deviceType: "all" });
      expect(data.total_views_cur).toBe(1);
      expect(data.total_views_prev).toBe(1);
    });

    it("should calculate percentage change correctly and handle zero-division", async () => {
      const days = timeRangeToDays[range];
      const now = new Date();
      const prev = subDays(now, days + 1);

      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "signup",
          session_id: "s1",
          recorded_at: prev,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "signup",
          session_id: "s2",
          recorded_at: now,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "signup",
          session_id: "s3",
          recorded_at: now,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
      ]);

      const data = await fetchTotalStatsEvents({ projectId, range, deviceType: "all" });

      expect(data.total_conversion_change_pct).toBe(100);
      expect(data.total_conversions_cur).toBe(2);
      expect(data.total_conversions_prev).toBe(1);
    });

    it("should deduplicate conversions based on (session_id, event_name)", async () => {
      const now = new Date();
      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "btn_click",
          session_id: "s1",
          recorded_at: now,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "btn_click",
          session_id: "s1",
          recorded_at: now,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "submit",
          session_id: "s1",
          recorded_at: now,
          route: "/",
          path: "/",
          device_type: "desktop",
        },
      ]);

      const data = await fetchTotalStatsEvents({ projectId, range, deviceType: "all" });
      expect(data.total_conversions_cur).toBe(2);
    });
  });

  describe("fetchEventsStatsData", () => {
    it("should filter metrics only for the specified event name and $page_view", async () => {
      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "s1",
          route: "/a",
          path: "/a",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "target_event",
          session_id: "s1",
          route: "/a",
          path: "/a",
          device_type: "desktop",
        },
        {
          project_id: projectId,
          event_name: "ignored_event",
          session_id: "s1",
          route: "/a",
          path: "/a",
          device_type: "desktop",
        },
      ]);

      const stats = await fetchEventsStatsData({ projectId, range, eventNames: ["target_event"], deviceType: "all" });

      expect(stats[0].conversions_cur).toBe(1);
    });

    it("should calculate conversion rate as (unique_converters / unique_viewers)", async () => {
      const now = new Date();
      await insertCustomEvents([
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "user_1",
          route: "/pricing",
          path: "/pricing",
          device_type: "desktop",
          recorded_at: now,
        },
        {
          project_id: projectId,
          event_name: "$page_view",
          session_id: "user_2",
          route: "/pricing",
          path: "/pricing",
          device_type: "desktop",
          recorded_at: now,
        },
        {
          project_id: projectId,
          event_name: "subscribe",
          session_id: "user_1",
          route: "/pricing",
          path: "/pricing",
          device_type: "desktop",
          recorded_at: now,
        },
      ]);

      const stats = await fetchEventsStatsData({ projectId, range, eventNames: ["subscribe"], deviceType: "all" });
      const pricing = stats.find((s) => s.route === "/pricing");

      expect(pricing?.conversion_rate).toBe(50);
      expect(pricing?.views_cur).toBe(2);
      expect(pricing?.conversions_cur).toBe(1);
    });
  });

  describe("fetchConversionTrend", () => {
    it("should ensure the trend starts exactly from the requested range start", async () => {
      const { start } = timeRangeToDateRange(range);
      const format = (d: Date) => d.toISOString().split("T")[0];
    
      const trend = await fetchConversionTrend({ projectId, range, eventNames: ["any"], deviceType: "all" });
      const firstEntryDate = new Date(trend[0].day);
    
      expect(format(firstEntryDate)).toBe(format(start));
    });
  });
});
