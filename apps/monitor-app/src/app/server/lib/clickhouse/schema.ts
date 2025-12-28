import type { DeviceType } from '@/app/server/lib/device-types';
import z from 'zod';

export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  events_display_settings?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export const eventDisplaySettingsSchema = z.preprocess(
  (v) => {
    if (typeof v !== 'string') return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  },
  z
    .record(
      z.string(),
      z.object({ isHidden: z.boolean().optional().default(false), customName: z.string().optional() })
    )
    .nullable()
);

export type EventDisplaySettingsSchema = z.infer<typeof eventDisplaySettingsSchema>;

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

export type UpdatableProjectRow = Omit<Partial<ProjectRow>, 'id' | 'created_at'> &
  Pick<ProjectRow, 'id' | 'created_at'>;

export type InsertableProjectRow = Omit<ProjectRow, 'created_at' | 'updated_at'> &
  Partial<Pick<ProjectRow, 'created_at' | 'updated_at'>>;

export type InsertableCwvEventRow = Omit<CwvEventRow, 'recorded_at' | 'ingested_at'> &
  Partial<Pick<CwvEventRow, 'recorded_at' | 'ingested_at'>>;

export type InsertableCustomEventRow = Omit<CustomEventRow, 'recorded_at' | 'ingested_at'> &
  Partial<Pick<CustomEventRow, 'recorded_at' | 'ingested_at'>>;

export type ProjectWithViews = ProjectRow & {
  trackedViews: number;
};
