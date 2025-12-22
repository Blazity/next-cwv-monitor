import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import zxcvbn from "zxcvbn";
import { env } from "@/env";
import type { MetricName } from "@/app/server/domain/dashboard/overview/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  minimumFractionDigits: 0
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
    maximumFractionDigits: 1
  }).format(value);
}
