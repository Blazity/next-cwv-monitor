import { MetricCard } from '@/components/dashboard/metric-card';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta: Meta<typeof MetricCard> = {
  title: 'Dashboard/CoreWebVitals/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-sm p-4 border rounded-xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MetricCard>;

export const GoodStatus: Story = {
  args: {
    metric: {
      metricName: 'LCP',
      sampleSize: 1000,
      status: 'good',
      quantiles: { p50: 1000, p75: 2400, p90: 3000, p95: 3500, p99: 4000 },
    },
  },
};

export const NeedsImprovement: Story = {
  args: {
    metric: {
      metricName: 'INP',
      sampleSize: 500,
      status: 'needs-improvement',
      quantiles: { p50: 150, p75: 350, p90: 550, p95: 700, p99: 900 },
    },
  },
};

export const PoorStatus: Story = {
  args: {
    metric: {
      metricName: 'CLS',
      sampleSize: 2000,
      status: 'poor',
      quantiles: { p50: 0.1, p75: 0.3, p90: 0.4, p95: 0.5, p99: 0.6 },
    },
  },
};

export const MissingData: Story = {
  args: {
    metric: {
      metricName: 'LCP',
      sampleSize: 0,
      status:'poor',
      quantiles: null,
    },
  },
};