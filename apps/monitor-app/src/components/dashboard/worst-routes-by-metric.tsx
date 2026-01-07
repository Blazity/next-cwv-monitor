import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Route } from 'lucide-react';
import Link from 'next/link';
import { RouteHelpTooltip } from '@/components/dashboard/route-help-tooltip';
import { MetricName, WorstRouteItem } from '@/app/server/domain/dashboard/overview/types';
import { Badge } from '@/components/badge';
import { formatCompactNumber, formatMetricValue } from '@/lib/utils';
import { statusToBadge } from '@/consts/status-to-badge';

type WorstRoutesByMetricProps = {
  projectId: string;
  metricName: MetricName;
  routes: WorstRouteItem[];
};

export async function WorstRoutesByMetric({ projectId, metricName, routes }: WorstRoutesByMetricProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-foreground text-base font-medium sm:text-lg">Worst by {metricName}</CardTitle>
            <RouteHelpTooltip />
          </div>
          <Link
            href={`/projects/${projectId}/routes`}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-1 sm:space-y-2">
          {routes.map((route) => (
            <Link
              key={route.route}
              href={`/projects/${projectId}/routes/${encodeURIComponent(route.route)}`}
              className="hover:bg-accent/50 group block rounded-lg p-2 transition-colors sm:p-3"
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <Route className="text-muted-foreground h-4 w-4 shrink-0" />
                  <span className="text-foreground truncate font-mono text-xs sm:text-sm">{route.route}</span>
                  <div className="ml-auto flex items-center gap-1.5 sm:hidden">
                    <span className="text-foreground font-mono text-sm font-medium">
                      {route.quantiles && formatMetricValue(metricName, route.quantiles.p75)}
                    </span>
                    {route.status && <Badge {...statusToBadge[route.status]} label={undefined} size="sm" />}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-2 pl-6 sm:justify-end sm:gap-4 sm:pl-0">
                  <span className="text-muted-foreground text-xs">{formatCompactNumber(route.sampleSize)} views</span>

                  <div className="hidden items-center gap-1.5 gap-2 sm:flex">
                    <span className="text-foreground font-mono text-sm font-medium">
                      {route.quantiles && formatMetricValue(metricName, route.quantiles.p75)}
                    </span>
                    {route.status && <Badge {...statusToBadge[route.status]} label={undefined} size="sm" />}
                  </div>

                  <ArrowRight className="text-muted-foreground hidden h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
