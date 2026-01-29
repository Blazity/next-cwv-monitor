"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";

import { Card } from "@/components/ui/card";

import type { RegressionsSummary } from "@/app/server/domain/dashboard/regressions/list/types";

type RegressionsSummaryCardsProps = {
  summary: RegressionsSummary;
  isPending?: boolean;
};

export function RegressionsSummaryCards({ summary, isPending = false }: RegressionsSummaryCardsProps) {
  const avgLabel = typeof summary.avgDegradationPct === "number" ? `+${summary.avgDegradationPct.toFixed(1)}%` : "--";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="bg-card border-border gap-0 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-status-poor/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <TrendingDown className="text-status-poor h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Total regressions</div>
            <div className="text-foreground text-2xl font-semibold">
              {isPending ? (
                <span className="bg-muted inline-block h-8 w-14 animate-pulse rounded" />
              ) : (
                summary.totalRegressions.toLocaleString()
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border gap-0 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-status-needs-improvement/15 flex h-10 w-10 items-center justify-center rounded-lg">
            <AlertTriangle className="text-status-needs-improvement h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Critical</div>
            <div className="text-foreground text-2xl font-semibold">
              {isPending ? (
                <span className="bg-muted inline-block h-8 w-14 animate-pulse rounded" />
              ) : (
                summary.criticalRegressions.toLocaleString()
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-card border-border gap-0 p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <TrendingDown className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground text-sm">Avg. degradation</div>
            <div className="text-foreground text-2xl font-semibold">
              {isPending ? <span className="bg-muted inline-block h-8 w-20 animate-pulse rounded" /> : avgLabel}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
