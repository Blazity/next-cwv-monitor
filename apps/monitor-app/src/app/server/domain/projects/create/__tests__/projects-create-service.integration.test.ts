import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";
import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";

let container: StartedTestContainer;
let sqlClient: typeof import("@/app/server/lib/clickhouse/client").sql;
let service: typeof import("../service").projectsCreateService;
let projectsRepo: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository");

describe("ProjectsCreateService (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    const repoModule = await import("@/app/server/lib/clickhouse/repositories/projects-repository");
    const { sql } = await import("@/app/server/lib/clickhouse/client");
    const { projectsCreateService } = await import("../service");

    projectsRepo = repoModule;
    sqlClient = sql;
    service = projectsCreateService;
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sqlClient`TRUNCATE TABLE projects`.command();

    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("successfully creates a new project", async () => {
    const input = {
      name: "My Web App",
      domain: "localhost",
    };

    const result = await service.execute(input);

    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.projectId).toBeDefined();

      const rows = await sqlClient<{ id: string; name: string; domain: string }>`
        SELECT id, name, domain 
        FROM projects FINAL
        WHERE id = ${result.projectId}
      `.query();

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe(input.name);
      expect(rows[0].domain).toBe(input.domain);
    }
  });

  it("returns already-exists if the domain is taken", async () => {
    const domain = "duplicate-domain.com";

    await service.execute({ name: "First", domain: domain });

    const result = await service.execute({ name: "Second", domain: domain });

    expect(result).toEqual({
      kind: "already-exists",
      domain: domain,
    });

    const rows = await sqlClient<{ count: string }>`
      SELECT count() as count FROM projects WHERE domain = ${domain}
    `.query();

    expect(Number(rows[0].count)).toBe(1);
  });

  it("handles database errors gracefully", async () => {
    const repoSpy = vi
      .spyOn(projectsRepo, "getProjectByDomain")
      .mockRejectedValue(new Error("ClickHouse Connection Timeout"));

    const result = await service.execute({
      name: "Error Project",
      domain: "error-project.com",
    });

    expect(result).toEqual({
      kind: "error",
      message: "Failed to create project",
    });

    expect(repoSpy).toHaveBeenCalled();
  });
});
