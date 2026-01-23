import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Route, TrendingDown, TrendingUp } from "lucide-react";
import { MetricName, QuickStatsData, StatusDistribution } from "@/app/server/domain/dashboard/overview/types";
import { type Route as NextRoute } from "next";
import { PersistParamsLink } from "@/components/dashboard/persist-params-link";

type QuickStatsProps = {
  projectId: string;
  queriedMetric: MetricName;
  data: QuickStatsData;
  statusDistribution: StatusDistribution;
};

export function QuickStats({ projectId, queriedMetric: selectedMetric, data, statusDistribution }: QuickStatsProps) {
  const { timeRangeLabel, totalViews, viewTrend } = data;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-sm font-medium">{selectedMetric} Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <StatusRow label="Good" count={statusDistribution.good} dotClass="bg-status-good" />
            <StatusRow
              label="Needs improvement"
              count={statusDistribution["needs-improvement"]}
              dotClass="bg-status-needs-improvement"
            />
            <StatusRow label="Poor" count={statusDistribution.poor} dotClass="bg-status-poor" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ActionLink
              href={`/projects/${projectId}/regressions`}
              icon={<TrendingDown className="text-status-poor h-4 w-4" />}
              label="View Regressions"
            />
            <ActionLink
              href={`/projects/${projectId}/routes`}
              icon={<Route className="text-muted-foreground h-4 w-4" />}
              label="Browse All Routes"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="px-6 pb-3">
          <CardTitle className="text-foreground text-sm font-medium">Tracked Views</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-foreground font-mono text-2xl font-semibold">
                {Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(totalViews)}
              </span>
              <div
                className={`flex items-center gap-0.5 text-xs ${viewTrend < 0 ? "text-status-poor" : "text-status-good"}`}
              >
                {viewTrend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>
                  {viewTrend > 0 ? "+" : ""}
                  {viewTrend}%
                </span>
              </div>
            </div>
            <div className="text-muted-foreground text-xs">vs previous {timeRangeLabel.toLowerCase()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({ label, count, dotClass }: { label: string; count: number; dotClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <span className="text-foreground font-mono text-sm">
        {count.toLocaleString()} {count === 1 ? "route" : "routes"}
      </span>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: NextRoute<`/projects/${string}`>;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <PersistParamsLink
      href={href}
      className="hover:bg-accent/50 group flex items-center justify-between rounded-md p-2 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-foreground text-sm">{label}</span>
      </div>
      <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </PersistParamsLink>
  );
}
