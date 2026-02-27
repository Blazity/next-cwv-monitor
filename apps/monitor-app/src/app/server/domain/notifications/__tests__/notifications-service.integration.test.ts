import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyNewAnomalies } from '@/app/server/domain/notifications/service';
import * as anomaliesRepo from '@/app/server/lib/clickhouse/repositories/anomalies-repository';
import * as projectsRepo from '@/app/server/lib/clickhouse/repositories/projects-repository';
import * as processedAnomaliesRepo from '@/app/server/lib/clickhouse/repositories/processed-anomalies-repository';
import { dispatcher } from '@/app/server/domain/notifications/dispatcher';

import { env } from '@/env';
import type { AnomalyRow, ProjectRow } from '@/app/server/lib/clickhouse/schema';

vi.mock('@/env', () => ({
  env: {
    SLACK_WEBHOOK_URL: 'http://slack.com',
    TEAMS_WEBHOOK_URL: undefined,
    AUTH_BASE_URL: 'http://localhost:3000',
    AI_ANALYST_CLICKHOUSE_USER: 'ai_analyst_user',
    AI_ANALYST_CLICKHOUSE_PASSWORD: 'secret',
  },
}));
vi.mock('@/app/server/lib/clickhouse/repositories/anomalies-repository');
vi.mock('@/app/server/lib/clickhouse/repositories/projects-repository');
vi.mock('@/app/server/lib/clickhouse/repositories/processed-anomalies-repository');
vi.mock('@/app/server/domain/notifications/dispatcher');

describe('notifyNewAnomalies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as unknown as Record<string, string | undefined>).SLACK_WEBHOOK_URL = 'http://slack.com';
    (env as unknown as Record<string, string | undefined>).TEAMS_WEBHOOK_URL = undefined;
  });

  it('should skip check if no webhooks are configured', async () => {
    (env as unknown as Record<string, string | undefined>).SLACK_WEBHOOK_URL = undefined;
    (env as unknown as Record<string, string | undefined>).TEAMS_WEBHOOK_URL = undefined;

    await notifyNewAnomalies();

    expect(anomaliesRepo.getUnprocessedAnomalies).not.toHaveBeenCalled();
  });

  it('should process and notify for new anomalies', async () => {
    const mockAnomaly: Partial<AnomalyRow> = {
      anomaly_id: '1',
      project_id: 'p1',
      metric_name: 'LCP',
      route: '/',
      device_type: 'desktop',
      z_score: 4.5,
      current_avg_raw: 2500,
      baseline_avg_raw: 1000,
      sample_size: 100,
      baseline_n: 1000,
      detection_time: new Date().toISOString()
    };

    const mockProject: Partial<ProjectRow> = {
      id: 'p1',
      name: 'Test Project',
      domain: 'test.com'
    };

    vi.mocked(anomaliesRepo.getUnprocessedAnomalies).mockResolvedValue([mockAnomaly as AnomalyRow]);
    vi.mocked(projectsRepo.getProjectById).mockResolvedValue(mockProject as ProjectRow);

    await notifyNewAnomalies();

    expect(dispatcher.send).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('LCP'),
      text: expect.stringContaining('Test Project')
    }));

    expect(processedAnomaliesRepo.insertProcessedAnomaly).toHaveBeenCalledWith(expect.objectContaining({
      anomaly_id: '1',
      status: 'notified'
    }));
  });

  it('should not notify if no anomalies are found', async () => {
    vi.mocked(anomaliesRepo.getUnprocessedAnomalies).mockResolvedValue([]);

    await notifyNewAnomalies();

    expect(dispatcher.send).not.toHaveBeenCalled();
  });
});
