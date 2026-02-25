import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { StartedTestContainer } from "testcontainers";
import { createClient } from "@clickhouse/client";

import { setupClickHouseContainer, optimizeAnomalies } from "@/test/clickhouse-test-utils";
import { seedAnomalyTestPattern } from "../../scripts/seed-demo-data.mjs";

let container: StartedTestContainer;
let sql: typeof import("@/app/server/lib/clickhouse/client").sql;
let directClient: ReturnType<typeof createClient>;

describe("Anomaly Detection Logic & State", () => {
  const PROJECT_ID = randomUUID();
  const prevClickhouseHost = process.env.CLICKHOUSE_HOST;
  const prevClickhousePort = process.env.CLICKHOUSE_PORT;

  beforeAll(async () => {
    const setup = await setupClickHouseContainer();
    container = setup.container;

    process.env.CLICKHOUSE_HOST = setup.host;
    process.env.CLICKHOUSE_PORT = String(setup.port);

    ({ sql } = await import("@/app/server/lib/clickhouse/client"));
    
    directClient = createClient({
        url: `http://${setup.host}:${setup.port}`,
        database: "cwv_monitor_test",
        username: process.env.CLICKHOUSE_USER ?? "default",
        password: process.env.CLICKHOUSE_PASSWORD ?? "secret",
    });

    await seedAnomalyTestPattern(directClient, PROJECT_ID);
    await optimizeAnomalies(sql);
  }, 120_000);

  afterAll(async () => {
    await directClient.close();
    await container.stop();
    process.env.CLICKHOUSE_HOST = prevClickhouseHost;
    process.env.CLICKHOUSE_PORT = prevClickhousePort;
  });

  it("should detect the seeded pattern with a deterministic anomaly_id", async () => {
    const results = await sql<{ z_score: number; anomaly_id: string }>`
      SELECT z_score, anomaly_id FROM v_cwv_anomalies
      WHERE project_id = ${PROJECT_ID} AND route = '/checkout' AND metric_name = 'LCP'
    `;

    expect(results).toHaveLength(1);
    expect(results[0].z_score).toBeGreaterThan(3);
    expect(results[0].anomaly_id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("should provide enough metadata for LLM reasoning", async () => {
    const results = await sql<{
      metric_name: string;
      current_avg_raw: number;
      baseline_avg_raw: number;
      z_score: number;
    }>`
      SELECT * FROM v_cwv_anomalies 
      WHERE project_id = ${PROJECT_ID} AND z_score > 3
      LIMIT 1
    `;
    expect(results.length).toBeGreaterThan(0);
    const anomaly = results[0];
    const magnitude = anomaly.current_avg_raw / anomaly.baseline_avg_raw;
    expect(magnitude).toBeGreaterThan(3); 
    expect(anomaly.metric_name).toBe('LCP');
  });

  it("should integrate with processed_anomalies to identify 'new' alerts", async () => {
    const [detected] = await sql<{ anomaly_id: string; z_score: number }>`
      SELECT anomaly_id, z_score FROM v_cwv_anomalies 
      WHERE project_id = ${PROJECT_ID} AND route = '/checkout'
      LIMIT 1
    `;
    expect(detected).toBeDefined();

    const [processedBefore] = await sql`
      SELECT count() as count FROM processed_anomalies WHERE anomaly_id = ${detected.anomaly_id}
    `;
    expect(Number(processedBefore.count)).toBe(0);

    await directClient.insert({
      table: "processed_anomalies",
      values: [{
        anomaly_id: detected.anomaly_id,
        project_id: PROJECT_ID,
        metric_name: 'LCP',
        route: '/checkout',
        last_z_score: detected.z_score,
        status: 'notified'
      }],
      format: "JSONEachRow"
    });

    const anomaly = await sql`
      SELECT v.anomaly_id 
      FROM v_cwv_anomalies v
      LEFT JOIN processed_anomalies p ON v.anomaly_id = p.anomaly_id
      WHERE v.project_id = ${PROJECT_ID} AND p.anomaly_id IS NULL
    `;
    
    expect(anomaly).toHaveLength(0);
  });

  it("should enforce the 1-hour gap between baseline and current window", async () => {
    const now = new Date();
    const gapTime = new Date(now.setMinutes(0,0,0) - 30 * 60 * 1000);
    
    const isoGap = gapTime.toISOString().replace("T", " ").replace(/\..+/, "");

    const [before] = await sql<{ b_avg: number }>`
      SELECT baseline_avg_raw as b_avg FROM v_cwv_anomalies
      WHERE project_id = ${PROJECT_ID} AND route = '/checkout'
      LIMIT 1
    `;

    await directClient.insert({
      table: "cwv_events",
      values: [{
        project_id: PROJECT_ID,
        session_id: randomUUID(),
        route: "/checkout",
        metric_name: "LCP",
        metric_value: 10_000,
        recorded_at: isoGap,
      }],
      format: "JSONEachRow"
    });

    await optimizeAnomalies(sql);

    const [stats] = await sql<{ b_avg: number }>`
       SELECT baseline_avg_raw as b_avg FROM v_cwv_anomalies 
       WHERE project_id = ${PROJECT_ID} AND route = '/checkout'
      LIMIT 1
    `;
    
    expect(stats.b_avg).toBeCloseTo(before.b_avg);
  });

  it("should allow AI to break down anomaly by 'path'", async () => {

    const pathBreakdown = await sql`
      SELECT path, avg(metric_value) as avg_lcp, count() as samples
      FROM cwv_events
      WHERE project_id = ${PROJECT_ID} 
        AND route = '/checkout' 
        AND metric_name = 'LCP'
        AND recorded_at >= now() - INTERVAL 1 HOUR
      GROUP BY path
      ORDER BY avg_lcp DESC
    `;

    expect(pathBreakdown.length).toBeGreaterThan(0);
    expect(pathBreakdown[0].avg_lcp).toBeGreaterThan(7000);
  });

  it("should allow AI to correlate LCP with TTFB", async () => {
    const correlation = await sql<{ metric_name: string; avg_val: number }>`
      SELECT 
        metric_name, 
        avg(metric_value) as avg_val 
      FROM cwv_events
      WHERE project_id = ${PROJECT_ID} 
        AND session_id IN (
          SELECT session_id FROM cwv_events 
          WHERE project_id = ${PROJECT_ID} 
            AND metric_name = 'LCP' 
            AND metric_value > 5000
        )
      GROUP BY metric_name
    `;

    const ttfb = correlation.find((r) => r.metric_name === 'TTFB');
    const lcp = correlation.find((r) => r.metric_name === 'LCP');
    
    expect(ttfb).toBeDefined();
    expect(lcp?.avg_val).toBeGreaterThan(8000);
    expect(ttfb?.avg_val).toBeLessThan(1000); 
  });
});