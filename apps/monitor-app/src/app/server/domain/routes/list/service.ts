import { getProjectById } from '@/app/server/lib/clickhouse/repositories/projects-repository';
import {
  fetchRoutesListPage,
  fetchRoutesListTotalCount,
  fetchRoutesStatusDistribution
} from '@/app/server/lib/clickhouse/repositories/dashboard-routes-repository';
import { getAuthorizedSession } from '@/app/server/lib/auth-check';
import { getMetricThresholds, getRatingForValue } from '@/app/server/lib/cwv-thresholds';
import { toQuantileSummary } from '@/app/server/lib/quantiles';

import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type {
  ListRoutesQuery,
  ListRoutesResult,
  StatusDistribution
} from '@/app/server/domain/routes/list/types';

function emptyStatusDistribution(): StatusDistribution {
  return {
    good: 0,
    'needs-improvement': 0,
    poor: 0
  };
}

function isRating(value: string | null | undefined): value is WebVitalRatingV1 {
  return value === 'good' || value === 'needs-improvement' || value === 'poor';
}

export class RoutesListService {
  async list(query: ListRoutesQuery): Promise<ListRoutesResult> {
    await getAuthorizedSession();

    const project = await getProjectById(query.projectId);
    if (!project) {
      return { kind: 'project-not-found', projectId: query.projectId };
    }

    const thresholds = getMetricThresholds(query.metricName);
    if (!thresholds) {
      return { kind: 'unsupported-metric', metricName: query.metricName };
    }

    const baseFilters = {
      projectId: query.projectId,
      range: query.range,
      deviceType: query.deviceType
    } as const;

    const [rows, totalRoutes, distributionRows] = await Promise.all([
      fetchRoutesListPage({
        ...baseFilters,
        search: query.search,
        metricName: query.metricName,
        percentile: query.percentile,
        sort: query.sort,
        limit: query.page.limit,
        offset: query.page.offset
      }),
      fetchRoutesListTotalCount({ ...baseFilters, search: query.search }),
      fetchRoutesStatusDistribution({
        ...baseFilters,
        search: query.search,
        metricName: query.metricName,
        percentile: query.percentile,
        thresholds
      })
    ]);

    const items = rows.map((row) => {
      const quantiles = toQuantileSummary(row.percentiles);
      const metricValue = typeof row.metric_value === 'number' ? row.metric_value : null;
      const status = typeof metricValue === 'number' ? getRatingForValue(query.metricName, metricValue) : null;

      return {
        route: row.route,
        views: Number(row.views || 0),
        metricSampleSize: Number(row.metric_sample_size || 0),
        quantiles,
        metricValue,
        status
      };
    });

    const statusDistribution = emptyStatusDistribution();
    for (const row of distributionRows) {
      if (!isRating(row.status)) continue;
      statusDistribution[row.status] = Number(row.route_count || 0);
    }

    return {
      kind: 'ok',
      data: {
        totalRoutes,
        statusDistribution,
        items
      }
    };
  }
}
