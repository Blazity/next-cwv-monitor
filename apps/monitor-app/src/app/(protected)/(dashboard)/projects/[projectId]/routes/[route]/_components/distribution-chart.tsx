type DistributionChartProps = {
  good: number;
  needsImprovement: number;
  poor: number;
};

export function DistributionChart({ good, needsImprovement, poor }: DistributionChartProps) {
  const total = good + needsImprovement + poor;

  const segments = [
    {
      name: "Good",
      value: good,
      percent: total > 0 ? (good / total) * 100 : 0,
      fill: "var(--status-good)",
    },
    {
      name: "Needs improvement",
      value: needsImprovement,
      percent: total > 0 ? (needsImprovement / total) * 100 : 0,
      fill: "var(--status-needs-improvement)",
    },
    {
      name: "Poor",
      value: poor,
      percent: total > 0 ? (poor / total) * 100 : 0,
      fill: "var(--status-poor)",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-muted flex h-3 overflow-hidden rounded-full">
        {segments.map((item) => (
          <div
            key={item.name}
            className="h-full transition-all duration-300"
            style={{ width: `${item.percent}%`, backgroundColor: item.fill }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        {segments.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground text-xs">
              {item.name}: <span className="text-foreground font-medium">{item.percent.toFixed(1)}%</span>
              <span className="text-muted-foreground ml-1">({item.value.toLocaleString()})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
