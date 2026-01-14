import { Badge } from "@/components/badge";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = {
  title: "CWV-Custom-Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    LeftIcon: {
      control: false,
    },
    type: {
      // control: 'radio',
      options: ["success", "warning", "error"],
    },
    size: {
      // control: 'select',
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: "Succees",
  },
};
