import PercentileChart from '@/components/dashboard/percentile-chart';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const meta = {
  title: 'CWV-Custom-Components/Percentiles-Chart',
  component: PercentileChart,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {}
} satisfies Meta<typeof PercentileChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    percentiles: [
      { label: 'P50', value: 1800, type: 'good' },
      { label: 'P75', value: 2200, type: 'needs-improvement' },
      { label: 'P90', value: 2800, type: 'needs-improvement' },
      { label: 'P95', value: 3200, type: 'needs-improvement' },
      { label: 'P99', value: 4100, type: 'poor' }
    ],
    thresholds: { good: 2500, needsImprovement: 4000 },
    title: 'My test tooltip',
    fixedPercentile: true,
    value: 300,
    metric: 'LCP'
  }
};
