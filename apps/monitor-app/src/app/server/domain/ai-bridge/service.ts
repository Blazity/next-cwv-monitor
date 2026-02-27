import fs from "node:fs/promises";
import path from "node:path";
import { AnomalyRow, ProjectRow } from "@/app/server/lib/clickhouse/schema";
import { env } from "@/env";
import { aiSql, getDirectAiClient } from "@/app/server/lib/clickhouse/client";
import { getAnomalyById } from "@/app/server/lib/clickhouse/repositories/anomalies-repository";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { logger } from "@/app/server/lib/logger";

export class AiBridgeService {
  async getSummary(_anomaly: AnomalyRow): Promise<string> {
    return "Statistical anomaly detected. Click 'Investigate' to start AI diagnosis.";
  }

  async getInvestigationLink(data: AnomalyRow & { project: ProjectRow }): Promise<string> {
    const baseUrl = env.AUTH_BASE_URL.replace(/\/$/, '');
    return `${baseUrl}/projects/${data.project.id}/regressions?anomalyId=${data.anomaly_id}`;
  }

  async executeSql<T = unknown>(
    query: string | TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    try {
      if (typeof query !== "string" && "raw" in query) {
        return await aiSql<T>(query, ...values);
      }

      const queryString = query as string;
      const params = (values[0] as Record<string, unknown> | undefined) ?? {};
      
      const client = getDirectAiClient();
      const resultSet = await client.query({
        query: queryString,
        format: 'JSONEachRow',
        query_params: params,
      });
      
      return await resultSet.json<T>();
    } catch (error) {
      logger.error({ err: error, query: String(query) }, "AI Agent SQL execution failed");
      throw error;
    }
  }

  async getSchemaCatalog(): Promise<string> {
    try {
      const catalogPath = path.join(process.cwd(), "clickhouse", "catalog.yml");
      return await fs.readFile(catalogPath, "utf8");
    } catch (error) {
      logger.error({ err: error }, "Failed to read schema catalog");
      return "# Schema catalog unavailable";
    }
  }

  async getAnomalyContext(anomalyId: string) {
    const anomaly = await getAnomalyById(anomalyId);
    if (!anomaly) return null;

    const project = await getProjectById(anomaly.project_id);
    
    const trend = await this.executeSql<Record<string, unknown>>(`
      SELECT 
        toStartOfHour(recorded_at) as hour,
        avg(metric_value) as avg_value,
        count() as sample_count
      FROM cwv_events
      WHERE project_id = {projectId:String}
        AND metric_name = {metricName:String}
        AND route = {route:String}
        AND recorded_at >= now() - INTERVAL 24 HOUR
      GROUP BY hour
      ORDER BY hour ASC
    `, { 
      projectId: anomaly.project_id, 
      metricName: anomaly.metric_name, 
      route: anomaly.route 
    });

    return {
      anomaly,
      project: project ? { id: project.id, name: project.name, domain: project.domain } : null,
      recentTrend: trend,
      schemaReference: await this.getSchemaCatalog()
    };
  }
}

export const aiBridge = new AiBridgeService();

export const getAiSummary = async (anomaly: AnomalyRow) => aiBridge.getSummary(anomaly);
export const getDynamicAiAnalysis = async (anomalyId: string) => {
  const context = await aiBridge.getAnomalyContext(anomalyId);
  return context ? JSON.stringify(context, null, 2) : "Anomaly not found.";
};
