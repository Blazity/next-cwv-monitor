import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let insertEvents: typeof import('@/app/server/lib/clickhouse/repositories/events-repository').insertEvents;
let fetchEvents: typeof import('@/app/server/lib/clickhouse/repositories/events-repository').fetchEvents;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;

describe('events-repository', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ insertEvents, fetchEvents } = await import('@/app/server/lib/clickhouse/repositories/events-repository'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
  });

  describe('insertEvents', () => {
    it('inserts a single event', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'single-event', name: 'Single Event' });

      const event = {
        project_id: projectId,
        session_id: 'session-1',
        route: '/home',
        path: '/home',
        device_type: 'desktop' as const,
        metric_name: 'LCP',
        metric_value: 2500,
        rating: 'good'
      };

      await insertEvents([event]);

      const fetched = await fetchEvents({ projectId, limit: 10 });
      expect(fetched).toHaveLength(1);
      expect(fetched[0]?.route).toBe('/home');
      expect(fetched[0]?.metric_name).toBe('LCP');
      expect(fetched[0]?.metric_value).toBe(2500);
    });

    it('inserts multiple events in a batch', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'batch-events', name: 'Batch Events' });

      const events = [
        {
          project_id: projectId,
          session_id: 'session-1',
          route: '/home',
          path: '/home',
          device_type: 'desktop' as const,
          metric_name: 'LCP',
          metric_value: 2500,
          rating: 'good'
        },
        {
          project_id: projectId,
          session_id: 'session-2',
          route: '/about',
          path: '/about',
          device_type: 'mobile' as const,
          metric_name: 'FID',
          metric_value: 150,
          rating: 'needs-improvement'
        },
        {
          project_id: projectId,
          session_id: 'session-3',
          route: '/contact',
          path: '/contact',
          device_type: 'desktop' as const,
          metric_name: 'CLS',
          metric_value: 0.05,
          rating: 'good'
        }
      ];

      await insertEvents(events);

      const fetched = await fetchEvents({ projectId, limit: 10 });
      expect(fetched).toHaveLength(3);
    });

    it('handles empty events array gracefully', async () => {
      await expect(insertEvents([])).resolves.not.toThrow();
    });

    it('sets default timestamps when not provided', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'default-ts', name: 'Default Timestamps' });

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'session-1',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'TTFB',
          metric_value: 100,
          rating: 'good'
        }
      ]);

      const fetched = await fetchEvents({ projectId, limit: 1 });
      expect(fetched[0]?.recorded_at).toBeDefined();
      expect(fetched[0]?.ingested_at).toBeDefined();
    });
  });

  describe('fetchEvents', () => {
    it('fetches events for a project', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'fetch-test', name: 'Fetch Test' });

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'session-1',
          route: '/page1',
          path: '/page1',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 2000,
          rating: 'good'
        },
        {
          project_id: projectId,
          session_id: 'session-2',
          route: '/page2',
          path: '/page2',
          device_type: 'mobile',
          metric_name: 'CLS',
          metric_value: 0.1,
          rating: 'needs-improvement'
        }
      ]);

      const fetched = await fetchEvents({ projectId, limit: 10 });
      expect(fetched).toHaveLength(2);
      expect(fetched.map((e) => e.route).toSorted()).toEqual(['/page1', '/page2']);
    });

    it('filters events by route', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'route-filter', name: 'Route Filter' });

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'session-1',
          route: '/home',
          path: '/home',
          device_type: 'desktop',
          metric_name: 'CLS',
          metric_value: 0.05,
          rating: 'good'
        },
        {
          project_id: projectId,
          session_id: 'session-2',
          route: '/about',
          path: '/about',
          device_type: 'desktop',
          metric_name: 'CLS',
          metric_value: 0.1,
          rating: 'needs-improvement'
        }
      ]);

      const homeEvents = await fetchEvents({ projectId, route: '/home', limit: 10 });
      expect(homeEvents).toHaveLength(1);
      expect(homeEvents[0]?.route).toBe('/home');
    });

    it('filters events by time range (start)', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'time-filter', name: 'Time Filter' });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'old',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 1000,
          rating: 'good',
          recorded_at: twoDaysAgo
        },
        {
          project_id: projectId,
          session_id: 'recent',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 2000,
          rating: 'good',
          recorded_at: now
        }
      ]);

      const recentEvents = await fetchEvents({
        projectId,
        start: yesterday,
        limit: 10
      });

      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0]?.session_id).toBe('recent');
    });

    it('filters events by time range (end)', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'end-filter', name: 'End Filter' });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'old',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 1000,
          rating: 'good',
          recorded_at: twoDaysAgo
        },
        {
          project_id: projectId,
          session_id: 'recent',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 2000,
          rating: 'good',
          recorded_at: now
        }
      ]);

      const oldEvents = await fetchEvents({
        projectId,
        end: yesterday,
        limit: 10
      });

      expect(oldEvents).toHaveLength(1);
      expect(oldEvents[0]?.session_id).toBe('old');
    });

    it('respects limit parameter', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'limit-test', name: 'Limit Test' });

      const events = Array.from({ length: 10 }).map((_, i) => ({
        project_id: projectId,
        session_id: `session-${i}`,
        route: '/',
        path: '/',
        device_type: 'desktop' as const,
        metric_name: 'LCP',
        metric_value: 1000 + i * 100,
        rating: 'good'
      }));

      await insertEvents(events);

      const fetched = await fetchEvents({ projectId, limit: 5 });
      expect(fetched).toHaveLength(5);
    });

    it('returns empty array for non-existent project', async () => {
      const fetched = await fetchEvents({ projectId: randomUUID(), limit: 10 });
      expect(fetched).toEqual([]);
    });

    it('orders events by recorded_at descending', async () => {
      const projectId = randomUUID();
      await createProject({ id: projectId, slug: 'order-test', name: 'Order Test' });

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await insertEvents([
        {
          project_id: projectId,
          session_id: 'middle',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 2000,
          rating: 'good',
          recorded_at: oneHourAgo
        },
        {
          project_id: projectId,
          session_id: 'oldest',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 1000,
          rating: 'good',
          recorded_at: twoHoursAgo
        },
        {
          project_id: projectId,
          session_id: 'newest',
          route: '/',
          path: '/',
          device_type: 'desktop',
          metric_name: 'LCP',
          metric_value: 3000,
          rating: 'good',
          recorded_at: now
        }
      ]);

      const fetched = await fetchEvents({ projectId, limit: 10 });
      expect(fetched[0]?.session_id).toBe('newest');
      expect(fetched[1]?.session_id).toBe('middle');
      expect(fetched[2]?.session_id).toBe('oldest');
    });
  });
});
