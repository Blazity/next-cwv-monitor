import { randomUUID } from "node:crypto";
import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";

let container: StartedTestContainer;
let sqlClient: typeof import("@/app/server/lib/clickhouse/client").sql;
let service: typeof import("../service").projectsUpdateService;
let projectsRepo: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository");

describe("ProjectsUpdateService (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    const repoModule = await import("@/app/server/lib/clickhouse/repositories/projects-repository");
    const { sql } = await import("@/app/server/lib/clickhouse/client");
    const { projectsUpdateService } = await import("../service");

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

  it("returns error if project does not exist", async () => {
    const result = await service.execute({
      id: randomUUID(),
      domain: "missing",
      name: "New Name",
    });

    expect(result).toEqual({
      kind: "error",
      message: "Project not found.",
    });
  });

  it("returns ok and does nothing if the name and domain are identical", async () => {
    const projectId = randomUUID();
    const originalDate = new Date("2026-01-01T10:00:00Z");

    await projectsRepo.createProject({
      id: projectId,
      domain: "same-domain.com",
      name: "Same Name",
      created_at: originalDate,
      updated_at: originalDate,
    });

    const result = await service.execute({
      id: projectId,
      name: "Same Name",
      domain: "same-domain.com",
    });

    expect(result).toEqual({ kind: "ok" });

    const rows = await sqlClient<{ ts: string }>`
      SELECT toUnixTimestamp(updated_at) as ts FROM projects FINAL WHERE id = ${projectId}
    `.query();

    const expectedTs = Math.floor(originalDate.getTime() / 1000);
    expect(Number(rows[0].ts)).toBe(expectedTs);
  });

  it("successfully updates project name and domain", async () => {
    const projectId = randomUUID();
    await projectsRepo.createProject({
      id: projectId,
      domain: "old-domain.com",
      name: "Old Name",
    });

    const result = await service.execute({
      id: projectId,
      name: "Updated Name",
      domain: "updated-domain.com",
    });

    expect(result).toEqual({ kind: "ok" });

    const rows = await sqlClient<{ name: string; domain: string }>`
      SELECT name, domain FROM projects FINAL WHERE id = ${projectId}
    `.query();

    expect(rows[0].name).toBe("Updated Name");
    expect(rows[0].domain).toBe("updated-domain.com");
  });

  it("successfully updates events_display_settings (custom event display settings)", async () => {
    const projectId = randomUUID();
    await projectsRepo.createProject({ id: projectId, domain: "test", name: "Test" });

    const result = await service.execute({
      id: projectId,
      events_display_settings: {
        copy_snippet: { isHidden: false, customName: "elo" },
      },
    });

    expect(result).toEqual({ kind: "ok" });

    const updated = await projectsRepo.getProjectById(projectId);
    expect(updated?.events_display_settings).toEqual({
      copy_snippet: { isHidden: false, customName: "elo" },
    });
  });

  it("handles database errors gracefully during update", async () => {
    const projectId = randomUUID();
    await projectsRepo.createProject({ id: projectId, domain: "test", name: "Test" });

    const repoSpy = vi.spyOn(projectsRepo, "getProjectById").mockRejectedValue(new Error("ClickHouse Timeout"));

    const result = await service.execute({
      id: projectId,
      name: "New Name",
      domain: "new-domain.com",
    });

    expect(result).toEqual({
      kind: "error",
      message: "Failed to update project.",
    });

    expect(repoSpy).toHaveBeenCalled();
  });

  it("preserves the original created_at timestamp", async () => {
    const projectId = randomUUID();
    const originalDate = new Date("2026-01-01T10:00:00Z");

    await projectsRepo.createProject({
      id: projectId,
      domain: "domain.com",
      name: "Name",
      created_at: originalDate,
    });

    await service.execute({
      id: projectId,
      name: "New Name",
      domain: "new-domain.com",
    });

    const rows = await sqlClient<{ ts: string }>`
      SELECT toUnixTimestamp(created_at) as ts FROM projects WHERE id = ${projectId}
    `.query();

    const expectedTs = Math.floor(originalDate.getTime() / 1000);
    expect(Number(rows[0].ts)).toBe(expectedTs);
  });
});
