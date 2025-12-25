import { randomUUID } from 'node:crypto';
import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-utils', () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
}));

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let projectsResetService: typeof import('../service').projectsResetService;

describe('ProjectsResetService (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ projectsResetService } = await import('../service'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE custom_events`.command();
    await sql`TRUNCATE TABLE cwv_daily_aggregates`.command();
    
    getAuthorizedSessionMock.mockReset();
    getAuthorizedSessionMock.mockResolvedValue({
      kind: 'authorized',
      user: { id: 'test-user' }
    });
  });

  it('returns unauthorized if session is invalid', async () => {
    getAuthorizedSessionMock.mockResolvedValue({ kind: 'unauthorized' });

    const result = await projectsResetService.execute(randomUUID());

    expect(result).toEqual({ kind: 'unauthorized' });
  });

  it('successfully resets project data but keeps the project record', async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'test-project', name: 'Test Project' });

    await sql`
      INSERT INTO cwv_events (project_id, session_id, route, metric_name, metric_value, recorded_at)
      VALUES (${projectId}, 's1', '/', 'LCP', 2500, now())
    `.command();

    await sql`
      INSERT INTO custom_events (project_id, session_id, route, event_name, recorded_at)
      VALUES (${projectId}, 's1', '/', 'button_click', now())
    `.command();

    await sql`
      INSERT INTO cwv_daily_aggregates (project_id, route, device_type, metric_name, event_date, sample_size)
      SELECT ${projectId}, '/', 'desktop', 'LCP', today(), countState()
    `.command();

    const result = await projectsResetService.execute(projectId);

    expect(result).toEqual({ kind: 'ok' });

    const cwvCount = await sql`SELECT count() as count FROM cwv_events WHERE project_id = ${projectId}`.query();
    const customCount = await sql`SELECT count() as count FROM custom_events WHERE project_id = ${projectId}`.query();
    const aggregateCount = await sql`SELECT count() as count FROM cwv_daily_aggregates WHERE project_id = ${projectId}`.query();

    expect(cwvCount[0].count).toBe("0");
    expect(customCount[0].count).toBe("0");
    expect(aggregateCount[0].count).toBe("0");

    const projectCount = await sql`SELECT count() as count FROM projects WHERE id = ${projectId}`.query();
    expect(projectCount[0].count).toBe("1");
  });

  it('handles errors gracefully during reset', async () => {
    getAuthorizedSessionMock.mockRejectedValue(new Error('Database Timeout'));

    const result = await projectsResetService.execute(randomUUID());

    expect(result).toEqual({
      kind: 'error',
      message: 'Failed to reset project data.'
    });
  });

  it('does not reset data from other projects', async () => {
    const targetId = randomUUID();
    const otherId = randomUUID();

    await createProject({ id: targetId, slug: 'target', name: 'Target' });
    await createProject({ id: otherId, slug: 'other', name: 'Other' });

    await sql`
      INSERT INTO cwv_events (project_id, session_id, route, metric_name, metric_value, recorded_at)
      VALUES (${otherId}, 's2', '/', 'LCP', 1000, now())
    `.command();

    await projectsResetService.execute(targetId);

    const otherDataCount = await sql`SELECT count() as count FROM cwv_events WHERE project_id = ${otherId}`.query();
    expect(otherDataCount[0].count).toBe("1");
  });
});