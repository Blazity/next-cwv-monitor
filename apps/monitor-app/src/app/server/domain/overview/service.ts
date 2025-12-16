import { z } from 'zod';
import { sql } from '@/app/server/lib/clickhouse/client';

const DeviceTypeSchema = z.enum(['mobile', 'desktop', 'tablet', 'all']);
const MetricNameSchema = z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const PercentileSchema = z.enum(['p50', 'p75', 'p90', 'p95', 'p99']);

type SqlFragment = ReturnType<typeof sql<Record<string, unknown>>>;
type DeviceType = z.infer<typeof DeviceTypeSchema>;
type MetricName = z.infer<typeof MetricNameSchema>;
type Percentile = z.infer<typeof PercentileSchema>;

const PERCENTILE_VALUE: Record<Percentile, string> = {
  p50: '0.5',
  p75: '0.75',
  p90: '0.9',
  p95: '0.95',
  p99: '0.99'
};

const QueryOptionsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  from: z.coerce.date().optional(),
  deviceType: DeviceTypeSchema.default('all')
});

export type QueryOptions = z.infer<typeof QueryOptionsSchema>;

const DEFAULT_DAYS_AGO = 90;

export class OverviewService {
  private readonly projectId: string;
  private readonly from: Date;
  private readonly deviceType: DeviceType;

  constructor(opts: QueryOptions) {
    const parsed = QueryOptionsSchema.parse(opts);

    this.projectId = parsed.projectId;
    this.deviceType = parsed.deviceType;
    this.from = parsed.from ?? this.getDefaultFromDate();
  }

  private getDefaultFromDate(): Date {
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_AGO);
    return d;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private buildWhereClause(metricName?: MetricName): SqlFragment {
    const from = this.formatDate(this.from);

    return sql`
      WHERE project_id = ${this.projectId}
        AND event_date >= toDate(${from})
        ${this.deviceType !== 'all' ? sql`AND device_type = ${this.deviceType}` : sql``}
        ${metricName ? sql`AND metric_name = ${metricName}` : sql``}
    `;
  }

  async getMetricsOverview() {
    const where = this.buildWhereClause();

    const result = await sql<{ metric_name: string; percentiles: number[] }>`
      SELECT 
        metric_name,
        quantilesMerge(0.5, 0.75, 0.9, 0.95, 0.99)(quantiles) AS percentiles
      FROM cwv_daily_aggregates
      ${where}
      GROUP BY metric_name
    `;

    return result.map((row) => ({
      metric_name: row.metric_name,
      p50: row.percentiles[0],
      p75: row.percentiles[1],
      p90: row.percentiles[2],
      p95: row.percentiles[3],
      p99: row.percentiles[4]
    }));
  }

  async getRoutesByMetric(metricName: MetricName = 'LCP', percentile: Percentile = 'p75') {
    const where = this.buildWhereClause(metricName);
    const pValue = PERCENTILE_VALUE[percentile];

    const result = await sql<{ route: string; value: number; total_sample_size: number }>`
      SELECT 
        route,
        quantileMerge(${sql.raw(pValue)})(quantiles) AS value,
        toUInt32(countMerge(sample_size)) AS total_sample_size
      FROM cwv_daily_aggregates
      ${where}
      GROUP BY route  
      ORDER BY value DESC
    `;

    return result.map((row) => ({
      route: row.route,
      value: row.value,
      total_sample_size: row.total_sample_size
    }));
  }

  async getTrendData(percentile: Percentile = 'p75') {
    const where = this.buildWhereClause();
    const pValue = PERCENTILE_VALUE[percentile];

    return sql<{
      event_date: string;
      lcp: number;
      inp: number;
      cls: number;
      fcp: number;
      ttfb: number;
      sample_size: number;
    }>`
      SELECT 
        event_date,
        maxIf(p_value, metric_name = 'LCP') AS lcp,
        maxIf(p_value, metric_name = 'INP') AS inp,
        maxIf(p_value, metric_name = 'CLS') AS cls,
        maxIf(p_value, metric_name = 'FCP') AS fcp,
        maxIf(p_value, metric_name = 'TTFB') AS ttfb,
        toUInt32(sum(sample_count)) AS sample_size
      FROM (
        SELECT 
          event_date,
          metric_name,
          quantileMerge(${sql.raw(pValue)})(quantiles) AS p_value,
          countMerge(sample_size) AS sample_count
        FROM cwv_daily_aggregates
        ${where}
        GROUP BY event_date, metric_name
      )
      GROUP BY event_date
      ORDER BY event_date ASC
    `;
  }

  async getFullOverview() {
    const [metrics, routes, trends] = await Promise.all([
      this.getMetricsOverview(),
      this.getRoutesByMetric(),
      this.getTrendData()
    ]);
    return { metrics, routes, trends };
  }
}
