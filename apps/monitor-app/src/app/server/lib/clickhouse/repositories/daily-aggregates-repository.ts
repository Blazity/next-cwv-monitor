import { DailySeriesPoint, DateRange, QuantileSummary, toDateOnlyString } from "@/app/server/domain/dashboard/overview/types";
import { sql } from "@/app/server/lib/clickhouse/client";
import type { DeviceType } from "@/app/server/lib/device-types";
import { toQuantileSummary } from "@/app/server/lib/quantiles";

type AggregateQueryOptions = {
  deviceType?: DeviceType;
};

type MetricOverview = {
  metric: string;
  sampleSize: number;
  quantiles: QuantileSummary | null;
};

export async function getProjectMetricOverview(
  projectId: string,
  range: DateRange,
  options: AggregateQueryOptions = {},
): Promise<MetricOverview[]> {
  const start = toDateOnlyString(range.start);
  const end = toDateOnlyString(range.end);
  const deviceType = options.deviceType;

  const query = sql<{ metric_name: string; quantiles: number[]; sample_size: string }>`
    SELECT
      metric_name,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS quantiles,
      countMerge(sample_size) AS sample_size
    FROM cwv_daily_aggregates
    WHERE project_id = ${projectId}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
  `;

  if (deviceType) {
    query.append(sql` AND device_type = ${deviceType}`);
  }

  query.append(sql`
    GROUP BY metric_name
  `);

  const rows = await query;

  return rows.map((row) => ({
    metric: row.metric_name,
    sampleSize: Number(row.sample_size),
    quantiles: toQuantileSummary(row.quantiles),
  }));
}

export async function getRouteDailySeries(
  projectId: string,
  route: string,
  metricName: string,
  range: DateRange,
  options: AggregateQueryOptions = {},
): Promise<DailySeriesPoint[]> {
  const start = toDateOnlyString(range.start);
  const end = toDateOnlyString(range.end);
  const deviceType = options.deviceType;

  const query = sql<{ event_date: string; quantiles: number[]; sample_size: string }>`
    SELECT
      event_date,
      quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS quantiles,
      countMerge(sample_size) AS sample_size
    FROM cwv_daily_aggregates
    WHERE project_id = ${projectId}
      AND route = ${route}
      AND metric_name = ${metricName}
      AND event_date BETWEEN toDate(${start}) AND toDate(${end})
  `;

  if (deviceType) {
    query.append(sql` AND device_type = ${deviceType}`);
  }

  query.append(sql`
    GROUP BY event_date
    ORDER BY event_date ASC
  `);

  const rows = await query;

  return rows.map((row) => ({
    date: row.event_date,
    sampleSize: Number(row.sample_size),
    quantiles: toQuantileSummary(row.quantiles),
  }));
}
