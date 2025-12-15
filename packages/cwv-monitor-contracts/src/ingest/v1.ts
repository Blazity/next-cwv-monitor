import { type as arkType } from "arktype";

export const webVitalRatingsV1 = ["good", "needs-improvement", "poor"] as const;

export const WebVitalRatingV1Schema = arkType(
  "'good' | 'needs-improvement' | 'poor'"
);

export const WebVitalEventV1Schema = arkType({
  "sessionId?": "string",
  "route?": "string",
  "path?": "string",
  metric: "string",
  value: "number",
  rating: WebVitalRatingV1Schema,
  "connectionType?": "string",
  "navigationType?": "string",
  "recordedAt?": "string",
});

export const MetricsPayloadV1Schema = arkType([
  WebVitalEventV1Schema,
  "|",
  WebVitalEventV1Schema.array(),
]);

export const IngestPayloadV1Schema = arkType({
  projectId: "string.uuid",
  events: MetricsPayloadV1Schema,
});

export type WebVitalRatingV1 = typeof WebVitalRatingV1Schema.infer;
export type WebVitalEventV1 = typeof WebVitalEventV1Schema.infer;
export type MetricsPayloadV1 = typeof MetricsPayloadV1Schema.infer;
export type IngestPayloadV1 = typeof IngestPayloadV1Schema.infer;
