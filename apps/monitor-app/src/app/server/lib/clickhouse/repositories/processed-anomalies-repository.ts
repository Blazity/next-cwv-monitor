import { aiSql } from "@/app/server/lib/clickhouse/client";
import { logger } from "@/app/server/lib/logger";
import type { InsertableProcessedAnomalyRow } from "@/app/server/lib/clickhouse/schema";

export async function insertProcessedAnomaly(anomaly: InsertableProcessedAnomalyRow): Promise<void> {
  try {
    await aiSql`
      INSERT INTO processed_anomalies (
        anomaly_id, 
        project_id, 
        metric_name, 
        route, 
        device_type, 
        last_z_score, 
        status,
        updated_at
      ) VALUES (
        ${anomaly.anomaly_id},
        ${anomaly.project_id},
        ${anomaly.metric_name},
        ${anomaly.route},
        ${anomaly.device_type},
        ${anomaly.last_z_score},
        ${anomaly.status ?? 'new'},
        now64(3)
      )
    `.command();
    logger.info({ anomaly_id: anomaly.anomaly_id }, "Anomaly marked as processed");
  } catch (error) {
    logger.error({ err: error, anomaly_id: anomaly.anomaly_id }, "Failed to insert processed anomaly");
    throw error;
  }
}
