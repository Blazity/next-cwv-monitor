import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';

import { optimizeAggregates, setupClickHouseContainer } from '@/test/clickhouse-test-utils';

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/server/lib/auth-check', () => ({
  getAuthorizedSession: getAuthorizedSessionMock
}));

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let insertEvents: typeof import('@/app/server/lib/clickhouse/repositories/events-repository').insertEvents;
let insertCustomEvents: typeof import('@/app/server/lib/clickhouse/repositories/custom-events-repository').insertCustomEvents;
let RouteDetailService: typeof import('../service').RouteDetailService;

describe('route-detail-service (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ insertEvents } = await import('@/app/server/lib/clickhouse/repositories/events-repository'));
    ({ insertCustomEvents } = await import('@/app/server/lib/clickhouse/repositories/custom-events-repository'));
    ({ RouteDetailService } = await import('../service'));
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
        id: 'test-session-id',
        userId: 'test-user-id',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  });

  it('returns route-not-found when route has no views and no metrics', async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'route-detail-missing', name: 'Route Detail Missing' });

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setUTCHours(0, 0, 0, 0);
    const rangeEnd = new Date(now);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const service = new RouteDetailService();
    const result = await service.getDetail({
      projectId,
      route: '/missing',
      range: { start: rangeStart, end: rangeEnd },
      deviceType: 'desktop',
      selectedMetric: 'LCP'
    });

    expect(result).toEqual({ kind: 'route-not-found', route: '/missing' });
  });

  it('returns route detail with metrics, series, distribution and insights', async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'route-detail-int', name: 'Route Detail Integration' });

    const route = '/checkout';

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

    const customEvents = [];
    const cwvEvents = [];

    // Two days, 17 page views per day.
    for (const [dayIndex, recordedAt] of [
      [1, day1] as const,
      [2, day2] as const
    ]) {
      for (let i = 0; i < 17; i++) {
        const sessionId = `pv-${dayIndex}-${i}`;
        customEvents.push({
          project_id: projectId,
          session_id: sessionId,
          route,
          path: route,
          device_type: 'desktop' as const,
          event_name: '$page_view',
          recorded_at: recordedAt
        });
      }

      // LCP distribution per day: 10 good, 5 needs-improvement, 2 poor.
      const lcpSessions = [
        ...Array.from({ length: 10 }, (_, idx) => ({ sessionId: `lcp-good-${dayIndex}-${idx}`, value: 2000 })),
        ...Array.from({ length: 5 }, (_, idx) => ({ sessionId: `lcp-needs-${dayIndex}-${idx}`, value: 3000 })),
        ...Array.from({ length: 2 }, (_, idx) => ({ sessionId: `lcp-poor-${dayIndex}-${idx}`, value: 5000 }))
      ];

      for (const entry of lcpSessions) {
        let rating: 'good' | 'needs-improvement' | 'poor';
        if (entry.value <= 2500) {
          rating = 'good';
        } else if (entry.value <= 4000) {
          rating = 'needs-improvement';
        } else {
          rating = 'poor';
        }

        customEvents.push({
          project_id: projectId,
          session_id: entry.sessionId,
          route,
          path: route,
          device_type: 'desktop' as const,
          event_name: '$page_view',
          recorded_at: recordedAt
        });

        cwvEvents.push({
          project_id: projectId,
          session_id: entry.sessionId,
          route,
          path: route,
          device_type: 'desktop' as const,
          metric_name: 'LCP' as const,
          metric_value: entry.value,
          rating,
          recorded_at: recordedAt
        });
      }

      // Also include a stable CLS metric to validate multi-metric summaries.
      for (let i = 0; i < 10; i++) {
        const sessionId = `cls-${dayIndex}-${i}`;
        cwvEvents.push({
          project_id: projectId,
          session_id: sessionId,
          route,
          path: route,
          device_type: 'desktop' as const,
          metric_name: 'CLS' as const,
          metric_value: 0.05,
          rating: 'good',
          recorded_at: recordedAt
        });
      }
    }

    await insertCustomEvents(customEvents);
    await insertEvents(cwvEvents);
    await optimizeAggregates(sql);

    const service = new RouteDetailService();
    const result = await service.getDetail({
      projectId,
      route,
      range: { start: rangeStart, end: rangeEnd },
      deviceType: 'desktop',
      selectedMetric: 'LCP'
    });

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') {
      throw new Error(`Expected kind=ok, got ${result.kind}`);
    }

    expect(result.data.route).toBe(route);
    expect(result.data.views).toBe(68); // 2 days * (17 + 17) distinct session_ids, from $page_view
    expect(result.data.timeSeries).toHaveLength(2);
    expect(result.data.timeSeries[0]?.date).toBe(day1Label);
    expect(result.data.timeSeries[1]?.date).toBe(day2Label);

    // Distribution counts distinct session_ids for selected metric (LCP).
    expect(result.data.distribution).toEqual({
      good: 20,
      'needs-improvement': 10,
      poor: 4
    });

    const lcp = result.data.metrics.find((m) => m.metricName === 'LCP');
    expect(lcp).toBeDefined();
    expect(lcp?.sampleSize).toBe(34);
    expect(lcp?.quantiles?.p75).toBeDefined();

    // v1 insights include at least one core metric insight + low-views warning.
    expect(result.data.insights.length).toBeGreaterThan(0);
  });
});

