'use client';
'use no memo';
import { fetchEventsStatsData } from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { cn } from '@/lib/utils';
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

type TableData = {
  route: string;
  views: string;
  conversions: string;
  conversionRate: string;
  previousConversionRate: string;
  difference: number | null;
};

const columns: ColumnDef<TableData>[] = [
  {
    accessorKey: 'route',
    header: 'ROUTE',
    cell: ({ row }) => <span className="text-foreground font-mono text-sm">{row.original.route}</span>
  },
  { accessorKey: 'views', header: 'PAGE VIEWS' },
  { accessorKey: 'conversions', header: 'CONVERSIONS' },
  {
    accessorKey: 'conversionRate',
    header: 'CONVERSION RATE',
    cell: ({ row }) => <span className="text-foreground text-sm font-medium">{row.original.conversionRate}</span>
  },
  { accessorKey: 'previousConversionRate', header: 'PREVIOUS RATE' },
  {
    accessorKey: 'difference',
    header: 'VS PREVIOUS',
    cell: ({ row }) => {
      const value = row.original.difference;
      if (value === null) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <span
          className={cn(`text-status-poor flex items-center justify-end gap-1 text-sm`, {
            'text-status-good': value >= 0
          })}
        >
          {value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    }
  }
];

const tdClassNames: Record<string, string> = {
  route: 'text-left',
  conversions: 'text-sm text-foreground font-medium',
  views: 'text-sm text-muted-foreground'
} satisfies Partial<Record<keyof TableData, string>>;

type Props = {
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>>;
};

export function AnalyticsTable({ eventStats }: Props) {
  const memoizedStats = useMemo(
    () =>
      eventStats.map(
        (v) =>
          ({
            conversionRate: v.conversion_rate === null ? '—' : `${v.conversion_rate.toFixed(2)}%`,
            previousConversionRate: v.conversion_rate_prev === null ? '—' : `${v.conversion_rate_prev.toFixed(2)}%`,
            conversions: `${v.conversions_cur.toLocaleString()}`,
            difference: v.conversion_change_pct,
            route: `${v.route}`,
            views: `${v.views_cur.toLocaleString()}`
          }) satisfies TableData
      ),
    [eventStats]
  );
  const table = useReactTable({
    data: memoizedStats,
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return (
    <table className="w-full">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr className="border-border border-b" key={headerGroup.id}>
            {headerGroup.headers.map((header, idx) => (
              <th
                key={header.id}
                className={cn(
                  'text-muted-foreground px-6 py-3 text-right text-xs font-medium tracking-wider uppercase',
                  {
                    'text-left': idx === 0
                  }
                )}
              >
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className="divide-border divide-y">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="hover:bg-muted/50 transition-colors">
            {row.getVisibleCells().map((cell) => (
              <td className={cn('px-6 py-3 text-right', tdClassNames[cell.column.id])} key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
