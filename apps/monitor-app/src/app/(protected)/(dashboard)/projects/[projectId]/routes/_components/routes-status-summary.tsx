"use client";

import { Eye } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { StatusDistribution } from "@/app/server/domain/routes/list/types";

type RoutesStatusSummaryProps = {
  percentileLabel: string;
  statusDistribution: StatusDistribution;
};

export function RoutesStatusSummary({ percentileLabel, statusDistribution }: RoutesStatusSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-status-good/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Eye className="text-status-good h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Good Routes ({percentileLabel})</div>
            <div className="text-foreground text-xl font-semibold">{statusDistribution.good.toLocaleString()}</div>
          </div>
        </div>
      </Card>
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-status-needs-improvement/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Eye className="text-status-needs-improvement h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Needs Improvement</div>
            <div className="text-foreground text-xl font-semibold">
              {statusDistribution["needs-improvement"].toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
      <Card className="bg-card border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-status-poor/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <Eye className="text-status-poor h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Poor Routes</div>
            <div className="text-foreground text-xl font-semibold">{statusDistribution.poor.toLocaleString()}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
