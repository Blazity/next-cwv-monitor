import type { IngestCommand } from './types';
import type { RateLimiter, RateLimitResult } from '@/app/server/lib/rate-limit';
import type { InsertableCwvEventRow } from '@/app/server/lib/clickhouse/schema';
import { getProjectById } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import { insertEvents } from '@/app/server/lib/clickhouse/repositories/events-repository';
import { logger } from '@/app/server/lib/logger';

export type IngestServiceResult =
  | { kind: 'ok'; accepted: number }
  | { kind: 'rate-limit'; rate: RateLimitResult }
  | { kind: 'project-not-found'; projectId: string };

export class IngestService {
  constructor(private readonly rateLimiter: RateLimiter) {}

  async handle(command: IngestCommand): Promise<IngestServiceResult> {
    if (command.ip) {
      const rateResult = await this.rateLimiter.check(command.ip);
      if (!rateResult.ok) {
        return { kind: 'rate-limit', rate: rateResult };
      }
    }

    const project = await getProjectById(command.projectId);
    if (!project) {
      logger.warn({ projectId: command.projectId }, 'ingest.project_not_found');
      return {
        kind: 'project-not-found',
        projectId: command.projectId
      };
    }

    const now = new Date();
    const rows: InsertableCwvEventRow[] = command.events.map((event) => ({
      project_id: command.projectId,
      session_id: event.sessionId,
      route: event.route,
      path: event.path,
      device_type: event.deviceType,
      metric_name: event.metric,
      metric_value: event.value,
      rating: event.rating,
      recorded_at: event.recordedAt,
      ingested_at: now
    }));

    logger.info({ projectId: command.projectId, count: rows.length, ip: command.ip }, 'ingest.accepted');

    void insertEvents(rows)
      .then(() => {
        logger.info({ projectId: command.projectId, count: rows.length }, 'ingest.persisted');
      })
      .catch((error) => {
        logger.error({ projectId: command.projectId, err: error }, 'ingest.persist_failed');
      });

    return {
      kind: 'ok',
      accepted: rows.length
    };
  }
}
