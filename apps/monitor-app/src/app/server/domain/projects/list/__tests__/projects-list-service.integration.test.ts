import { randomUUID } from "node:crypto";

import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect, vi } from "vitest";

import { setupClickHouseContainer } from "@/test/clickhouse-test-utils";

const getAuthorizedSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-utils", () => ({
  getAuthorizedSession: getAuthorizedSessionMock,
  getServerSessionDataOrRedirect: vi.fn(async () => {
    const session = await getAuthorizedSessionMock();
    if (session.kind === "unauthorized") {
      throw new Error("Unauthorized");
    }
    return session;
  }),
}));

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let createProject: typeof import("@/app/server/lib/clickhouse/repositories/projects-repository").createProject;
let projectsListService: typeof import("../service").projectsListService;

describe("projects-list-service (integration)", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    ({ createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository"));
    ({ projectsListService } = await import("../service"));
  }, 120_000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_daily_aggregates`.command();
    getAuthorizedSessionMock.mockReset();
    getAuthorizedSessionMock.mockResolvedValue({
      session: {
        id: "test-session-id",
        userId: "test-user-id",
        token: "test-token",
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "test-user-id",
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("throws error when user is not authenticated", async () => {
    getAuthorizedSessionMock.mockResolvedValue({ kind: "unauthorized" });

    await expect(projectsListService.list()).rejects.toThrow("Unauthorized");
  });

  it("returns empty array when no projects exist", async () => {
    const result = await projectsListService.list();

    expect(result).toEqual([]);
    expect(getAuthorizedSessionMock).toHaveBeenCalled();
  });

  it("returns all projects", async () => {
    for (let i = 0; i < 5; i++) {
      await createProject({
        id: randomUUID(),
        domain: `project-${i}.com`,
        name: `Project ${i}`,
      });
    }

    const result = await projectsListService.list();

    expect(result).toHaveLength(5);
    expect(getAuthorizedSessionMock).toHaveBeenCalled();
  });

  it("returns projects with their respective tracked views count", async () => {
    const projectId1 = randomUUID();
    const projectId2 = randomUUID();

    await createProject({ id: projectId1, domain: "p1.com", name: "Project 1" });
    await createProject({ id: projectId2, domain: "p2.com", name: "Project 2" });

    await sql`
      INSERT INTO cwv_daily_aggregates 
        (project_id, route, device_type, metric_name, event_date, sample_size)
      SELECT ${projectId1}, '/', 'desktop', 'LCP', today(), countState()
      UNION ALL
      SELECT ${projectId1}, '/', 'desktop', 'LCP', yesterday(), countState()
      UNION ALL
      SELECT ${projectId2}, '/settings', 'mobile', 'LCP', today(), countState()
    `.command();

    const result = await projectsListService.listWithViews();

    expect(result).toHaveLength(2);

    const p1 = result.find((p) => p.id === projectId1);
    const p2 = result.find((p) => p.id === projectId2);

    expect(p1?.trackedViews).toBe(2);
    expect(p2?.trackedViews).toBe(1);
  });

  it("returns 0 tracked views for projects with no aggregate data (LEFT JOIN)", async () => {
    await createProject({ id: randomUUID(), domain: "empty.com", name: "Empty Project" });

    const result = await projectsListService.listWithViews();

    expect(result).toHaveLength(1);
    expect(result[0].trackedViews).toBe(0);
  });
});
