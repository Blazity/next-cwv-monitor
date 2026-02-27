import { aiSql } from "@/app/server/lib/clickhouse/client";
import { logger } from "@/app/server/lib/logger";
import type { AnomalyRow } from "@/app/server/lib/clickhouse/schema";

export async function getNewAnomalies(): Promise<AnomalyRow[]> {
  try {
    const results = await aiSql<AnomalyRow>`
      SELECT 
        anomaly_id,
        project_id,
        route,
        metric_name,
        device_type,
        detection_time,
        current_avg_raw,
        baseline_avg_raw,
        z_score,
        sample_size,
        baseline_n
      FROM v_cwv_anomalies
      WHERE z_score > 3
    `;
    logger.info(`Found ${results.length} new anomalies`);
    return results;
  } catch (error) {
    logger.error("Failed to get new anomalies");
    throw error;
  }
}

export async function getUnprocessedAnomalies(projectId?: string): Promise<AnomalyRow[]> {
  try {
    const results = await aiSql<AnomalyRow>`
      SELECT
        v.anomaly_id,
        v.project_id,
        v.route,
        v.metric_name,
        v.device_type,
        v.detection_time,
        v.current_avg_raw,
        v.baseline_avg_raw,
        v.z_score,
        v.sample_size,
        v.baseline_n
      FROM v_cwv_anomalies v
      WHERE v.z_score > 3
      AND NOT EXISTS (
        SELECT 1 FROM processed_anomalies p 
        WHERE p.anomaly_id = v.anomaly_id 
        AND p.project_id = v.project_id
      )
      ${projectId ? aiSql`AND v.project_id = ${projectId}` : aiSql``}
    `;
    logger.info({ count: results.length, projectId }, "Found unprocessed anomalies");
    return results;
  } catch (error) {
    logger.error({ err: error, projectId }, "Failed to get unprocessed anomalies");
    throw error;
  }
}

export async function getAnomalyById(anomalyId: string): Promise<AnomalyRow | null> {
  try {
    const results = await aiSql<AnomalyRow>`
      SELECT 
        anomaly_id,
        project_id,
        route,
        metric_name,
        device_type,
        detection_time,
        current_avg_raw,
        baseline_avg_raw,
        z_score,
        sample_size,
        baseline_n
      FROM v_cwv_anomalies
      WHERE anomaly_id = ${anomalyId}
    `;
    return results[0] || null;
  } catch (error) {
    logger.error(`Failed to get anomaly by id: ${anomalyId}`);
    throw error;
  }
}

export async function getAnomaliesByProject(projectId: string): Promise<AnomalyRow[]> {
  try {
    const results = await aiSql<AnomalyRow>`
      SELECT 
        anomaly_id,
        project_id,
        route,
        metric_name,
        device_type,
        detection_time,
        current_avg_raw,
        baseline_avg_raw,
        z_score,
        sample_size,
        baseline_n
      FROM v_cwv_anomalies
      WHERE project_id = ${projectId}
      ORDER BY detection_time DESC
    `;
    return results;
  } catch (error) {
    logger.error(`Failed to get anomalies for project: ${projectId}`);
    throw error;
  }
}
