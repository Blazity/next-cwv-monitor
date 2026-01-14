import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export type WebVitalEvent = {
  sessionId: string;
  route: string;
  path: string;
  metric: string;
  value: number;
  rating: WebVitalRatingV1;
  recordedAt: Date;
  deviceType: DeviceType;
};

export type CustomEvent = {
  sessionId: string;
  route: string;
  path: string;
  name: string;
  recordedAt: Date;
  deviceType: DeviceType;
};

export type IngestCommand = {
  ip: string | null;
  projectId: string;
  origin: string | null;
  cwvEvents: WebVitalEvent[];
  customEvents: CustomEvent[];
};
