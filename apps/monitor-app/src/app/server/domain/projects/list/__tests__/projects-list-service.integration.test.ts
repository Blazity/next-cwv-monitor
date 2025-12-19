import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';

import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/server/lib/auth-check', () => ({
  getAuthorizedSession: getAuthorizedSessionMock
}));

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let ProjectsListService: typeof import('../service').ProjectsListService;

describe('projects-list-service (integration)', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ createProject } = await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
    ({ ProjectsListService } = await import('../service'));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
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

  it('throws error when user is not authenticated', async () => {
    getAuthorizedSessionMock.mockRejectedValue(new Error('Unauthorized'));

    const service = new ProjectsListService();

    await expect(service.list()).rejects.toThrow('Unauthorized');
  });

  it('returns empty array when no projects exist', async () => {
    const service = new ProjectsListService();
    const result = await service.list();

    expect(result).toEqual([]);
    expect(getAuthorizedSessionMock).toHaveBeenCalled();
  });

  it('returns all projects', async () => {
    for (let i = 0; i < 5; i++) {
      await createProject({
        id: randomUUID(),
        slug: `project-${i}`,
        name: `Project ${i}`
      });
    }

    const service = new ProjectsListService();
    const result = await service.list();

    expect(result).toHaveLength(5);
    expect(getAuthorizedSessionMock).toHaveBeenCalled();
  });
});
