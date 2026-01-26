import { describe, beforeAll, afterAll, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import type { StartedTestContainer } from "testcontainers";

import { setupClickHouseContainer, optimizeAggregates } from "@/test/clickhouse-test-utils";

type CustomMatchers<R = unknown> = {
  toPassBudget(limit: number): R;
};

declare module "vitest" {
  // We must use interface here to merge with Vitest's types
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
  interface Matchers<T = any> extends CustomMatchers<T> {}
}

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-utils", () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
}));

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;

let DashboardOverviewService: typeof import("@/app/server/domain/dashboard/overview/service").DashboardOverviewService;
let RoutesListService: typeof import("@/app/server/domain/routes/list/service").RoutesListService;
let RouteDetailService: typeof import("@/app/server/domain/routes/detail/service").RouteDetailService;
let RouteEventOverlayService: typeof import("@/app/server/domain/routes/overlay/service").RouteEventOverlayService;
let RegressionsListService: typeof import("@/app/server/domain/regressions/list/service").RegressionsListService;

let fetchConversionTrend: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchConversionTrend;
let fetchEventsStatsData: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchEventsStatsData;
let fetchTotalStatsEvents: typeof import("@/app/server/lib/clickhouse/repositories/custom-events-repository").fetchTotalStatsEvents;

let overviewService: InstanceType<
  typeof import("@/app/server/domain/dashboard/overview/service").DashboardOverviewService
>;
let routesListService: InstanceType<typeof import("@/app/server/domain/routes/list/service").RoutesListService>;
let routeDetailService: InstanceType<typeof import("@/app/server/domain/routes/detail/service").RouteDetailService>;
let overlayService: InstanceType<typeof import("@/app/server/domain/routes/overlay/service").RouteEventOverlayService>;
let regressionsService: InstanceType<
  typeof import("@/app/server/domain/regressions/list/service").RegressionsListService
>;

const BUDGETS = {
  OVERVIEW: 100, // /projects/[projectId]/
  ROUTES_LIST: 150, // /projects/[projectId]/routes
  ROUTE_DETAIL: 100, // /projects/[projectId]/routes/[route]
  CONVERSIONS: 100, // /projects/[projectId]/routes/[route] (Overlay)
  REGRESSIONS: 150, // /projects/[projectId]/regressions
  EVENTS_STATS: 100, // /projects/[projectId]/events (Conversion rate table calculation)
  EVENTS_TOTAL_STATS: 100, // /projects/[projectId]/events (Conversion rate table calculation)
  EVENTS_TREND: 100, // /projects/[projectId]/events (time-series conversion chart)
};

const measureMedian = async (fn: () => Promise<unknown>, iterations = 3) => {
  const durations: number[] = [];
  await fn();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    durations.push(performance.now() - start);
  }
  return durations.toSorted((a, b) => a - b)[Math.floor(iterations / 2)];
};

describe("Performance Guardrails", () => {
  const PERF_PROJECT_ID = randomUUID();

  const commonRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  };

  beforeAll(async () => {
    expect.extend({
      toPassBudget(received: number, limit: number) {
        const pass = received < limit;

        const fileName = this.testPath?.split("/").pop() || "Performance";
        const testName = this.currentTestName || "Unnamed Test";

        if (pass) {
          console.log(
            `  \u001B[32mPASS\u001B[0m \u001B[2m[${fileName}]\u001B[0m\n` +
              `       \u001B[36m${testName}\u001B[0m\n` +
              `       Latency: \u001B[32m${received.toFixed(2)}ms\u001B[0m (Budget: ${limit}ms)\n`,
          );
        }

        return {
          pass,
          message: () =>
            pass
              ? `expected ${received.toFixed(2)}ms not to pass budget of ${limit}ms`
              : `\u001B[31mPERFORMANCE FAILURE in [${testName}]:\u001B[0m\n` +
                `Measured latency \u001B[1m${received.toFixed(2)}ms\u001B[0m exceeded budget of \u001B[1m${limit}ms\u001B[0m`,
        };
      },
    });

    const setup = await setupClickHouseContainer();
    container = setup.container;

    process.env.CLICKHOUSE_HOST = setup.host;
    process.env.CLICKHOUSE_PORT = String(setup.port);
    process.env.SEED_PROJECT_ID = PERF_PROJECT_ID;
    process.env.SEED_DAYS = "90";
    process.env.SEED_EVENTS_PER_COMBO = "150";
    process.env.CUSTOM_EVENTS_COUNT = "200000";

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));

    ({ DashboardOverviewService } = await import("@/app/server/domain/dashboard/overview/service"));
    ({ RoutesListService } = await import("@/app/server/domain/routes/list/service"));
    ({ RouteDetailService } = await import("@/app/server/domain/routes/detail/service"));
    ({ RouteEventOverlayService } = await import("@/app/server/domain/routes/overlay/service"));
    ({ RegressionsListService } = await import("@/app/server/domain/regressions/list/service"));
    ({ fetchConversionTrend, fetchEventsStatsData, fetchTotalStatsEvents } =
      await import("@/app/server/lib/clickhouse/repositories/custom-events-repository"));

    const { seedDemoData } = await import("../../scripts/seed-demo-data.mjs");

    overviewService = new DashboardOverviewService();
    routesListService = new RoutesListService();
    routeDetailService = new RouteDetailService();
    overlayService = new RouteEventOverlayService();
    regressionsService = new RegressionsListService();

    await seedDemoData({ seedCwvEvents: true, seedCustomEvents: true });

    await optimizeAggregates(sql);
  }, 240_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
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

  it("Service: Dashboard Overview", async () => {
    const duration = await measureMedian(
      async () =>
        await overviewService.getOverview({
          projectId: PERF_PROJECT_ID,
          range: commonRange,
          selectedMetric: "LCP",
          deviceType: "all",
          topRoutesLimit: 5,
        }),
    );

    expect(duration).toPassBudget(BUDGETS.OVERVIEW);
  });

  it("Service: Routes List (Search + Pagination)", async () => {
    const duration = await measureMedian(
      async () =>
        await routesListService.list({
          projectId: PERF_PROJECT_ID,
          range: commonRange,
          deviceType: "all",
          search: "page",
          metricName: "LCP",
          percentile: "p75",
          sort: { field: "views", direction: "desc" },
          page: { limit: 20, offset: 0 },
        }),
    );

    expect(duration).toPassBudget(BUDGETS.ROUTES_LIST);
  });

  it("Service: Route Detail (Deep Aggregate)", async () => {
    const duration = await measureMedian(
      async () =>
        await routeDetailService.getDetail({
          projectId: PERF_PROJECT_ID,
          route: "/blog/[slug]",
          range: commonRange,
          deviceType: "all",
          selectedMetric: "LCP",
        }),
    );

    expect(duration).toPassBudget(BUDGETS.ROUTE_DETAIL);
  });

  it("Service: Event Overlay (Conversion Attribution)", async () => {
    const duration = await measureMedian(
      async () =>
        await overlayService.getOverlay({
          projectId: PERF_PROJECT_ID,
          route: "/blog/[slug]",
          eventName: "search",
          deviceType: "all",
          range: commonRange,
        }),
    );

    expect(duration).toPassBudget(BUDGETS.CONVERSIONS);
  });

  it("Service: Regressions List (Comparison Query)", async () => {
    const duration = await measureMedian(() =>
      regressionsService.list({
        projectId: PERF_PROJECT_ID,
        range: commonRange,
        deviceType: "all",
        metric: "all",
        sort: { field: "change", direction: "desc" },
        page: { limit: 50, offset: 0 },
      }),
    );

    expect(duration).toPassBudget(BUDGETS.REGRESSIONS);
  });

  it("Repository: Events Page Data (Conversion & Stats)", async () => {
    const statsDuration = await measureMedian(
      async () =>
        await fetchEventsStatsData({
          projectId: PERF_PROJECT_ID,
          range: "30d",
          eventName: "search",
          deviceType: "all",
        }),
    );

    expect(statsDuration).toPassBudget(BUDGETS.EVENTS_STATS);

    const totalStatsDuration = await measureMedian(
      async () =>
        await fetchTotalStatsEvents({
          projectId: PERF_PROJECT_ID,
          range: "30d",
          deviceType: "all",
        }),
    );

    expect(totalStatsDuration).toPassBudget(BUDGETS.EVENTS_TOTAL_STATS);

    const trendDuration = await measureMedian(
      async () =>
        await fetchConversionTrend({
          projectId: PERF_PROJECT_ID,
          range: "30d",
          eventName: "search",
          deviceType: "all",
        }),
    );

    expect(trendDuration).toPassBudget(BUDGETS.EVENTS_TREND);
  });
});
