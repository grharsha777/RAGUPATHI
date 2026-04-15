"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/shared/severity-badge";
import type { Incident } from "@/lib/types/domain";
type IncidentTableProps = {
  data: Incident[];
  onPreview: (incident: Incident) => void;
};

export function IncidentTable({ data, onPreview }: IncidentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Incident>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Incident",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.title}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.repoFullName}</div>
          </div>
        ),
      },
      {
        accessorKey: "severity",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Severity
            <ArrowUpDown className="ml-2 size-3" />
          </Button>
        ),
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span className="font-mono text-xs uppercase text-muted-foreground">{row.original.status}</span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Updated
            <ArrowUpDown className="ml-2 size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-xs text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/incidents/${row.original.id}`}>Open detail</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPreview(row.original)}>Quick preview</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Export evidence bundle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onPreview],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search title, repo, id…"
          className="md:max-w-sm"
          aria-label="Filter incidents"
        />
        <div className="flex flex-wrap gap-2 text-2xs text-muted-foreground">
          <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-1">saved: critical only</span>
          <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-1">saved: MTTR regressions</span>
        </div>
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={() => onPreview(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(event) => event.stopPropagation()} className="align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  No incidents match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
