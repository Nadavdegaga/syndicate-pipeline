"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  rowKey?: (row: TData) => string;
  stickyHeader?: boolean;
};

export function DataTable<TData>({
  columns,
  data,
  emptyState,
  onRowClick,
  rowKey,
  stickyHeader = true,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey ? (row) => rowKey(row) : undefined,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-auto">
        <Table>
          <TableHeader
            className={cn(
              "bg-slate-50/80 backdrop-blur",
              stickyHeader && "sticky top-0 z-10",
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-200 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-11 px-4 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      // numeric column alignment hint via meta.align
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (header.column.columnDef.meta as any)?.align === "right" &&
                        "text-right",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  {emptyState ?? (
                    <span className="text-sm text-slate-500">No results.</span>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    "border-slate-100 transition-colors",
                    idx % 2 === 1 && "bg-slate-50/40",
                    onRowClick &&
                      "cursor-pointer hover:bg-slate-100/70 hover:shadow-[inset_3px_0_0_0_theme(colors.slate.900)]",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-4 py-3 align-middle",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (cell.column.columnDef.meta as any)?.align === "right" &&
                          "text-right tabular-nums",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
