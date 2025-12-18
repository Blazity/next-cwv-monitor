import { randomUUID } from 'node:crypto';

import type { StartedTestContainer } from 'testcontainers';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

import { setupClickHouseContainer } from '@/test/clickhouse-test-utils';

let container: StartedTestContainer;
let sql: typeof import('@/app/server/lib/clickhouse/client').sql;
let createProject: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').createProject;
let getProjectById: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').getProjectById;
let getProjectBySlug: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').getProjectBySlug;
let listProjects: typeof import('@/app/server/lib/clickhouse/repositories/projects-repository').listProjects;

describe('projects-repository', () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import('@/app/server/lib/clickhouse/client'));
    ({ createProject, getProjectById, getProjectBySlug, listProjects } =
      await import('@/app/server/lib/clickhouse/repositories/projects-repository'));
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
  });

  describe('createProject', () => {
    it('creates a project with correct fields', async () => {
      const project = {
        id: randomUUID(),
        slug: 'test-project',
        name: 'Test Project'
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(project.id);
      expect(retrieved?.slug).toBe(project.slug);
      expect(retrieved?.name).toBe(project.name);
    });

    it('creates a project with timestamps', async () => {
      const project = {
        id: randomUUID(),
        slug: 'timestamp-test',
        name: 'Timestamp Test'
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved?.created_at).toBeDefined();
      expect(retrieved?.updated_at).toBeDefined();
    });

    it('accepts custom timestamps', async () => {
      const customDate = new Date('2024-01-15T10:00:00Z');
      const project = {
        id: randomUUID(),
        slug: 'custom-timestamp',
        name: 'Custom Timestamp',
        created_at: customDate,
        updated_at: customDate
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      const retrievedDate = new Date(retrieved!.created_at);
      expect(retrievedDate.getUTCFullYear()).toBe(2024);
      expect(retrievedDate.getUTCMonth()).toBe(0);
      expect(retrievedDate.getUTCDate()).toBe(15);
    });
  });

  describe('getProjectById', () => {
    it('retrieves project by id', async () => {
      const project = {
        id: randomUUID(),
        slug: 'get-by-id',
        name: 'Get By ID'
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(project.id);
    });

    it('returns null for non-existent id', async () => {
      const retrieved = await getProjectById(randomUUID());
      expect(retrieved).toBeNull();
    });
  });

  describe('getProjectBySlug', () => {
    it('retrieves project by slug', async () => {
      const project = {
        id: randomUUID(),
        slug: 'unique-slug-123',
        name: 'Slug Test'
      };

      await createProject(project);
      const retrieved = await getProjectBySlug(project.slug);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.slug).toBe(project.slug);
      expect(retrieved?.id).toBe(project.id);
    });

    it('returns null for non-existent slug', async () => {
      const retrieved = await getProjectBySlug('non-existent-slug');
      expect(retrieved).toBeNull();
    });
  });

  describe('listProjects', () => {
    it('lists projects ordered by creation date (newest first)', async () => {
      const now = new Date();
      const projects = [
        { id: randomUUID(), slug: 'project-a', name: 'Project A', created_at: new Date(now.getTime() - 2000) },
        { id: randomUUID(), slug: 'project-b', name: 'Project B', created_at: new Date(now.getTime() - 1000) },
        { id: randomUUID(), slug: 'project-c', name: 'Project C', created_at: now }
      ];

      for (const project of projects) {
        await createProject(project);
      }

      const listed = await listProjects();

      expect(listed).toHaveLength(3);
      expect(listed[0]?.slug).toBe('project-c');
      expect(listed[2]?.slug).toBe('project-a');
    });

    it('returns all projects', async () => {
      for (let i = 0; i < 5; i++) {
        await createProject({
          id: randomUUID(),
          slug: `project-${i}`,
          name: `Project ${i}`
        });
      }

      const listed = await listProjects();
      expect(listed).toHaveLength(5);
    });

    it('returns empty array when no projects exist', async () => {
      const listed = await listProjects();
      expect(listed).toEqual([]);
    });
  });
});
