import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { StartedTestContainer } from "testcontainers";
import { createClient } from "@clickhouse/client";
import { setupClickHouseContainer, optimizeAnomalies } from "@/test/clickhouse-test-utils";
import { seedAnomalyTestPattern } from "scripts/seed-demo-data.mjs";

let container: StartedTestContainer;
let adminClient: ReturnType<typeof createClient>;
let aiBridge: typeof import("@/app/server/domain/ai-bridge/service").aiBridge;

describe("AI Bridge Integration", () => {
  const PROJECT_ID = randomUUID();

  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;
    
    const { getDirectClient, sql } = await import("@/app/server/lib/clickhouse/client");
    const { createProject } = await import("@/app/server/lib/clickhouse/repositories/projects-repository");
    ({ aiBridge } = await import("@/app/server/domain/ai-bridge/service"));
    
    await createProject({
        id: PROJECT_ID,
        domain: "ai-test.com",
        name: "AI Test Project"
    });

    adminClient = getDirectClient();
    await seedAnomalyTestPattern(adminClient, PROJECT_ID);
    await optimizeAnomalies(sql);
  }, 120_000);

  afterAll(async () => {
    await adminClient.close();
    await container.stop();
  });

  it("should read the schema catalog", async () => {
    const catalog = await aiBridge.getSchemaCatalog();
    expect(catalog).toContain("ClickHouse Schema Catalog for AI Analyst");
    expect(catalog).toContain("cwv_events");
    expect(catalog).toContain("v_cwv_anomalies");
  });

  it("should execute SQL using template literals", async () => {
    const results = await aiBridge.executeSql<{ name: string }>`
      SELECT name FROM projects WHERE id = ${PROJECT_ID}
    `;
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("AI Test Project");
  });

  it("should execute SQL using raw string and params", async () => {
    const results = await aiBridge.executeSql<{ name: string }>(
      "SELECT name FROM projects WHERE id = {projectId:String}",
      { projectId: PROJECT_ID }
    );
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("AI Test Project");
  });

  it("should provide full anomaly context for LLM", async () => {
    const anomalies = await aiBridge.executeSql<{ anomaly_id: string }>`
      SELECT anomaly_id FROM v_cwv_anomalies WHERE project_id = ${PROJECT_ID} LIMIT 1
    `;
    
    expect(anomalies.length).toBeGreaterThan(0);
    const anomalyId = anomalies[0].anomaly_id;

    const context = await aiBridge.getAnomalyContext(anomalyId);
    
    expect(context).not.toBeNull();
    if (!context) throw new Error("Context should not be null");
    
    expect(context.anomaly.anomaly_id).toBe(anomalyId);
    expect(context.project?.id).toBe(PROJECT_ID);
    expect(context.recentTrend).toBeInstanceOf(Array);
    expect(context.schemaReference).toContain("cwv_events");
  });

  it("should fail if executing unsafe SQL (security check)", async () => {
    await expect(aiBridge.executeSql("DROP TABLE projects"))
      .rejects.toThrow();
  });
});
