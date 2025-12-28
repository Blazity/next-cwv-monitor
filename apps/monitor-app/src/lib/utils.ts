import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import zxcvbn from 'zxcvbn';
import { env } from '@/env';
import type { DateRange, MetricName, TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { chunk } from 'remeda';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const daysToNumber = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90
} as const;

export function validatePasswordStrength(password: string): { valid: true } | { valid: false; message: string } {
  const result = zxcvbn(password);

  if (result.score < env.MIN_PASSWORD_SCORE) {
    const feedback = result.feedback.warning || result.feedback.suggestions[0] || 'Please choose a stronger password';
    return { valid: false, message: feedback };
  }

  return { valid: true };
}

const secondsFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
});

export function formatMetricValue(metric: MetricName, value: number): string {
  if (metric === 'CLS') {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${secondsFormatter.format(value / 1000)}s`;
  }
  return `${Math.round(value)}ms`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
}

export function timeRangeToDateRange(timeRange: TimeRangeKey): DateRange {
  // Set end date to the end of the current day (23:59:59.999)
  // This ensures we include all data from today
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // Calculate start date by subtracting the time range days from the end date
  // Set to the beginning of that day (00:00:00.000) to include the full day
  const start = new Date(end);
  const days = daysToNumber[timeRange];
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

export function* chunkGenerator<T>({ array }: { array: T[] }) {
  const chunks = chunk(array, 1000);
  let currentChunkIndex = 0;
  for (const chunk of chunks) {
    console.log(`processing: ${currentChunkIndex} / ${array.length}`);
    yield chunk;
    currentChunkIndex += chunk.length;
  }
}

export function assertNever(v: never) {
  console.log(`Unexpected ${v} value, should be never`);
}
