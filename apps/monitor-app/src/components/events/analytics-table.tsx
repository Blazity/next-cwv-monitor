'use client';
'use no memo';
import { fetchEventsStatsData } from '@/app/server/lib/clickhouse/repositories/custom-events-repository';
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table';
import { useMemo } from 'react';

type TableData = {
  route: string;
  views: number;
  conversions: number;
  conversionRate: number;
  difference: number;
};

const columns: ColumnDef<TableData>[] = [
  { accessorKey: 'route', header: 'ROUTE' },
  { accessorKey: 'views', header: 'PAGE VIEWS' },
  { accessorKey: 'conversions', header: 'CONVERSIONS' },
  { accessorKey: 'conversionRate', header: 'CONVERSION RATE' },
  { accessorKey: 'difference', header: 'VS PREVIOUS' }
];

type Props = {
  eventStats: Awaited<ReturnType<typeof fetchEventsStatsData>>;
};

export function AnalyticsTable({ eventStats }: Props) {
  const memoizedStats = useMemo(
    () =>
      eventStats.map(
        (v) =>
          ({
            conversionRate: Number(v.conversions_cur),
            conversions: Number(v.conversions_cur),
            difference: Number(v.conversion_change_pct),
            route: `${v.route}`,
            views: Number(v.views_cur)
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
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
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
              <td className="px-6 py-3" key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
