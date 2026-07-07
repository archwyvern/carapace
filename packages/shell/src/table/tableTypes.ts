import type { ReactNode } from "react";
import type { MenuItem } from "../menu/model";

export interface DataTableColumn<T> {
  /** Stable id — keys sort state and width overrides. */
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Presence makes the column sortable. Nulls sort last in both directions. */
  sortBy?: (row: T) => string | number | null | undefined;
  /** Custom order; overrides sortBy. Desc is the negation. */
  compare?: (a: T, b: T) => number;
  /** Fixed px width. Omitted = flex. */
  width?: number;
  /** Flex weight when width is omitted. Default 1. */
  flex?: number;
  /** Resize clamp / flex minimum px. Default 60. */
  minWidth?: number;
  /** Default "left". */
  align?: "left" | "center" | "right";
}

export interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

export interface DataTableProps<T> {
  /** Already filtered by the consumer — the table never filters. */
  rows: T[];
  columns: DataTableColumn<T>[];
  rowId: (row: T) => string;
  /** Fixed row height in px (virtualization requires it). Default 28. */
  rowHeight?: number;

  /** Controlled sort; omit for uncontrolled. */
  sort?: SortState | null;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState | null) => void;

  /** Controlled selection; omit for uncontrolled. */
  selectedIds?: Set<string>;
  /** Primary (last-interacted) row — drives detail panels. */
  onSelectionChange?: (row: T | null) => void;
  /** Full selected set. */
  onSelectedChange?: (rows: T[]) => void;
  /** Default true: Ctrl/Cmd toggle + Shift range + Ctrl/Cmd+A. */
  multiSelect?: boolean;
  /** Enter / double-click. */
  onActivate?: (row: T) => void;

  /** Powers both the trailing row-menu button and right-click. */
  rowMenu?: (row: T) => MenuItem[];

  /** columnId -> px. Uncontrolled; fires on resize drag end. */
  defaultColumnWidths?: Record<string, number>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;

  emptyState?: ReactNode;
  loading?: boolean;
  /** Row count at which the body virtualizes. Default 100. */
  virtualizeAt?: number;
  ariaLabel?: string;
  className?: string;
}
