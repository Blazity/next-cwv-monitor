import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";

import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-utils", () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
}));

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let insertCustomEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").insertCustomEvents;
let RouteEventOverlayService: typeof import("../service").RouteEventOverlayService;

describe("route-event-overlay-service (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ insertCustomEvents } = await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));
    ({ RouteEventOverlayService } = await import("../service"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
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

  it("returns daily conversion overlay series (distinct session_id attribution) and totals", async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, domain: "overlay-int.com", name: "Overlay Integration" });

    const route = "/checkout";
    const eventName = "purchase";

    const day2 = new Date();
    day2.setUTCHours(12, 0, 0, 0);
    const day1 = new Date(day2);
    day1.setUTCDate(day1.getUTCDate() - 1);

    const rangeStart = new Date(day1);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(day2);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const day1Label = day1.toISOString().slice(0, 10);
    const day2Label = day2.toISOString().slice(0, 10);

    const events = [];

    // Day 1: 10 views, 2 conversions (with duplicate conversion rows per session).
    for (let i = 0; i < 10; i++) {
      const sessionId = `d1-view-${i}`;
      events.push({
        project_id: projectId,
        session_id: sessionId,
        route,
        path: route,
        device_type: "desktop" as const,
        event_name: "$page_view",
        recorded_at: day1,
      });
    }
    for (const sessionId of ["d1-view-1", "d1-view-7"]) {
      // duplicate row for same session_id should not affect countDistinct
      events.push(
        {
          project_id: projectId,
          session_id: sessionId,
          route,
          path: route,
          device_type: "desktop" as const,
          event_name: eventName,
          recorded_at: day1,
        },
        {
          project_id: projectId,
          session_id: sessionId,
          route,
          path: route,
          device_type: "desktop" as const,
          event_name: eventName,
          recorded_at: day1,
        },
      );
    }

    // Day 2: 10 views, 3 conversions.
    for (let i = 0; i < 10; i++) {
      const sessionId = `d2-view-${i}`;
      events.push({
        project_id: projectId,
        session_id: sessionId,
        route,
        path: route,
        device_type: "desktop" as const,
        event_name: "$page_view",
        recorded_at: day2,
      });
    }
    for (const sessionId of ["d2-view-0", "d2-view-5", "d2-view-9"]) {
      events.push({
        project_id: projectId,
        session_id: sessionId,
        route,
        path: route,
        device_type: "desktop" as const,
        event_name: eventName,
        recorded_at: day2,
      });
    }

    // Mobile noise should not affect desktop filter.
    events.push(
      {
        project_id: projectId,
        session_id: "mobile-view-1",
        route,
        path: route,
        device_type: "mobile" as const,
        event_name: "$page_view",
        recorded_at: day2,
      },
      {
        project_id: projectId,
        session_id: "mobile-view-1",
        route,
        path: route,
        device_type: "mobile" as const,
        event_name: eventName,
        recorded_at: day2,
      },
    );

    await insertCustomEvents(events);

    const service = new RouteEventOverlayService();
    const result = await service.getOverlay({
      projectId,
      route,
      eventName,
      deviceType: "desktop",
      range: { start: rangeStart, end: rangeEnd },
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.eventName).toBe(eventName);
    expect(result.data.series).toHaveLength(2);
    expect(result.data.series[0]).toMatchObject({
      date: day1Label,
      views: 10,
      conversions: 2,
      conversionRatePct: 20,
    });
    expect(result.data.series[1]).toMatchObject({
      date: day2Label,
      views: 10,
      conversions: 3,
      conversionRatePct: 30,
    });

    expect(result.data.totals).toEqual({
      views: 20,
      conversions: 5,
      conversionRatePct: 25,
    });
  });
});
