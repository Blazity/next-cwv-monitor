import pino from 'pino';
import cron from 'node-cron';
import { env } from "./env";

const logger = pino({ name: 'anomaly-worker', level: env.LOG_LEVEL });

async function runDetectionCycle() {
  logger.info("Starting anomaly detection cycle...");
  try {
    const { NotificationsService } = await import('@monitor-app/app/server/domain/notifications/service');
    const service = new NotificationsService();
    
    await service.notifyNewAnomalies();
    logger.info("Anomaly detection cycle finished.");
  } catch (error) {
    logger.error({ err: error }, "Error during detection cycle.");
  }
}

cron.schedule('30 * * * *', runDetectionCycle);

logger.info("Anomaly worker scheduled (30 * * * *).");

runDetectionCycle();

process.on('SIGTERM', () => {
  logger.info("Shutting down...");
  process.exit(0);
});
