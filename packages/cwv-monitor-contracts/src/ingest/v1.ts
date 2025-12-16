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
  "recordedAt?": "string.date.iso.parse",
});

export const IngestPayloadV1Schema = arkType({
  projectId: "string.uuid",
  events: WebVitalEventV1Schema.array(),
});

export type WebVitalRatingV1 = typeof WebVitalRatingV1Schema.infer;
export type WebVitalEventV1 = typeof WebVitalEventV1Schema.infer;
export type IngestPayloadV1 = typeof IngestPayloadV1Schema.infer;

// "wire" / input types (pre-morph)
export type WebVitalEventV1In = typeof WebVitalEventV1Schema.inferIn;
export type IngestPayloadV1In = typeof IngestPayloadV1Schema.inferIn;
