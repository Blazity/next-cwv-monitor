import { randomUUID } from "node:crypto";
import type { StartedTestContainer } from "testcontainers";
import { describe, beforeAll, afterAll, beforeEach, it, expect } from "vitest";
import { createClient } from "@clickhouse/client";
import { setupClickHouseContainer, optimizeAnomalies } from "@/test/clickhouse-test-utils";
import { seedAnomalyTestPattern } from "scripts/seed-demo-data.mjs";

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let getUnprocessedAnomalies: typeof import("../anomalies-repository").getUnprocessedAnomalies;
let insertProcessedAnomaly: typeof import("../processed-anomalies-repository").insertProcessedAnomaly;
let createProject: typeof import("../projects-repository").createProject;
let adminClient: ReturnType<typeof createClient>;

describe("anomalies-repository integration", () => {
  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    const { sql: sqlImport, getDirectClient } = await import("@/app/server/lib/clickhouse/client");
    sql = sqlImport;
    
    ({ getUnprocessedAnomalies } = await import("../anomalies-repository"));
    ({ insertProcessedAnomaly } = await import("../processed-anomalies-repository"));
    ({ createProject } = await import("../projects-repository"));

    adminClient = getDirectClient();
  }, 120_000);

  afterAll(async () => {
    await adminClient.close();
    await container.stop();
  });

  beforeEach(async () => {
    await sql`TRUNCATE TABLE projects`.command();
    await sql`TRUNCATE TABLE cwv_events`.command();
    await sql`TRUNCATE TABLE cwv_stats_hourly`.command();
    await sql`TRUNCATE TABLE processed_anomalies`.command();
  });

  it("should detect and track processed anomalies using seeded pattern", async () => {
    const projectId = randomUUID();
    await createProject({
      id: projectId,
      domain: "test.com",
      name: "Test Project",
    });

    await seedAnomalyTestPattern(adminClient, projectId);
    
    await optimizeAnomalies(sql);

    const anomalies = await getUnprocessedAnomalies();
    
    expect(anomalies.length).toBeGreaterThan(0);
    
    const anomaly = anomalies.find(a => a.project_id === projectId && a.metric_name === 'LCP');
    
    if (anomaly === undefined) {
      throw new Error("Anomaly not found");
    }
    
    expect(anomaly.z_score).toBeGreaterThan(3);

    await insertProcessedAnomaly({
      anomaly_id: anomaly.anomaly_id,
      project_id: anomaly.project_id,
      metric_name: anomaly.metric_name,
      route: anomaly.route,
      device_type: anomaly.device_type,
      last_z_score: anomaly.z_score,
      status: "notified",
    });

    const afterProcessing = await getUnprocessedAnomalies();
    expect(afterProcessing.find(a => a.anomaly_id === anomaly.anomaly_id)).toBeUndefined();
  }, 60_000);
});
