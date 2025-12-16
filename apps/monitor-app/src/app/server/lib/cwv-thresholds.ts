import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';

export type MetricThresholds = {
  good: number;
  needsImprovement: number;
};

/**
 * Shared metric thresholds for status classification.
 *
 * Keep this as the single source of truth so UI/service logic stays consistent.
 * Thresholds are in milliseconds for timing metrics and unitless for CLS.
 */
const THRESHOLDS: Record<string, MetricThresholds> = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
  FCP: { good: 1800, needsImprovement: 3000 },
  FID: { good: 100, needsImprovement: 300 }
};

export function getMetricThresholds(metricName: string): MetricThresholds | null {
  return THRESHOLDS[metricName] ?? null;
}

export function getRatingForValue(metricName: string, value: number): WebVitalRatingV1 | null {
  const thresholds = getMetricThresholds(metricName);
  if (!thresholds) return null;

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}
