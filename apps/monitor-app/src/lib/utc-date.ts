/**
 * UTC date utilities for working with dates in UTC timezone.
 * 
 * We use native JavaScript UTC methods instead of date-fns because:
 * - date-fns operates in local timezone by default
 * - date-fns-tz adds ~34KB for functionality we can achieve with native methods
 * - We need consistent UTC formatting to match backend (ClickHouse) date keys
 */

/**
 * Convert a Date to UTC timestamp at start of day (00:00:00)
 */
export function toUTCTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Format a Date as YYYY-MM-DD in UTC timezone
 */
export function toISODateUTC(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get the start of week (Sunday) timestamp in UTC for a given UTC timestamp
 */
export function getStartOfWeekUTC(timestamp: number): number {
  const date = new Date(timestamp);
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const msPerDay = 24 * 60 * 60 * 1000;
  return timestamp - (dayOfWeek * msPerDay);
}

/**
 * Get UTC year and month from a Date
 */
export function getUTCYearMonth(date: Date): { year: number; month: number } {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  };
}

/**
 * Format a Date as "YYYY-MM-DD HH:00:00" for hour granularity in UTC
 */
export function toHourKeyUTC(date: Date): string {
  return date.toISOString().slice(0, 13).replace("T", " ") + ":00:00";
}
