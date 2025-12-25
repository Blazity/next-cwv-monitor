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
let projectsUpdateService: typeof import('../service').projectsUpdateService;

describe('ProjectsUpdateService (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ projectsUpdateService } = await import('../service'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    
    getAuthorizedSessionMock.mockReset();
    getAuthorizedSessionMock.mockResolvedValue({
      kind: 'authorized',
      user: { id: 'test-user' }
    });
  });

  it('returns unauthorized if session is invalid', async () => {
    getAuthorizedSessionMock.mockResolvedValue({ kind: 'unauthorized' });

    const result = await projectsUpdateService.execute({
      id: randomUUID(),
      slug: 'any',
      name: 'New Name'
    });

    expect(result).toEqual({ kind: 'unauthorized' });
  });

  it('returns error if project does not exist', async () => {
    const result = await projectsUpdateService.execute({
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
    await createProject({ id: projectId, slug: 'orig-slug', name });

    const result = await projectsUpdateService.execute({
      id: projectId,
      slug: 'new-slug',
      name: name
    });

    expect(result).toEqual({ kind: 'ok' });
    
    const project = await sql`SELECT slug FROM projects WHERE id = ${projectId}`.query();
    expect(project[0].slug).toBe('orig-slug');
  });

  it('successfully updates project name and slug', async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'old-slug', name: 'Old Name' });

    const result = await projectsUpdateService.execute({
      id: projectId,
      name: 'Updated Name',
      slug: 'updated-slug'
    });

    expect(result).toEqual({ kind: 'ok' });

    const rows = await sql`
      SELECT name, slug FROM projects FINAL WHERE id = ${projectId}
    `.query();

    expect(rows[0].name).toBe('Updated Name');
    expect(rows[0].slug).toBe('updated-slug');
  });

  it('handles database errors gracefully during update', async () => {
    const projectId = randomUUID();
    await createProject({ id: projectId, slug: 'test', name: 'Test' });

    getAuthorizedSessionMock.mockRejectedValue(new Error('ClickHouse Timeout'));

    const result = await projectsUpdateService.execute({
      id: projectId,
      name: 'New Name',
      slug: 'new-slug'
    });

    expect(result).toEqual({
      kind: 'error',
      message: 'Failed to update project name.'
    });
  });

  it('preserves the original created_at timestamp', async () => {
    const projectId = randomUUID();
    const originalDate = new Date('2025-01-01T10:00:00Z');
    
    await createProject({ 
      id: projectId, 
      slug: 'slug', 
      name: 'Name', 
      created_at: originalDate 
    });

    await projectsUpdateService.execute({
      id: projectId,
      name: 'New Name',
      slug: 'new-slug'
    });

    const rows = await sql`
      SELECT toUnixTimestamp(created_at) as ts FROM projects WHERE id = ${projectId}
    `.query();

    const expectedTs = Math.floor(originalDate.getTime() / 1000);
    expect(Number(rows[0].ts)).toBe(expectedTs);
  });
});