import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import type { StartedTestContainer } from 'testcontainers';
import { faker } from '@faker-js/faker';

import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';
import { TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { subDays } from 'date-fns';
import { entries, randomInteger, length } from 'remeda';
import { randomUUID } from 'node:crypto';
import { daysToNumber } from '@/lib/utils';
import { InsertableCustomEventRow } from '@/app/server/lib/clickhouse/schema';

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let insertCustomEvents: typeof import('@/app/server/lib/clickhouse/repositories/custom-events-repository').insertCustomEvents;
let fetchEventsStatsData: typeof import('@/app/server/lib/clickhouse/repositories/custom-events-repository').fetchEventsStatsData;
let fetchTotalStatsEvents: typeof import('@/app/server/lib/clickhouse/repositories/custom-events-repository').fetchTotalStatsEvents;

let projectId: string;

const NUMBER_OF_SESSIONS = 100;
const sessions = Array.from({ length: NUMBER_OF_SESSIONS })
  .fill(0)
  .map((_, idx) => `cer-test-session-${idx}`);

const customEventNames = ['signed-up', 'logged-in', 'disabled-cookies'] as const;

const routePaths = {
  '/[blog]': ['/cwv-history', '/cwv-is-the-best-why', '/is-cwv-optimized'] as const,
  '/about': '/about'
} as const;

const getRandomSession = () => sessions[randomInteger(0, NUMBER_OF_SESSIONS - 1)];
const getRandomEvent = () => customEventNames[randomInteger(0, length(customEventNames) - 1)];

type GenerateCustomEvents<T extends typeof routePaths = typeof routePaths, Key extends keyof T = keyof T> = {
  numberOfEvents: number;
  range: TimeRangeKey;
  refDataObj: ReturnType<typeof prepareInsertTest>;
  backDays?: number;
  eventName?: '$page_view' | (typeof customEventNames)[number];
  direct?: {
    route: Key;
    path: T[Key] extends string ? T[Key] : T[Key][keyof T[Key]];
  };
};

const prepareInsertTest = () => {
  const toInsert: InsertableCustomEventRow[] = [];
  const usedEvents = new Set<string>();
  const usedSessions = new Set<string>();
  type ConversionSet = `${string},${string}`;
  const conversionSet = new Set<ConversionSet>();
  return { toInsert, usedEvents, usedSessions, conversionSet };
};

// Array mutable method
const generateEvents = <T extends typeof routePaths = typeof routePaths, Key extends keyof T = keyof T>({
  numberOfEvents,
  refDataObj,
  range,
  eventName,
  backDays,
  direct
}: GenerateCustomEvents<T, Key>) => {
  for (let i = 0; i < numberOfEvents; i++) {
    const event = eventName ?? getRandomEvent();
    const { path, route } = direct ?? getRandomRoute();
    refDataObj.usedEvents.add(event);
    const session_id = getRandomSession();
    const insertDate = getRandomDateInRange(range, backDays);
    refDataObj.usedSessions.add(session_id);

    if (event !== '$page_view') {
      refDataObj.conversionSet.add(`${session_id},${event}`);
    }

    refDataObj.toInsert.push({
      device_type: 'desktop',
      event_name: event,
      path: path as string,
      route: route as string,
      project_id: projectId,
      session_id,
      ingested_at: insertDate,
      recorded_at: insertDate
    });
  }
};

const getRandomRoute = () => {
  const routeEntries = entries(routePaths);
  const [route, paths] = routeEntries[randomInteger(0, length(routeEntries) - 1)];
  const path = typeof paths === 'string' ? paths : paths[randomInteger(0, length(paths) - 1)];
  return {
    path,
    route
  };
};

const getRandomDateInRange = (timeRange: TimeRangeKey, backDays = 0) => {
  const to = subDays(new Date(), backDays);
  return faker.date.between({
    from: subDays(to, daysToNumber[timeRange]),
    to
  });
};

describe('custom-events-repository', () => {
  const range: TimeRangeKey = '7d';
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ insertCustomEvents, fetchEventsStatsData, fetchTotalStatsEvents } =
      await import('@/app/server/lib/clickhouse/repositories/custom-events-repository'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));

    projectId = randomUUID();
    await createProject({ id: projectId, slug: 'ce-test', name: 'Custom Events Test' });
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE custom_events`.command();
  });

  describe('fetchTotalStatsEvents', () => {
    it('Should add one view to current range', async () => {
      const { path, route } = getRandomRoute();
      const insertDate = getRandomDateInRange(range);
      await insertCustomEvents([
        {
          device_type: 'desktop',
          event_name: '$page_view',
          path,
          route,
          project_id: projectId,
          session_id: getRandomSession(),
          ingested_at: insertDate,
          recorded_at: insertDate
        }
      ]);

      const data = await fetchTotalStatsEvents({ range, projectId });
      expect(data.total_views_cur).to.be.eq(1);
    });

    it('Should add one view to prev range', async () => {
      const { path, route } = getRandomRoute();
      const insertDate = getRandomDateInRange(range, daysToNumber[range] + 1);
      await insertCustomEvents([
        {
          device_type: 'desktop',
          event_name: '$page_view',
          path,
          route,
          project_id: projectId,
          session_id: getRandomSession(),
          ingested_at: insertDate,
          recorded_at: insertDate
        }
      ]);

      const data = await fetchTotalStatsEvents({ range, projectId });
      expect(data.total_views_prev).to.be.eq(1);
    });

    it('Should not include view in prev range', async () => {
      const { path, route } = getRandomRoute();
      const insertDate = getRandomDateInRange(range, daysToNumber[range] * 2);
      await insertCustomEvents([
        {
          device_type: 'desktop',
          event_name: '$page_view',
          path,
          route,
          project_id: projectId,
          session_id: getRandomSession(),
          ingested_at: insertDate,
          recorded_at: insertDate
        }
      ]);

      const data = await fetchTotalStatsEvents({ range, projectId });
      expect(data.total_views_prev).to.be.eq(0);
    });

    it('Should count view per session', async () => {
      const refDataObj = prepareInsertTest();
      const { toInsert, usedSessions } = refDataObj;
      generateEvents({
        numberOfEvents: 100,
        range,
        eventName: '$page_view',
        refDataObj
      });
      await insertCustomEvents(toInsert);
      const data = await fetchTotalStatsEvents({ range, projectId });
      expect(data.total_views_cur).to.be.eq(usedSessions.size);
      expect(data.total_events_cur).to.be.eq(0);
      expect(data.total_conversions_cur).to.be.eq(0);
    });

    it.skip('Should be very quick for large data', async () => {
      const refDataObj = prepareInsertTest();
      const { toInsert, usedSessions } = refDataObj;
      generateEvents({ numberOfEvents: 100, range, eventName: '$page_view', refDataObj });
      generateEvents({ numberOfEvents: 1_000_000, range, refDataObj });
      for (let i = 0; i < 100; i++) {
        const { path, route } = getRandomRoute();
        const insertDate = getRandomDateInRange(range);
        const session_id = getRandomSession();
        usedSessions.add(session_id);
        toInsert.push({
          device_type: 'desktop',
          event_name: '$page_view',
          path,
          route,
          project_id: projectId,
          session_id,
          ingested_at: insertDate,
          recorded_at: insertDate
        });
      }

      await insertCustomEvents(toInsert);
      const t1 = performance.now();
      await fetchTotalStatsEvents({ range, projectId });
      const t2 = performance.now();
      const executeTime = t2 - t1;
      // Expect query to be faster than 100ms
      expect(executeTime).to.be.lessThan(100);
    });

    it('Should calculate page visits based on `$page_view`', async () => {
      const freshData = prepareInsertTest();
      generateEvents({ numberOfEvents: 100, range, refDataObj: freshData, eventName: '$page_view' });
      const pageVisits = freshData.usedSessions.size;
      generateEvents({ numberOfEvents: 1000, range, refDataObj: freshData });

      const oldData = prepareInsertTest();
      generateEvents({ numberOfEvents: 100, range, refDataObj: oldData, backDays: 7, eventName: '$page_view' });
      const oldPageVisits = oldData.usedSessions.size;

      generateEvents({ numberOfEvents: 1000, range, refDataObj: oldData, backDays: 7 });
      await insertCustomEvents([...freshData.toInsert, ...oldData.toInsert]);

      const data = await fetchTotalStatsEvents({ projectId, range });

      expect(data.total_views_cur).to.be.eq(pageVisits);
      expect(data.total_views_prev).to.be.eq(oldPageVisits);
    });

    it('Should calculate conversions', async () => {
      const freshData = prepareInsertTest();
      generateEvents({ numberOfEvents: 1000, range, refDataObj: freshData });
      generateEvents({ numberOfEvents: 100, range, refDataObj: freshData, eventName: '$page_view' });

      await insertCustomEvents(freshData.toInsert);

      const data = await fetchTotalStatsEvents({ projectId, range });

      expect(data.total_conversions_cur).to.be.eq(freshData.conversionSet.size);
      expect(data.total_conversions_prev).to.be.eq(0);
    });

    it('Should calculate old conversions', async () => {
      const dataObj = prepareInsertTest();
      generateEvents({ numberOfEvents: 500, range, refDataObj: dataObj, backDays: 7 });
      generateEvents({ numberOfEvents: 100, range, refDataObj: dataObj, eventName: '$page_view', backDays: 7 });

      await insertCustomEvents(dataObj.toInsert);

      const data = await fetchTotalStatsEvents({ projectId, range });

      expect(data.total_conversions_prev).to.be.eq(dataObj.conversionSet.size);
      expect(data.total_conversions_cur).to.be.eq(0);
    });
  });

  describe.only('fetchEventsStatsData', () => {
    it.only('Verify compatibility between methods', async () => {
      const dataRef = prepareInsertTest();
      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: dataRef,
        eventName: 'logged-in',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });

      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: dataRef,
        eventName: '$page_view',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });

      const oldData = prepareInsertTest();
      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: oldData,
        backDays: 8,
        eventName: 'logged-in',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });
      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: oldData,
        backDays: 8,
        eventName: '$page_view',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });

      await insertCustomEvents([...oldData.toInsert, ...dataRef.toInsert]);
      const eventStats1 = await fetchEventsStatsData({ eventName: 'logged-in', projectId, range });
      const totalStats1 = await fetchTotalStatsEvents({ projectId, range });

      expect(totalStats1.total_conversions_cur).to.be.eq(eventStats1[0].conversions_cur);
      expect(totalStats1.total_views_cur).to.be.eq(eventStats1[0].views_cur);

      expect(totalStats1.total_conversions_prev).to.be.eq(eventStats1[0].conversions_prev);
      expect(totalStats1.total_views_prev).to.be.eq(eventStats1[0].views_prev);

      const newData = prepareInsertTest();
      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: newData,
        eventName: 'disabled-cookies',
        direct: { route: '/about', path: '/about' }
      });
      generateEvents({
        numberOfEvents: 100,
        range,
        refDataObj: newData,
        eventName: '$page_view',
        direct: { route: '/about', path: '/about' }
      });
      await insertCustomEvents(newData.toInsert);
      const eventStats2 = await fetchEventsStatsData({ eventName: 'logged-in', projectId, range });
      const totalStats2 = await fetchTotalStatsEvents({ projectId, range });
      expect(totalStats2.total_conversions_cur).to.not.be.eq(eventStats2[0].conversions_cur);
      expect(totalStats2.total_views_cur).to.not.be.eq(eventStats2[0].views_cur);

      expect(totalStats2.total_conversions_prev).to.be.eq(eventStats2[0].conversions_prev);
      expect(totalStats2.total_views_prev).to.be.eq(eventStats2[0].views_prev);
    });

    it('Should have valid array size for items', async () => {
      const dataRef = prepareInsertTest();
      generateEvents({
        numberOfEvents: 1,
        range,
        refDataObj: dataRef,
        eventName: 'logged-in',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });
      await insertCustomEvents(dataRef.toInsert);
      const eventStats1 = await fetchEventsStatsData({ eventName: 'logged-in', projectId, range });
      expect(eventStats1.length).to.be.eq(1);
      generateEvents({
        numberOfEvents: 1,
        range,
        refDataObj: dataRef,
        eventName: 'logged-in',
        direct: { route: '/[blog]', path: '/cwv-history' }
      });
      await insertCustomEvents(dataRef.toInsert);

      const eventStats2 = await fetchEventsStatsData({ eventName: 'logged-in', projectId, range });
      expect(eventStats2.length).to.be.eq(1);
      generateEvents({
        numberOfEvents: 1,
        range,
        refDataObj: dataRef,
        eventName: 'logged-in',
        direct: { route: '/about', path: '/about' }
      });
      await insertCustomEvents(dataRef.toInsert);

      const eventStats3 = await fetchEventsStatsData({ eventName: 'logged-in', projectId, range });
      expect(eventStats3.length).to.be.eq(2);
    });
  });
});
