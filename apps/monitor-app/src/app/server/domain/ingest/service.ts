import type { RateLimiter, RateLimitResult } from "@/app/server/lib/rate-limit";
import type { InsertableCustomEventRow, InsertableCwvEventRow } from "@/app/server/lib/clickhouse/schema";
import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import { insertEvents } from "@/app/server/lib/clickhouse/repositories/events-repository";
import { insertCustomEvents } from "@/app/server/lib/clickhouse/repositories/custom-events-repository";
import { logger } from "@/app/server/lib/logger";
import { IngestCommand } from "@/app/server/domain/ingest/types";

export type IngestServiceResult =
  | { kind: "ok"; accepted: { cwv: number; custom: number } }
  | { kind: "rate-limit"; rate: RateLimitResult }
  | { kind: "project-not-found"; projectId: string }
  | { kind: "domain-mismatch"; requestDomain: string; authorizedDomain: string };

export class IngestService {
  constructor(private readonly rateLimiter: RateLimiter) {}

  async handle(command: IngestCommand): Promise<IngestServiceResult> {
    if (command.ip) {
      const rateResult = await this.rateLimiter.check(command.ip);
      if (!rateResult.ok) {
        return { kind: "rate-limit", rate: rateResult };
      }
    }

    const project = await getProjectById(command.projectId);

    if (!project) {
      logger.warn({ projectId: command.projectId }, "ingest.project_not_found");
      return {
        kind: "project-not-found",
        projectId: command.projectId,
      };
    }

    const requestDomain = command.origin
      ?.toLowerCase()
      .replace(/^https?:\/\//, "")
      .split(":")[0];

    const authorizedDomain = project.slug.toLowerCase();

    const isAuthorized =
      authorizedDomain === "*" ||
      (authorizedDomain.startsWith("*.")
        ? requestDomain?.endsWith(authorizedDomain.replace("*.", ""))
        : requestDomain === authorizedDomain);

    if (!isAuthorized) {
      logger.warn({ requestDomain, authorized: authorizedDomain }, "ingest.domain_mismatch");
      return {
        kind: "domain-mismatch",
        requestDomain: requestDomain ?? "unknown",
        authorizedDomain,
      };
    }

    const now = new Date();
    const cwvRows: InsertableCwvEventRow[] = command.cwvEvents.map((event) => ({
      project_id: command.projectId,
      session_id: event.sessionId,
      route: event.route,
      path: event.path,
      device_type: event.deviceType,
      metric_name: event.metric,
      metric_value: event.value,
      rating: event.rating,
      recorded_at: event.recordedAt,
      ingested_at: now,
    }));

    const customRows: InsertableCustomEventRow[] = command.customEvents.map((event) => ({
      project_id: command.projectId,
      session_id: event.sessionId,
      route: event.route,
      path: event.path,
      device_type: event.deviceType,
      event_name: event.name,
      recorded_at: event.recordedAt,
      ingested_at: now,
    }));

    logger.info(
      { projectId: command.projectId, cwvCount: cwvRows.length, customCount: customRows.length, ip: command.ip },
      "ingest.accepted",
    );

    if (cwvRows.length > 0) {
      void insertEvents(cwvRows)
        .then(() => {
          logger.info({ projectId: command.projectId, count: cwvRows.length }, "ingest.cwv_events.persisted");
        })
        .catch((error) => {
          logger.error({ projectId: command.projectId, err: error }, "ingest.cwv_events.persist_failed");
        });
    }

    if (customRows.length > 0) {
      void insertCustomEvents(customRows)
        .then(() => {
          logger.info({ projectId: command.projectId, count: customRows.length }, "ingest.custom_events.persisted");
        })
        .catch((error) => {
          logger.error({ projectId: command.projectId, err: error }, "ingest.custom_events.persist_failed");
        });
    }

    return {
      kind: "ok",
      accepted: { cwv: cwvRows.length, custom: customRows.length },
    };
  }
}
