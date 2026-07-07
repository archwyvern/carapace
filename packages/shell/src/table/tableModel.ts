import type { DataTableColumn, SortState } from "./tableTypes";

export const DEFAULT_MIN_WIDTH = 60;
export const MENU_COLUMN_WIDTH = 36;

/** Header-click cycle: asc -> desc -> none; a different column restarts at asc. */
export function nextSort(current: SortState | null, columnId: string): SortState | null {
  if (!current || current.columnId !== columnId) return { columnId, direction: "asc" };
  if (current.direction === "asc") return { columnId, direction: "desc" };
  return null;
}

/** Stable sort by the sort column; unknown/unsortable columns return the input array. */
export function applySort<T>(rows: T[], columns: DataTableColumn<T>[], sort: SortState | null): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col || (!col.compare && !col.sortBy)) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;
  const decorated = rows.map((row, index) => ({ row, index }));
  decorated.sort((a, b) => {
    const c = col.compare ? col.compare(a.row, b.row) * dir : compareBy(col.sortBy!, a.row, b.row, dir);
    return c !== 0 ? c : a.index - b.index;
  });
  return decorated.map((d) => d.row);
}

// Nulls sort last regardless of direction, so the null branch skips the dir flip.
function compareBy<T>(
  by: (row: T) => string | number | null | undefined,
  a: T,
  b: T,
  dir: number,
): number {
  const va = by(a);
  const vb = by(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
  return c * dir;
}
