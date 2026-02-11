import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { MetricName } from "@/app/server/domain/dashboard/overview/types";

const meta: Meta<typeof QuickStats> = {
  title: "Dashboard/QuickStats",
  component: QuickStats,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    queriedMetric: {
      control: "select",
      options: ["LCP", "INP", "CLS", "FCP", "TTFB"] as MetricName[],
    },
  },
};

export default meta;
type Story = StoryObj<typeof QuickStats>;

const baseData = {
  timeRangeLabel: "7 Days",
  totalViews: 1_250_000,
  viewTrend: 12.5,
};

const baseStatusDistribution = {
  good: 45,
  "needs-improvement": 12,
  poor: 5,
};

export const WithTrends: Story = {
  args: {
    projectId: "project-123",
    queriedMetric: "LCP",
    data: baseData,
    statusDistribution: baseStatusDistribution,
  },
};

export const NegativeTrend: Story = {
  args: {
    ...WithTrends.args,
    data: {
      ...baseData,
      totalViews: 8500,
      viewTrend: -4.2,
    },
    statusDistribution: baseStatusDistribution,
  },
};

export const ZeroState: Story = {
  args: {
    projectId: "project-empty",
    queriedMetric: "CLS",
    data: {
      timeRangeLabel: "24 Hours",
      totalViews: 0,
      viewTrend: 0,
    },
    statusDistribution: {
      good: 0,
      "needs-improvement": 0,
      poor: 0,
    },
  },
};
