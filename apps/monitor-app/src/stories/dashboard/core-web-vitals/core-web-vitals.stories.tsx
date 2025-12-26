import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CoreWebVitals } from '@/components/dashboard/core-web-vitals';
import { MetricOverviewItem } from '@/app/server/domain/dashboard/overview/types';

const meta: Meta<typeof CoreWebVitals> = {
  title: 'Dashboard/CoreWebVitals/Layout',
  component: CoreWebVitals,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CoreWebVitals>;

const fullMetricSet: MetricOverviewItem[] = [
    {
        metricName: 'LCP',
        sampleSize: 12_400,
        status: 'good',
        quantiles: {
          p50: 1700,
          p75: 2090,
          p90: 2530,
          p95: 2880,
          p99: 3430,
        },
      },
      {
        metricName: 'INP',
        sampleSize: 8500,
        status: 'needs-improvement',
        quantiles: {
          p50: 147,
          p75: 224,
          p90: 302,
          p95: 364,
          p99: 463,
        },
      },
      {
        metricName: 'CLS',
        sampleSize: 15_000,
        status: 'needs-improvement',
        quantiles: {
          p50: 0.057,
          p75: 0.102,
          p90: 0.156,
          p95: 0.202,
          p99: 0.269,
        },
      },
      {
        metricName: 'TTFB',
        sampleSize: 12_400,
        status: 'good',
        quantiles: {
          p50: 200,
          p75: 400,
          p90: 600,
          p95: 800,
          p99: 1200,
        },
      },
];

export const FullDashboard: Story = {
  args: {
    metricOverview: fullMetricSet,
  },
};

export const SingleMetric: Story = {
  args: {
    metricOverview: [fullMetricSet[0]],
  },
};