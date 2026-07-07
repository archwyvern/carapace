import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { tv } from "tailwind-variants";
import { cx } from "../cx";
import { ChevronDownIcon, ChevronUpIcon, MoreIcon } from "../icons";
import { ContextMenu } from "../menu/ContextMenu";
import { IconButton } from "../primitives/IconButton";
import { Sash } from "../primitives/Sash";
import { Spinner } from "../primitives/Spinner";
import { applySort, clampWidth, DEFAULT_MIN_WIDTH, gridTemplate, nextSort } from "./tableModel";
import type { DataTableColumn, DataTableProps } from "./tableTypes";

const table = tv({
  slots: {
    root: "relative flex min-h-0 flex-col overflow-auto outline-none focus-visible:ring-1 focus-visible:ring-ring",
    headerRow: "sticky top-0 z-10 grid shrink-0 border-b border-border bg-surface",
    headerCell:
      "flex items-center gap-1 overflow-hidden whitespace-nowrap px-2 py-1.5 text-sm uppercase tracking-wide text-fg-mid",
    headerButton:
      "flex items-center gap-1 overflow-hidden whitespace-nowrap px-2 py-1.5 text-sm uppercase tracking-wide text-fg-mid outline-none transition-colors hover:text-fg focus-visible:ring-1 focus-visible:ring-ring [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:text-accent",
    row: "grid cursor-default select-none border-b border-border/40 hover:bg-surface-raised",
    cell: "flex h-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap px-2 text-sm text-fg",
    empty: "flex flex-1 items-center justify-center p-8 text-sm text-fg-mid",
    loading: "absolute inset-0 z-20 flex items-center justify-center bg-surface/60",
  },
  variants: {
    selected: {
      true: {
        row: "bg-list-active outline outline-1 -outline-offset-1 outline-accent hover:bg-list-active",
      },
    },
  },
});

const OVERSCAN = 10;

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
  selectedIds,
  onSelectionChange,
  onSelectedChange,
  multiSelect = true,
  onActivate,
  rowMenu,
  defaultColumnWidths,
  onColumnWidthsChange,
  emptyState,
  loading,
  virtualizeAt = 100,
  ariaLabel,
  className,
}: DataTableProps<T>) {
  const s = table();

  const isSortControlled = controlledSort !== undefined;
  const [internalSort, setInternalSort] = useState(defaultSort ?? null);
  const sort = isSortControlled ? controlledSort : internalSort;

  const [widths, setWidths] = useState<Record<string, number>>(() => defaultColumnWidths ?? {});
  const headerRowRef = useRef<HTMLDivElement>(null);
  const dragWidth = useRef(0);

  const startResize = (col: DataTableColumn<T>, headerIndex: number) => {
    // Flex columns have no px width yet — measure the rendered header cell.
    dragWidth.current =
      widths[col.id] ??
      col.width ??
      (headerRowRef.current?.children[headerIndex] as HTMLElement | undefined)?.getBoundingClientRect().width ??
      col.minWidth ??
      DEFAULT_MIN_WIDTH;
  };
  const resizeBy = (col: DataTableColumn<T>, delta: number) => {
    dragWidth.current += delta;
    setWidths((w) => ({ ...w, [col.id]: clampWidth(col, Math.round(dragWidth.current)) }));
  };
  const endResize = (col: DataTableColumn<T>) => {
    onColumnWidthsChange?.({ ...widths, [col.id]: clampWidth(col, Math.round(dragWidth.current)) });
  };

  const commitSort = (columnId: string) => {
    const next = nextSort(sort ?? null, columnId);
    if (!isSortControlled) setInternalSort(next);
    onSortChange?.(next);
  };

  const sorted = useMemo(() => applySort(rows, columns, sort), [rows, columns, sort]);
  const template = useMemo(() => gridTemplate(columns, widths, !!rowMenu), [columns, widths, rowMenu]);
  const rowStyle: CSSProperties = { gridTemplateColumns: "var(--dt-cols)", height: rowHeight };

  const isSelControlled = selectedIds !== undefined;
  const [internalSelected, setInternalSelected] = useState<Set<string>>(() => new Set());
  const selected = isSelControlled ? selectedIds : internalSelected;
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const ids = useMemo(() => sorted.map(rowId), [sorted, rowId]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const virtual = sorted.length >= virtualizeAt;

  useLayoutEffect(() => {
    if (virtual && rootRef.current) setViewportH(rootRef.current.clientHeight);
  }, [virtual]);

  const start = virtual ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN) : 0;
  const end = virtual
    ? Math.min(sorted.length, Math.ceil((scrollTop + viewportH) / rowHeight) + OVERSCAN)
    : sorted.length;

  // Commit a selection: update state, move focus, notify (primary + full set).
  const commitSelection = (next: Set<string>, activeIndex: number, anchorIndex: number | null) => {
    if (!isSelControlled) setInternalSelected(next);
    setFocusedIndex(activeIndex);
    setAnchor(anchorIndex);
    onSelectionChange?.(sorted[activeIndex] ?? null);
    onSelectedChange?.(sorted.filter((_, i) => next.has(ids[i]!)));
  };

  const select = (index: number) => {
    if (!sorted[index]) return;
    commitSelection(new Set([ids[index]!]), index, index);
    // Keyboard focus keeps the row visible when the body is windowed.
    const el = rootRef.current;
    if (el && virtual) {
      const top = index * rowHeight;
      const headerH = el.firstElementChild instanceof HTMLElement ? el.firstElementChild.offsetHeight : 0;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + rowHeight > el.scrollTop + el.clientHeight - headerH)
        el.scrollTop = top + rowHeight - el.clientHeight + headerH;
    }
  };

  const [menu, setMenu] = useState<{ row: T; anchor: { x: number; y: number } | HTMLElement } | null>(null);

  const handleRowClick = (index: number, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    const id = ids[index]!;
    if (multiSelect && e.shiftKey && anchor !== null) {
      const lo = Math.min(anchor, index);
      const hi = Math.max(anchor, index);
      commitSelection(new Set(ids.slice(lo, hi + 1)), index, anchor); // keep the existing anchor
    } else if (multiSelect && (e.ctrlKey || e.metaKey)) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      commitSelection(next, index, index);
    } else {
      select(index);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (sorted.length === 0) return;
    const current = Math.min(Math.max(focusedIndex, 0), sorted.length - 1);
    if (multiSelect && (e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      commitSelection(new Set(ids), current, current);
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        select(Math.min(current + 1, sorted.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        select(Math.max(current - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(sorted.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onActivate?.(sorted[current]!);
        break;
    }
  };

  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={sorted.length + 1}
      tabIndex={0}
      ref={rootRef}
      className={s.root({ className })}
      style={{ "--dt-cols": template } as CSSProperties}
      onKeyDown={onKeyDown}
      onScroll={
        virtual
          ? (e) => {
              setScrollTop(e.currentTarget.scrollTop);
              setViewportH(e.currentTarget.clientHeight);
            }
          : undefined
      }
    >
      <div
        role="row"
        ref={headerRowRef}
        className={s.headerRow()}
        style={{ gridTemplateColumns: "var(--dt-cols)" }}
      >
        {columns.map((col, i) => {
          const active = sort?.columnId === col.id ? sort.direction : undefined;
          const sortable = !!(col.sortBy || col.compare);
          return (
            <div key={col.id} role="presentation" className="relative flex min-w-0">
              {sortable ? (
                <button
                  type="button"
                  role="columnheader"
                  aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined}
                  className={cx(s.headerButton(), ALIGN[col.align ?? "left"], "w-full")}
                  onClick={() => commitSort(col.id)}
                >
                  {col.header}
                  {active === "asc" && <ChevronUpIcon />}
                  {active === "desc" && <ChevronDownIcon />}
                </button>
              ) : (
                <div role="columnheader" className={cx(s.headerCell(), ALIGN[col.align ?? "left"], "w-full")}>
                  {col.header}
                </div>
              )}
              {(rowMenu || i < columns.length - 1) && (
                <span className="absolute inset-y-0 -right-px z-10 flex">
                  <Sash
                    orientation="vertical"
                    onDragStart={() => startResize(col, i)}
                    onDrag={(d) => resizeBy(col, d)}
                    onDragEnd={() => endResize(col)}
                  />
                </span>
              )}
            </div>
          );
        })}
        {rowMenu && <div role="columnheader" className={s.headerCell()} />}
      </div>
      {sorted.length === 0 && !loading ? (
        <div className={s.empty()}>{emptyState}</div>
      ) : (
        <>
          {virtual && start > 0 && <div style={{ height: start * rowHeight }} className="shrink-0" />}
          {sorted.slice(start, end).map((row, sliceIndex) => {
            const index = start + sliceIndex;
            return (
          <div
            key={ids[index]}
            role="row"
            aria-selected={selected.has(ids[index]!)}
            className={s.row({ selected: selected.has(ids[index]!) })}
            style={rowStyle}
            onClick={(e) => handleRowClick(index, e)}
            onDoubleClick={() => onActivate?.(row)}
            onContextMenu={
              rowMenu &&
              ((e: ReactMouseEvent) => {
                e.preventDefault();
                if (!selected.has(ids[index]!)) select(index);
                setMenu({ row, anchor: { x: e.clientX, y: e.clientY } });
              })
            }
          >
            {columns.map((col) => (
              <div key={col.id} role="gridcell" className={cx(s.cell(), ALIGN[col.align ?? "left"])}>
                {col.cell(row)}
              </div>
            ))}
            {rowMenu && (
              <div role="gridcell" className={s.cell({ className: "justify-center px-0" })}>
                <IconButton
                  label="Row actions"
                  icon={<MoreIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selected.has(ids[index]!)) select(index);
                    setMenu({ row, anchor: e.currentTarget });
                  }}
                />
              </div>
            )}
          </div>
            );
          })}
          {virtual && end < sorted.length && (
            <div style={{ height: (sorted.length - end) * rowHeight }} className="shrink-0" />
          )}
        </>
      )}
      {loading && (
        <div className={s.loading()}>
          <Spinner />
        </div>
      )}
      {menu && rowMenu && (
        <ContextMenu items={rowMenu(menu.row)} anchor={menu.anchor} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
