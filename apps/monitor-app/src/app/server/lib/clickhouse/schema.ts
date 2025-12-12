import type { DeviceType } from '@/app/server/lib/device-types';

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  created_at: Date | string;
  updated_at: Date | string;
};

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
  cwv_daily_aggregates: CwvDailyAggregateRow;
};

export type TableName = keyof ClickHouseSchema;

export type TableRow<TName extends TableName> = ClickHouseSchema[TName];

export type InsertableProjectRow = Omit<ProjectRow, 'created_at' | 'updated_at'> &
  Partial<Pick<ProjectRow, 'created_at' | 'updated_at'>>;

export type InsertableCwvEventRow = Omit<CwvEventRow, 'recorded_at' | 'ingested_at'> &
  Partial<Pick<CwvEventRow, 'recorded_at' | 'ingested_at'>>;
