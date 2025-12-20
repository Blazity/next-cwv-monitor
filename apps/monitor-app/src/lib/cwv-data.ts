export type Unit = 'second' | 'decimal';

export function getMetricUnit(metricName: string): Unit {
  return metricName === 'CLS' ? 'decimal' : 'second';
}

export function formatMetricValue(metric: Unit, value: number): string {
  if (metric === 'decimal') {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return `${Math.round(value)}ms`;
}
