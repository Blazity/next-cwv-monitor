import type { WebVitalRatingV1 } from "cwv-monitor-contracts";
import type { BadgeProps } from "@/components/badge";

type StatusBadgeConfig = Pick<BadgeProps, "label" | "defaultIcon" | "type">;

export const statusToBadge = {
  good: {
    label: "Good",
    defaultIcon: true,
    type: "success",
  },
  "needs-improvement": {
    label: "Needs improvement",
    defaultIcon: true,
    type: "warning",
  },
  poor: {
    label: "Poor",
    defaultIcon: true,
    type: "error",
  },
} as const satisfies Record<WebVitalRatingV1, StatusBadgeConfig>;
