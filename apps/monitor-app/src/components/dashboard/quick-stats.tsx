import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Route, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { MetricName } from '@/app/server/lib/clickhouse/repositories/dashboard-overview-repository';
import { StatusDistribution } from '@/app/server/domain/dashboard/overview/types';

type QuickStatsProps = {
  projectId: string;
  selectedMetric: MetricName;
  data: {
    statusDistribution: StatusDistribution;
    timeRangeLabel: string;
    totalViews: number; 
    viewTrend: number;
  };
};

export function QuickStats({ projectId, selectedMetric, data }: QuickStatsProps) {
    const { statusDistribution, timeRangeLabel, totalViews, viewTrend } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">
            {selectedMetric} Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <StatusRow 
              label="Good" 
              count={statusDistribution.good} 
              dotClass="bg-status-good" 
            />
            <StatusRow 
              label="Needs improvement" 
              count={statusDistribution['needs-improvement']} 
              dotClass="bg-status-needs-improvement" 
            />
            <StatusRow 
              label="Poor" 
              count={statusDistribution.poor} 
              dotClass="bg-status-poor" 
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ActionLink 
              href={`/projects/${projectId}/regressions`} 
              icon={<TrendingDown className="h-4 w-4 text-status-poor" />}
              label="View Regressions"
            />
            <ActionLink 
              href={`/projects/${projectId}/routes`} 
              icon={<Route className="h-4 w-4 text-muted-foreground" />}
              label="Browse All Routes"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 px-6">
          <CardTitle className="text-sm font-medium text-foreground">
            Tracked Views
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6">
        <div className="space-y-3">
            <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground font-mono">
                {Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(totalViews)}
            </span>
            <div className={`flex items-center gap-0.5 text-xs ${viewTrend < 0 ? 'text-status-poor' : 'text-status-good'}`}>
                {viewTrend < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                <span>{viewTrend > 0 ? '+' : ''}{viewTrend}%</span>
            </div>
            </div>
            <div className="text-xs text-muted-foreground">vs previous {timeRangeLabel.toLowerCase()}</div>
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
        <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono text-sm text-foreground">{count.toLocaleString()} {count === 1 ? 'route' : 'routes'}</span>
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors group"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}