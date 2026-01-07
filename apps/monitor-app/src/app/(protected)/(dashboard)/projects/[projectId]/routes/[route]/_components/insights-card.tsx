import { AlertTriangle, CheckCircle2, Info, Lightbulb, type LucideIcon } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RouteDetail } from "@/app/server/domain/routes/detail/types";

type InsightKind = RouteDetail["insights"][number]["kind"];

const INSIGHT_META: Record<InsightKind, { icon: LucideIcon; className: string }> = {
  success: {
    icon: CheckCircle2,
    className: "text-status-good bg-status-good/10 border-status-good/20",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-status-needs-improvement bg-status-needs-improvement/10 border-status-needs-improvement/20",
  },
  info: {
    icon: Info,
    className: "text-muted-foreground bg-muted border-border",
  },
};

type InsightsCardProps = {
  insights: RouteDetail["insights"];
};

export function InsightsCard({ insights }: InsightsCardProps) {
  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-lg font-medium">
          <Lightbulb className="text-primary h-5 w-5" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-3">
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-sm">No insights available.</p>
          ) : (
            insights.map((insight) => {
              const meta = INSIGHT_META[insight.kind];
              const Icon = meta.icon;

              return (
                <div
                  key={`${insight.kind}:${insight.message}`}
                  className={cn("flex items-start gap-3 rounded-lg border p-3", meta.className)}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-foreground text-sm">{insight.message}</p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
      <CardFooter className="border-border border-t">
        <p className="text-muted-foreground text-xs">
          Insights are heuristic-based. Low sample sizes may affect accuracy.
        </p>
      </CardFooter>
    </Card>
  );
}
