import { ArkErrors } from "arktype";

import { getProjectById } from "@/app/server/lib/clickhouse/repositories/projects-repository";
import {
  fetchRegressionsListPage,
  fetchRegressionsSummary,
} from "@/app/server/lib/clickhouse/repositories/dashboard-regressions-repository";
import { getMetricThresholds } from "@/app/server/lib/cwv-thresholds";
import { projectIdSchema } from "@/app/server/domain/projects/schema";
import { getAuthorizedSession } from "@/lib/auth-utils";

import type {
  ListRegressionsQuery,
  ListRegressionsResult,
  RegressionsSummary,
} from "@/app/server/domain/dashboard/regressions/list/types";

function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  return {
    start: new Date(previousEnd.getTime() - duration),
    end: previousEnd,
  };
}

export class RegressionsListService {
  async listAuthorized(query: ListRegressionsQuery): Promise<ListRegressionsResult> {
    await getAuthorizedSession();
    return this.list(query);
  }

  async list(query: ListRegressionsQuery): Promise<ListRegressionsResult> {
    const validatedProjectId = projectIdSchema(query.projectId);
    if (validatedProjectId instanceof ArkErrors) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: "project-not-found", projectId: query.projectId };
    }

    const previousRange = getPreviousPeriod(query.range.start, query.range.end);
    const criticalThresholds = {
      LCP: getMetricThresholds("LCP").needsImprovement,
      INP: getMetricThresholds("INP").needsImprovement,
      CLS: getMetricThresholds("CLS").needsImprovement,
      TTFB: getMetricThresholds("TTFB").needsImprovement,
    } as const;

    const [summaryRow, rows] = await Promise.all([
      fetchRegressionsSummary({
        projectId: query.projectId,
        deviceType: query.deviceType,
        currentRange: query.range,
        previousRange,
        metric: query.metric,
        search: query.search,
        criticalThresholds,
      }),
      fetchRegressionsListPage({
        projectId: query.projectId,
        deviceType: query.deviceType,
        currentRange: query.range,
        previousRange,
        metric: query.metric,
        search: query.search,
        sort: query.sort,
        limit: query.page.limit,
        offset: query.page.offset,
      }),
    ]);

    const summary: RegressionsSummary = {
      baseTotalRegressions: Number(summaryRow.base_total_regressions || 0),
      totalRegressions: Number(summaryRow.total_regressions || 0),
      criticalRegressions: Number(summaryRow.critical_regressions || 0),
      avgDegradationPct: typeof summaryRow.avg_degradation_pct === "number" ? summaryRow.avg_degradation_pct : null,
    };

    const items = rows.map((row) => ({
      route: row.route,
      metricName: row.metric_name,
      previousValue: row.previous_value,
      currentValue: row.current_value,
      change: row.change,
      views: Number(row.views || 0),
    }));

    return { kind: "ok", data: { summary, items } };
  }
}
