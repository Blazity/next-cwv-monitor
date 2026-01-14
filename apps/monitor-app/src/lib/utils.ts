import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import zxcvbn from "zxcvbn";
import { env } from "@/env";
import type { DateRange, MetricName, TimeRangeKey } from "@/app/server/domain/dashboard/overview/types";
import { chunk, mapValues } from "remeda";
import { AuthRole } from "@/lib/auth-shared";
import { subDays } from "date-fns/subDays";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isObject = (value: unknown): value is object => {
  return typeof value === "object" && value !== null;
};

export const daysToNumber = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const;

export function validatePasswordStrength(password: string): { valid: true } | { valid: false; message: string } {
  const result = zxcvbn(password);

  if (result.score < env.MIN_PASSWORD_SCORE) {
    const feedback = result.feedback.warning || result.feedback.suggestions[0] || "Please choose a stronger password";
    return { valid: false, message: feedback };
  }

  return { valid: true };
}

const secondsFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatMetricValue(metric: MetricName, value: number): string {
  if (metric === "CLS") {
    return value.toFixed(3);
  }
  if (value >= 1000) {
    return `${secondsFormatter.format(value / 1000)}s`;
  }
  return `${Math.round(value)}ms`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
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
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

// User has to have any of the roles
export function hasAnyRoleOf(value: string | undefined | null, roles: AuthRole[]) {
  if (!value) return false;
  const userRoles = value.split(",");
  return roles.some((role) => userRoles.includes(role));
}

export function* chunkGenerator<T>({ array }: { array: T[] }) {
  const chunks = chunk(array, 1000);
  for (const chunk of chunks) yield chunk;
}

export function assertNever(v: never): never {
  throw new Error(`Unexpected ${v} value, should be never`);
}

export function capitalizeFirstLetter(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

export function capitalize(text?: string, removeUnderscore?: boolean) {
  if (!text) return text;
  let textToProcess = text;
  if (removeUnderscore) {
    textToProcess = textToProcess.replaceAll("_", " ");
  }
  return textToProcess
    .split(" ")
    .map((v) => capitalizeFirstLetter(v))
    .join(" ");
}


const NON_ASCII_CHARACTER_PATTERN = /[^\u0020-\u007E]/;
const PROTOCOL_PREFIX_PATTERN = /^([a-z0-9+.-]+:)?\/\//;

export const normalizeHostname = (input: string): string => {
  if (!input) return "";

  let host = input.trim().toLowerCase();

  host = host.replace(PROTOCOL_PREFIX_PATTERN, "");

  const pathIndex = host.search(/[/?#]/);
  if (pathIndex !== -1) host = host.slice(0, pathIndex);

  const atIndex = host.lastIndexOf("@");
  if (atIndex !== -1) host = host.slice(atIndex + 1);

  if (host.startsWith("[")) {
    const closingBracket = host.indexOf("]");
    if (closingBracket !== -1) host = host.slice(0, closingBracket + 1);
  } else {
    const colonIndex = host.indexOf(":");
    if (colonIndex !== -1) host = host.slice(0, colonIndex);
  }

  /**
   * Internationalized Domain Names (IDN) Check:
   * If the host contains non-ASCII characters (like "münchen.de"), we use the 
   * native URL API to convert it to Punycode ("xn--mnchen-3ya.de"). 
   * This ensures the hostname is valid for network requests.
   */
  if (NON_ASCII_CHARACTER_PATTERN.test(host)) {
    try {
      return new URL(`http://${host}`).hostname;
    } catch {
      return host;
    }
  }

  return host;
};

export const isDomainAuthorized = (requestOrigin: string | null, authorizedDomain: string): boolean => {
  const normalizedAuthorized = authorizedDomain.toLowerCase();
  
  if (normalizedAuthorized === "*") return true;
  if (!requestOrigin) return false;

  const normalizedRequest = normalizeHostname(requestOrigin);

  if (normalizedAuthorized.startsWith("*.")) {
    const baseDomain = normalizedAuthorized.slice(2);
    return normalizedRequest === baseDomain || normalizedRequest.endsWith(`.${baseDomain}`);
  }

  return normalizedRequest === normalizedAuthorized;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Formats a date consistently for display.
 * Uses Intl.DateTimeFormat with a fixed locale to ensure consistent
 * formatting between server and client (avoiding hydration errors).
 */
export function formatDate(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  return dateFormatter.format(d);
}

export function parseClickHouseNumbers<T extends object>(row: T): T {
  return mapValues(row, (val) => {
    if (typeof val === "string" && val !== "" && !Number.isNaN(Number(val))) {
      return Number(val);
    }
    return val;
  }) as T;
}

export const getPeriodDates = (range: TimeRangeKey) => {
  const days = daysToNumber[range];
  const now = new Date();

  const currentStart = subDays(now, days);
  const prevStart = subDays(currentStart, days);

  return { now, currentStart, prevStart };
};

export function coerceClickHouseDateTime(value: Date | string): Date {
  if (value instanceof Date) return value;

  // ClickHouse DateTime commonly comes back as `YYYY-MM-DD HH:mm:ss` (no timezone).
  // Treat that as UTC to avoid local-time parsing shifts.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }

  return new Date(value);
}
