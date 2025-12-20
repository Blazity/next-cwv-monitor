import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MetricName } from '@/app/server/lib/clickhouse/repositories/dashboard-overview-repository';
import { QuickStats } from '@/components/dashboard/quick-stats';

const meta: Meta<typeof QuickStats> = {
  title: 'Dashboard/QuickStats',
  component: QuickStats,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    selectedMetric: {
      control: 'select',
      options: ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'] as MetricName[],
    },
  },
};

export default meta;
type Story = StoryObj<typeof QuickStats>;

const baseData = {
    statusDistribution: {
      good: 45,
      'needs-improvement': 12,
      poor: 5,
    },
    timeRangeLabel: '7 Days',
    totalViews: 1_250_000,
    viewTrend: 12.5,
};
  


export const WithTrends: Story = {
    args: {
      projectId: 'project-123',
      selectedMetric: 'LCP',
      data: baseData,
    },
};
  
export const NegativeTrend: Story = {
    args: {
      ...WithTrends.args,
      data: {
        ...baseData, // No optional chaining or assertions needed
        totalViews: 8500,
        viewTrend: -4.2,
      },
    },
};

export const ZeroState: Story = {
  args: {
    projectId: 'project-empty',
    selectedMetric: 'CLS',
    data: {
      statusDistribution: {
        good: 0,
        'needs-improvement': 0,
        poor: 0,
      },
      timeRangeLabel: '24 Hours',
      totalViews: 0,
      viewTrend: 0,
    },
  },
};