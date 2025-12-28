import { randomUUID } from 'node:crypto';
import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

let container: StartedTestContainer;
let sqlClient: typeof import('@/app/server/lib/clickhouse/client').sql;
let service: typeof import('../service').projectsUpdateService;
let projectsRepo: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository');

describe('ProjectsUpdateService (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    const repoModule = await import('@/app/server/lib/clickhouse/repositories/projects-repository');
    const { sql } = await import('@/app/server/lib/clickhouse/client');
    const { projectsUpdateService } = await import('../service');

    projectsRepo = repoModule;
    sqlClient = sql;
    service = projectsUpdateService;
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sqlClient`TRUNCATE TABLE projects`.command();

    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns error if project does not exist', async () => {
    const result = await service.execute({
      id: randomUUID(),
      slug: 'missing',
      name: 'New Name'
    });

    expect(result).toEqual({ 
      kind: 'error', 
      message: 'Project not found.' 
    });
  });

  it('returns ok and does nothing if the name is identical', async () => {
    const projectId = randomUUID();
    const name = 'Original Name';
    
    await projectsRepo.createProject({ 
      id: projectId, 
      slug: 'orig-slug', 
      name 
    });

    const result = await service.execute({
      id: projectId,
      slug: 'new-slug',
      name: name
    });

    expect(result).toEqual({ kind: 'ok' });
    
    const rows = await sqlClient<{ slug: string }>`
      SELECT slug FROM projects WHERE id = ${projectId}
    `.query();
    
    expect(rows[0].slug).toBe('orig-slug');
  });

  it('successfully updates project name and slug', async () => {
    const projectId = randomUUID();
    await projectsRepo.createProject({ 
      id: projectId, 
      slug: 'old-slug', 
      name: 'Old Name' 
    });

    const result = await service.execute({
      id: projectId,
      name: 'Updated Name',
      slug: 'updated-slug'
    });

    expect(result).toEqual({ kind: 'ok' });

    const rows = await sqlClient<{ name: string; slug: string }>`
      SELECT name, slug FROM projects FINAL WHERE id = ${projectId}
    `.query();

    expect(rows[0].name).toBe('Updated Name');
    expect(rows[0].slug).toBe('updated-slug');
  });

  it('handles database errors gracefully during update', async () => {
    const projectId = randomUUID();
    await projectsRepo.createProject({ id: projectId, slug: 'test', name: 'Test' });

    const repoSpy = vi
      .spyOn(projectsRepo, 'getProjectById')
      .mockRejectedValue(new Error('ClickHouse Timeout'));

    const result = await service.execute({
      id: projectId,
      name: 'New Name',
      slug: 'new-slug'
    });

    expect(result).toEqual({
      kind: 'error',
      message: 'Failed to update project name.'
    });
    
    expect(repoSpy).toHaveBeenCalled();
  });

  it('preserves the original created_at timestamp', async () => {
    const projectId = randomUUID();
    const originalDate = new Date('2025-01-01T10:00:00Z');
    
    await projectsRepo.createProject({ 
      id: projectId, 
      slug: 'slug', 
      name: 'Name', 
      created_at: originalDate 
    });

    await service.execute({
      id: projectId,
      name: 'New Name',
      slug: 'new-slug'
    });

    const rows = await sqlClient<{ ts: string }>`
      SELECT toUnixTimestamp(created_at) as ts FROM projects WHERE id = ${projectId}
    `.query();

    const expectedTs = Math.floor(originalDate.getTime() / 1000);
    expect(Number(rows[0].ts)).toBe(expectedTs);
  });
});