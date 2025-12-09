import { scope } from 'arktype';

export const webVitalRatings = ['good', 'needs_improvement', 'poor'] as const;

const metricsScope = scope({
  WebVitalRating: "'good' | 'needs_improvement' | 'poor'",
  WebVitalEvent: {
    sessionId: 'string',
    route: 'string',
    metric: 'string',
    value: 'number',
    rating: 'WebVitalRating',
    'meta?': 'unknown',
    'recordedAt?': 'string'
  },
  MetricsPayload: 'WebVitalEvent | WebVitalEvent[]'
}).export();

export type WebVitalRating = typeof metricsScope.WebVitalRating.infer;
export type WebVitalPayload = typeof metricsScope.WebVitalEvent.infer;
export type MetricsPayload = typeof metricsScope.MetricsPayload.infer;

export const validateMetricsPayload = metricsScope.MetricsPayload;
