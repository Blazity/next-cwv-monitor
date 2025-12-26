import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import zxcvbn from 'zxcvbn';
import { env } from '@/env';
import { randomInt } from 'node:crypto';
import type { DateRange, MetricName, TimeRangeKey } from '@/app/server/domain/dashboard/overview/types';
import { AuthRole } from '@/lib/auth';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const daysToNumber = {
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

function pick(str: string) {
  return str[randomInt(0, str.length)];
}
function shuffle(arr: string[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateTempPassword(length = 16) {
  if (length < 12) throw new Error('Use length >= 12 for decent security.');

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{};:,.?';

  const all = lower + upper + digits + symbols;

  // Ensure complexity requirements
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];

  while (chars.length < length) chars.push(pick(all));

  return shuffle(chars).join('');
}

// User have to have ALL roles
export function hasRoles(value: string | undefined | null, roles: AuthRole[]) {
  if (!value) return false;
  const userRoles = value.split(',');
  return roles.every((role) => userRoles.includes(role));
}

export function assertNever(v: never) {
  console.error(`Failed, expected ${v} to be never`);
}
