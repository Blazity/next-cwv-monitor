import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { insertProcessedAnomaly } from "@/app/server/lib/clickhouse/repositories/processed-anomalies-repository";
import { logger } from "@/app/server/lib/logger";
import type { NotificationPayload } from "@/app/server/domain/notifications/types";
import { dispatcher } from "@/app/server/domain/notifications/dispatcher";
import { getUnprocessedAnomalies } from "@/app/server/lib/clickhouse/repositories/anomalies-repository";
import { aiBridge } from "@/app/server/domain/ai-bridge/service";
import type { AnomalyRow } from "@/app/server/lib/clickhouse/schema";
import { env } from "@/env";

export class NotificationsService {
  async notifyNewAnomalies(): Promise<void> {
    if (!env.SLACK_WEBHOOK_URL && !env.TEAMS_WEBHOOK_URL) {
      return;
    }
    
    const anomalies = await getUnprocessedAnomalies();
    
    if (anomalies.length === 0) {
      return;
    }

    logger.info({ count: anomalies.length }, "New anomalies found. Notifying.");
    
    const promises = anomalies.map(anomaly => this.processAndNotify(anomaly));
    await Promise.allSettled(promises);
  }

  private async processAndNotify(anomaly: AnomalyRow): Promise<void> {
    const { anomaly_id, project_id, metric_name, route, device_type, z_score } = anomaly;
    
    try {
      const project = await getProjectById(project_id);
      if (!project) {
        logger.warn({ project_id, anomaly_id }, "Project not found. Cannot notify.");
        return;
      }

      const aiSummary = await aiBridge.getSummary(anomaly);
      const investigationUrl = await aiBridge.getInvestigationLink({ ...anomaly, project });

      const notification: NotificationPayload = {
        title: `Anomaly Detected: ${metric_name} on ${route}`,
        text: `Project: ${project.name}\nDevice: ${device_type}\n\n${aiSummary}`,
        fields: [
          { title: 'Route', value: route, short: true },
          { title: 'Metric', value: metric_name, short: true },
          { title: 'Current Avg (Raw)', value: anomaly.current_avg_raw.toFixed(2), short: true },
          { title: 'Baseline Avg (Raw)', value: anomaly.baseline_avg_raw.toFixed(2), short: true },
          { title: 'Z-Score', value: z_score.toFixed(2), short: true },
          { title: 'Samples', value: `Current: ${anomaly.sample_size}, Base: ${anomaly.baseline_n}`, short: false },
        ],
        actions: [
          {
            type: 'button',
            text: 'Investigate',
            url: investigationUrl,
            kind: 'investigate'
          },
          {
            type: 'button',
            text: 'Chat with AI',
            url: `${investigationUrl}&chat=true`,
            kind: 'chat'
          }
        ],
        metadata: {
          anomalyId: anomaly_id,
          projectId: project_id,
          metricName: metric_name
        }
      };

      await dispatcher.send(notification);
      logger.info({ anomaly_id }, "Notification sent.");

      await insertProcessedAnomaly({
        anomaly_id,
        project_id,
        metric_name,
        route,
        device_type,
        last_z_score: z_score,
        status: 'notified',
      });
      logger.info({ anomaly_id }, "Anomaly marked as notified.");

    } catch (error) {
      logger.error({ err: error, anomaly_id }, "Failed to process and notify for anomaly.");
    }
  }
}

export const notificationsService = new NotificationsService();

export const notifyNewAnomalies = () => notificationsService.notifyNewAnomalies();
