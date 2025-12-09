import { type } from 'arktype';

export const webVitalRatings = ['good', 'needs_improvement', 'poor'] as const;

const WebVitalRating = type("'good' | 'needs_improvement' | 'poor'");

const WebVitalEvent = type({
  sessionId: 'string',
  route: 'string',
  metric: 'string',
  value: 'number',
  rating: WebVitalRating,
  'meta?': 'unknown',
  'recordedAt?': 'string'
});

const MetricsPayload = type([WebVitalEvent, '|', WebVitalEvent.array()]);

export type WebVitalRating = typeof WebVitalRating.infer;
export type WebVitalPayload = typeof WebVitalEvent.infer;
export type MetricsPayload = typeof MetricsPayload.infer;

export const validateMetricsPayload = MetricsPayload;
