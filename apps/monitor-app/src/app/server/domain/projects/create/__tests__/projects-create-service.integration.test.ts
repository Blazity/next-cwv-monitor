import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-utils', () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
}));

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let projectsCreateService: typeof import('../service').projectsCreateService;

describe('ProjectsCreateService (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ projectsCreateService } = await import('../service'));
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

    const result = await projectsCreateService.execute({
      name: 'New Project',
      slug: 'new-project'
    });

    expect(result).toEqual({ kind: 'unauthorized' });
  });

  it('successfully creates a new project', async () => {
    const input = {
      name: 'My Web App',
      slug: 'my-web-app'
    };

    const result = await projectsCreateService.execute(input);

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.projectId).toBeDefined();
      
      const rows = await sql`
        SELECT id, name, slug 
        FROM projects 
        WHERE id = ${result.projectId}
      `.query();

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(input.name);
      expect(rows[0].slug).toBe(input.slug);
    }
  });

  it('returns already-exists if the slug is taken', async () => {
    const slug = 'duplicate-slug';
    
    await projectsCreateService.execute({ name: 'First', slug });
    const result = await projectsCreateService.execute({ name: 'Second', slug });

    expect(result).toEqual({
      kind: 'already-exists',
      slug: slug
    });

    const rows = await sql`SELECT count() as count FROM projects WHERE slug = ${slug}`.query();
    expect(rows[0].count).toBe("1");
  });

  it('handles database errors gracefully', async () => {
    getAuthorizedSessionMock.mockRejectedValue(new Error('Unexpected Database Crash'));

    const result = await projectsCreateService.execute({
      name: 'Error Project',
      slug: 'error-project'
    });

    expect(result).toEqual({
      kind: 'error',
      message: 'Failed to create project'
    });
  });
});