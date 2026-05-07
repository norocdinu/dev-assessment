'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  pagination?: PaginationProps;
}

export function DataTable<T>({ columns, data, pagination }: DataTableProps<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const showingStart = pagination ? (pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1) : 1;
  const showingEnd = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : data.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/10 border-b border-border sticky top-0">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left font-medium text-foreground/70 whitespace-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-border/50 hover:bg-[rgb(var(--brand-rgb))]/10 transition-colors ${i % 2 === 1 ? 'bg-muted/5' : 'bg-card'}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 text-foreground/80">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted/70"
              >
                No results
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card text-sm text-foreground/70">
          <span>
            Showing {showingStart}–{showingEnd} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border border-border rounded-md disabled:opacity-40 hover:bg-muted/10"
            >
              Prev
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="px-3 py-1 border border-border rounded-md disabled:opacity-40 hover:bg-muted/10"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
