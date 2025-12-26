import { randomUUID } from 'node:crypto';
import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

let container: StartedTestContainer;
let sqlClient: typeof import('@/app/server/lib/clickhouse/client').sql;
let service: typeof import('../service').projectsDeleteService;
let projectsRepo: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository');

describe('ProjectsDeleteService (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    const repoModule = await import('@/app/server/lib/clickhouse/repositories/projects-repository');
    const { sql } = await import('@/app/server/lib/clickhouse/client');
    const { projectsDeleteService } = await import('../service');

    projectsRepo = repoModule;
    sqlClient = sql;
    service = projectsDeleteService;
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sqlClient`TRUNCATE TABLE projects`.command();
    await sqlClient`TRUNCATE TABLE cwv_events`.command();
    await sqlClient`TRUNCATE TABLE custom_events`.command();
    await sqlClient`TRUNCATE TABLE cwv_daily_aggregates`.command();

    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('successfully deletes a project and all related telemetry data', async () => {
    const projectId = randomUUID();
    
    await projectsRepo.createProject({ id: projectId, slug: 'test-project', name: 'Test Project' });

    await sqlClient`
      INSERT INTO cwv_events (project_id, session_id, route, metric_name, metric_value, recorded_at)
      VALUES (${projectId}, 's1', '/', 'LCP', 2500, now())
    `.command();

    await sqlClient`
      INSERT INTO custom_events (project_id, session_id, route, event_name, recorded_at)
      VALUES (${projectId}, 's1', '/', 'button_click', now())
    `.command();

    await sqlClient`
      INSERT INTO cwv_daily_aggregates (project_id, route, device_type, metric_name, event_date, sample_size)
      SELECT ${projectId}, '/', 'desktop', 'LCP', today(), countState()
    `.command();

    const result = await service.execute(projectId);

    expect(result).toEqual({ kind: 'ok' });

    const projectCount = await sqlClient<{ count: string }>`SELECT count() as count FROM projects WHERE id = ${projectId}`.query();
    const cwvCount = await sqlClient<{ count: string }>`SELECT count() as count FROM cwv_events WHERE project_id = ${projectId}`.query();
    const customCount = await sqlClient<{ count: string }>`SELECT count() as count FROM custom_events WHERE project_id = ${projectId}`.query();
    const aggCount = await sqlClient<{ count: string }>`SELECT count() as count FROM cwv_daily_aggregates WHERE project_id = ${projectId}`.query();

    expect(Number(projectCount[0].count)).toBe(0);
    expect(Number(cwvCount[0].count)).toBe(0);
    expect(Number(customCount[0].count)).toBe(0);
    expect(Number(aggCount[0].count)).toBe(0);
  });

  it('handles database errors gracefully during deletion', async () => {
    const repoSpy = vi
      .spyOn(projectsRepo, 'deleteProject')
      .mockRejectedValue(new Error('ClickHouse Deletion Failed'));

    const result = await service.execute(randomUUID());

    expect(result).toEqual({
      kind: 'error',
      message: 'Failed to delete project.'
    });

    expect(repoSpy).toHaveBeenCalled();
  });

  it('does not delete data from other projects', async () => {
    const targetId = randomUUID();
    const otherId = randomUUID();

    await projectsRepo.createProject({ id: targetId, slug: 'target', name: 'Target' });
    await projectsRepo.createProject({ id: otherId, slug: 'other', name: 'Other' });

    await service.execute(targetId);

    const rows = await sqlClient<{ count: string }>`
      SELECT count() as count FROM projects WHERE id = ${otherId}
    `.query();
    
    expect(Number(rows[0].count)).toBe(1);
  });
});