import type { DeviceType } from "@/app/server/lib/device-types";
import { type } from "arktype";

export type ProjectRow = {
  id: string;
  domain: string;
  name: string;
  events_display_settings?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const eventSettings = type({
  isHidden: "boolean = false",
  "customName?": "string",
});

export const eventDisplaySettingsSchema = type({
  "[string]": eventSettings.or("undefined"),
}).or("null");

export type EventDisplaySettings = typeof eventDisplaySettingsSchema.infer;

export type CwvEventRow = {
  project_id: string;
  session_id: string;
  route: string;
  path: string;
  device_type: DeviceType;
  metric_name: string;
  metric_value: number;
  rating: string;
  recorded_at: Date | string;
  ingested_at: Date | string;
};

export type CustomEventRow = {
  project_id: string;
  session_id: string;
  route: string;
  path: string;
  device_type: DeviceType;
  event_name: string;
  recorded_at: Date | string;
  ingested_at: Date | string;
};

export type CwvDailyAggregateRow = {
  project_id: string;
  route: string;
  device_type: DeviceType;
  metric_name: string;
  event_date: Date | string;
  quantiles: unknown;
  sample_size: unknown;
};

export type ClickHouseSchema = {
  projects: ProjectRow;
  cwv_events: CwvEventRow;
  custom_events: CustomEventRow;
  cwv_daily_aggregates: CwvDailyAggregateRow;
};

export type TableName = keyof ClickHouseSchema;

export type TableRow<TName extends TableName> = ClickHouseSchema[TName];

export type UpdatableProjectRow = Omit<Partial<ProjectRow>, "id" | "created_at"> &
  Pick<ProjectRow, "id" | "created_at">;

export type InsertableProjectRow = Omit<ProjectRow, "created_at" | "updated_at"> &
  Partial<Pick<ProjectRow, "created_at" | "updated_at">>;

export type InsertableCwvEventRow = Omit<CwvEventRow, "recorded_at" | "ingested_at"> &
  Partial<Pick<CwvEventRow, "recorded_at" | "ingested_at">>;

export type InsertableCustomEventRow = Omit<CustomEventRow, "recorded_at" | "ingested_at"> &
  Partial<Pick<CustomEventRow, "recorded_at" | "ingested_at">>;

export type ProjectWithViews = ProjectRow & {
  trackedViews: number;
};

export type AnomalyRow = {
  anomaly_id: string;
  project_id: string;
  route: string;
  metric_name: string;
  device_type: string;
  detection_time: Date | string;
  current_avg_raw: number;
  baseline_avg_raw: number;
  z_score: number;
  sample_size: number;
  baseline_n: number;
};

export type InsertableProcessedAnomalyRow = {
  anomaly_id: string;
  project_id: string;
  metric_name: string;
  route: string;
  device_type: string;
  last_z_score: number;
  notified_at?: Date;
  status?: "new" | "notified" | "acknowledged" | "resolved";
  updated_at?: Date;
};

export type ProcessedAnomalyRow = InsertableProcessedAnomalyRow & {
  notified_at: Date;
  status: "new" | "notified" | "acknowledged" | "resolved";
  updated_at: Date;
};
