import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { tv } from "tailwind-variants";
import { cx } from "../cx";
import { Spinner } from "../primitives/Spinner";
import { applySort, gridTemplate } from "./tableModel";
import type { DataTableColumn, DataTableProps } from "./tableTypes";

const table = tv({
  slots: {
    root: "relative flex min-h-0 flex-col overflow-auto outline-none focus-visible:ring-1 focus-visible:ring-ring",
    headerRow: "sticky top-0 z-10 grid shrink-0 border-b border-border bg-surface",
    headerCell:
      "flex items-center gap-1 overflow-hidden whitespace-nowrap px-2 py-1.5 text-sm uppercase tracking-wide text-fg-mid",
    row: "grid cursor-default select-none border-b border-border/40 hover:bg-surface-raised",
    cell: "flex h-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap px-2 text-sm text-fg",
    empty: "flex flex-1 items-center justify-center p-8 text-sm text-fg-mid",
    loading: "absolute inset-0 z-20 flex items-center justify-center bg-surface/60",
  },
});

const ALIGN: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

/** Generic column table — sorting, selection, row menus, virtualized body, column resize.
 *  Data + render functions in (TreeView idiom); the component owns the render path. */
export function DataTable<T>({
  rows,
  columns,
  rowId,
  rowHeight = 28,
  sort: controlledSort,
  defaultSort,
  onSortChange,
  emptyState,
  loading,
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const s = table();

  const isSortControlled = controlledSort !== undefined;
  const [internalSort, setInternalSort] = useState(defaultSort ?? null);
  const sort = isSortControlled ? controlledSort : internalSort;

  const [widths] = useState<Record<string, number>>({});

  const sorted = useMemo(() => applySort(rows, columns, sort), [rows, columns, sort]);
  const template = useMemo(() => gridTemplate(columns, widths, false), [columns, widths]);
  const rowStyle: CSSProperties = { gridTemplateColumns: "var(--dt-cols)", height: rowHeight };

  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={sorted.length + 1}
      tabIndex={0}
      className={s.root({ className })}
      style={{ "--dt-cols": template } as CSSProperties}
    >
      <div role="row" className={s.headerRow()} style={{ gridTemplateColumns: "var(--dt-cols)" }}>
        {columns.map((col) => (
          <div key={col.id} role="columnheader" className={cx(s.headerCell(), ALIGN[col.align ?? "left"])}>
            {col.header}
          </div>
        ))}
      </div>
      {sorted.length === 0 && !loading ? (
        <div className={s.empty()}>{emptyState}</div>
      ) : (
        sorted.map((row) => (
          <div key={rowId(row)} role="row" className={s.row()} style={rowStyle}>
            {columns.map((col) => (
              <div key={col.id} role="gridcell" className={cx(s.cell(), ALIGN[col.align ?? "left"])}>
                {col.cell(row)}
              </div>
            ))}
          </div>
        ))
      )}
      {loading && (
        <div className={s.loading()}>
          <Spinner />
        </div>
      )}
    </div>
  );
}
