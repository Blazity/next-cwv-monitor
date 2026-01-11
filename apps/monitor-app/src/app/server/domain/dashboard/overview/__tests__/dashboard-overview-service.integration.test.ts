import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

import { optimizeAggregates, setupClickHouseContainer } from '@/test/clickhouse-test-utils';
import type { DashboardOverview } from '@/app/server/domain/dashboard/overview/types';

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let insertEvents: typeof import('@/app/server/lib/clickhouse/repositories/events-repository').insertEvents;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let DashboardOverviewService: typeof import('@/app/server/domain/dashboard/overview/service').DashboardOverviewService;

describe('dashboard-overview-service (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ insertEvents } = await import('@/app/server/lib/clickhouse/repositories/events-repository'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ DashboardOverviewService } = await import('@/app/server/domain/dashboard/overview/service'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE cwv_daily_aggregates`.command();
  });

  it('returns project-not-found when project does not exist', async () => {
    const service = new DashboardOverviewService();
    const result = await service.getOverview({
      projectId: randomUUID(),
      range: { start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-01-02T00:00:00Z') },
      selectedMetric: 'LCP',
      deviceType: 'all',
      topRoutesLimit: 5
    });

    expect(result).toEqual({
      kind: 'project-not-found',
      projectId: expect.any(String)
    });
  });

  it('returns overview with worst routes, statuses, and status distribution (range + device filters applied)', async () => {
    const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'overview-int', name: 'Overview Integration' });

    const now = new Date();
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0, 0, 0));
    const day1 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 12, 0, 0));
    const day2 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 5, 12, 0, 0));
    const rangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 5, 23, 59, 59));
    const outsideRangeDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 20, 12, 0, 0));

    const routes = [
      { route: '/good', value: 2000, expectedStatus: 'good' as const },
      { route: '/needs', value: 3000, expectedStatus: 'needs-improvement' as const },
      { route: '/poor', value: 5000, expectedStatus: 'poor' as const }
    ];

    const events = [];

    // Within range, desktop LCP events (2 days) – used by overview queries.
    for (const { route, value } of routes) {
      for (const recordedAt of [day1, day2]) {
        for (let i = 0; i < 10; i++) {
          events.push({
            project_id: projectId,
            session_id: `desktop-${route}-${recordedAt.toISOString()}-${i}`,
            route,
            path: route,
            device_type: 'desktop' as const,
            metric_name: 'LCP' as const,
            metric_value: value,
            rating: 'good',
            recorded_at: recordedAt
          });
        }
      }

      // Also add a uniformly-good CLS metric so we can validate metric-level status calculation.
      for (let i = 0; i < 5; i++) {
        events.push({
          project_id: projectId,
          session_id: `cls-${route}-${i}`,
          route,
          path: route,
          device_type: 'desktop' as const,
          metric_name: 'CLS' as const,
          metric_value: 0.05,
          rating: 'good',
          recorded_at: day2
        });
      }
    }

    // Within range, *mobile* events that would distort results if device filtering breaks.
    for (const recordedAt of [day1, day2]) {
      for (let i = 0; i < 20; i++) {
        events.push({
          project_id: projectId,
          session_id: `mobile-/good-${recordedAt.toISOString()}-${i}`,
          route: '/good',
          path: '/good',
          device_type: 'mobile' as const,
          metric_name: 'LCP' as const,
          metric_value: 7000,
          rating: 'good',
          recorded_at: recordedAt
        });
      }
    }

    // Outside range, desktop events that would distort results if date filtering breaks.
    for (let i = 0; i < 50; i++) {
      events.push({
        project_id: projectId,
        session_id: `old-/good-${i}`,
        route: '/good',
        path: '/good',
        device_type: 'desktop' as const,
        metric_name: 'LCP' as const,
        metric_value: 9000,
        rating: 'good',
        recorded_at: outsideRangeDay
      });
    }

    await insertEvents(events);
    await optimizeAggregates(sql);

    const service = new DashboardOverviewService();
    const result = await service.getOverview({
      projectId,
      range: { start: rangeStart, end: rangeEnd },
      selectedMetric: 'LCP',
      deviceType: 'desktop',
      topRoutesLimit: 10
    });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }
    const data: DashboardOverview = result.data;

    // Metric overview includes both metrics and assigns status based on P75.
    const lcp = data.metricOverview.find((m) => m.metricName === 'LCP');
    const cls = data.metricOverview.find((m) => m.metricName === 'CLS');

    expect(lcp).toBeDefined();
    if (!lcp) {
      throw new Error('Expected LCP metric in metricOverview');
    }
    expect(lcp.sampleSize).toBe(60); // 3 routes * 2 days * 10 events, desktop only, in-range only
    expect(lcp.status).toBe('poor');
    expect(lcp.quantiles).toMatchObject({
      p50: expect.any(Number),
      p75: expect.any(Number),
      p90: expect.any(Number),
      p95: expect.any(Number),
      p99: expect.any(Number)
    });

    expect(cls).toBeDefined();
    if (!cls) {
      throw new Error('Expected CLS metric in metricOverview');
    }
    expect(cls.sampleSize).toBe(15); // 3 routes * 5 events (desktop), in-range
    expect(cls.status).toBe('good');

    // timeSeriesByMetric should contain time series for all metrics
    expect(data.timeSeriesByMetric).toBeDefined();
    expect(data.timeSeriesByMetric).toHaveProperty('LCP');
    expect(data.timeSeriesByMetric).toHaveProperty('INP');
    expect(data.timeSeriesByMetric).toHaveProperty('CLS');
    expect(data.timeSeriesByMetric).toHaveProperty('FCP');
    expect(data.timeSeriesByMetric).toHaveProperty('TTFB');

    // LCP time series is per-day for selected metric (LCP), ordered by date.
    expect(data.timeSeriesByMetric.LCP).toHaveLength(2);
    expect(data.timeSeriesByMetric.LCP[0].date).toBe(dateOnly(day1));
    expect(data.timeSeriesByMetric.LCP[1].date).toBe(dateOnly(day2));
    expect(data.timeSeriesByMetric.LCP[0].sampleSize).toBe(30); // 3 routes * 10 events for day1
    expect(data.timeSeriesByMetric.LCP[1].sampleSize).toBe(30); // 3 routes * 10 events for day2

    // CLS time series should have data (we added CLS events for day2)
    expect(data.timeSeriesByMetric.CLS).toBeDefined();
    expect(Array.isArray(data.timeSeriesByMetric.CLS)).toBe(true);
    // CLS events were only added for day2, so we should have at least one data point
    const clsSeries = data.timeSeriesByMetric.CLS;
    if (clsSeries.length > 0) {
      const clsDay2 = clsSeries.find((point) => point.date === dateOnly(day2));
      expect(clsDay2).toBeDefined();
      if (clsDay2) {
        expect(clsDay2.sampleSize).toBeGreaterThan(0);
      }
    }

    // Metrics without data (INP, FCP, TTFB) should have empty arrays or valid structure
    expect(Array.isArray(data.timeSeriesByMetric.INP)).toBe(true);
    expect(Array.isArray(data.timeSeriesByMetric.FCP)).toBe(true);
    expect(Array.isArray(data.timeSeriesByMetric.TTFB)).toBe(true);

    // Worst routes should be sorted by p75 desc and include per-route status.
    expect(data.worstRoutes.map((r) => r.route)).toEqual(['/poor', '/needs', '/good']);
    for (const expected of routes) {
      const row = data.worstRoutes.find((r) => r.route === expected.route);
      expect(row).toBeDefined();
      if (!row) {
        throw new Error(`Expected route ${expected.route} in worstRoutes`);
      }
      expect(row.sampleSize).toBe(20); // 2 days * 10 events
      expect(row.status).toBe(expected.expectedStatus);
      expect(row.quantiles?.p75).toBeDefined();
    }

    // Status distribution counts routes by their P75 rating for the selected metric.
    expect(data.statusDistribution).toEqual({
      good: 1,
      'needs-improvement': 1,
      poor: 1
    });
  });
});
