import type { WebVitalRatingV1 } from 'cwv-monitor-contracts';
import type { DeviceType } from '@/app/server/lib/device-types';

export interface WebVitalEvent {
  sessionId: string;
  route: string;
  path: string;
  metric: string;
  value: number;
  rating: WebVitalRatingV1;
  recordedAt: Date;
  deviceType: DeviceType;
}

export interface IngestCommand {
  ip: string | null;
  projectId: string;
  events: WebVitalEvent[];
}
