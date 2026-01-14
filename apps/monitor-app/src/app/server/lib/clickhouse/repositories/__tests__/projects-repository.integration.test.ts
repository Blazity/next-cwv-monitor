import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";

import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let getProjectById: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").getProjectById;
let getProjectByDomain: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").getProjectByDomain;
let listProjects: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").listProjects;

describe("projects-repository", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ createProject, getProjectById, getProjectByDomain, listProjects } =
      await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
  });

  describe("createProject", () => {
    it("creates a project with correct fields", async () => {
      const project = {
        id: randomUUID(),
        domain: "test-project.com",
        name: "Test Project",
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(project.id);
      expect(retrieved?.domain).toBe(project.domain);
      expect(retrieved?.name).toBe(project.name);
    });

    it("creates a project with timestamps", async () => {
      const project = {
        id: randomUUID(),
        domain: "timestamp-test.com",
        name: "Timestamp Test",
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved?.created_at).toBeDefined();
      expect(retrieved?.updated_at).toBeDefined();
    });

    it("accepts custom timestamps", async () => {
      const customDate = new Date("2024-01-15T10:00:00Z");
      const project = {
        id: randomUUID(),
        domain: "custom-timestamp.com",
        name: "Custom Timestamp",
        created_at: customDate,
        updated_at: customDate,
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      const retrievedDate = new Date(retrieved!.created_at);
      expect(retrievedDate.getUTCFullYear()).toBe(2024);
      expect(retrievedDate.getUTCMonth()).toBe(0);
      expect(retrievedDate.getUTCDate()).toBe(15);
    });
  });

  describe("getProjectById", () => {
    it("retrieves project by id", async () => {
      const project = {
        id: randomUUID(),
        domain: "get-by-id.com",
        name: "Get By ID",
      };

      await createProject(project);
      const retrieved = await getProjectById(project.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(project.id);
    });

    it("returns null for non-existent id", async () => {
      const retrieved = await getProjectById(randomUUID());
      expect(retrieved).toBeNull();
    });
  });

  describe("getProjectByDomain", () => {
    it("retrieves project by domain", async () => {
      const project = {
        id: randomUUID(),
        domain: "unique-domain-123.com",
        name: "Domain Test",
      };

      await createProject(project);
      const retrieved = await getProjectByDomain(project.domain);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.domain).toBe(project.domain);
      expect(retrieved?.id).toBe(project.id);
    });

    it("returns null for non-existent domain", async () => {
      const retrieved = await getProjectByDomain("non-existent-domain");
      expect(retrieved).toBeNull();
    });
  });

  describe("listProjects", () => {
    it("lists projects ordered by creation date (newest first)", async () => {
      const now = new Date();
      const projects = [
        { id: randomUUID(), domain: "project-a.com", name: "Project A", created_at: new Date(now.getTime() - 2000) },
        { id: randomUUID(), domain: "project-b.com", name: "Project B", created_at: new Date(now.getTime() - 1000) },
        { id: randomUUID(), domain: "project-c.com", name: "Project C", created_at: now },
      ];

      for (const project of projects) {
        await createProject(project);
      }

      const listed = await listProjects();

      expect(listed).toHaveLength(3);
      expect(listed[0]?.domain).toBe("project-c.com");
      expect(listed[2]?.domain).toBe("project-a.com");
    });

    it("returns all projects", async () => {
      for (let i = 0; i < 5; i++) {
        await createProject({
          id: randomUUID(),
          domain: `project-${i}.com`,
          name: `Project ${i}`,
        });
      }

      const listed = await listProjects();
      expect(listed).toHaveLength(5);
    });

    it("returns empty array when no projects exist", async () => {
      const listed = await listProjects();
      expect(listed).toEqual([]);
    });
  });
});
