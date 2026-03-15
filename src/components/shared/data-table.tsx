"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column<T> { header: string; accessor: keyof T | ((row: T) => React.ReactNode); className?: string; }
interface DataTableProps<T> { columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; }

export function DataTable<T extends { id?: string }>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, i) => (<TableHead key={i} className={col.className}>{col.header}</TableHead>))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, rowIdx) => (
          <TableRow key={row.id ?? rowIdx} className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => onRowClick?.(row)}>
            {columns.map((col, colIdx) => (
              <TableCell key={colIdx} className={col.className}>
                {typeof col.accessor === "function" ? col.accessor(row) : String(row[col.accessor] ?? "")}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
