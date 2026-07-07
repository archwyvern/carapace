import type { ReactNode } from "react";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { Spinner } from "../primitives/Spinner";

export type HistoryItemKind = "create" | "update" | "delete" | "revert";

export interface HistoryTimelineItem {
  id: string;
  kind: HistoryItemKind;
  /** Human line, e.g. "Changed name, biography". Consumer-built. */
  summary: string;
  /** Pre-resolved display name. */
  user: string;
  timestamp: string | Date;
}

export interface HistoryTimelineProps {
  /** Newest first — rendered as given. */
  items: HistoryTimelineItem[];
  /** Header buttons render only when handlers are provided. */
  onUndo?: () => void;
  onRedo?: () => void;
  /** An apply is in flight — disables both buttons. */
  busy?: boolean;
  loading?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

const KIND_DOT: Record<HistoryItemKind, string> = {
  create: "bg-success",
  update: "border border-border",
  delete: "bg-error",
  revert: "bg-accent",
};

/** Shared edit-history panel: newest-first step list with optional undo/redo header.
 *  Presentational — the consumer fetches, maps, and applies. */
export function HistoryTimeline({
  items,
  onUndo,
  onRedo,
  busy,
  loading,
  emptyState,
  className,
}: HistoryTimelineProps) {
  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="flex-1 text-sm uppercase tracking-wide text-fg-mid">History</span>
        {onUndo && (
          <Button size="sm" disabled={busy} onClick={onUndo}>
            Undo
          </Button>
        )}
        {onRedo && (
          <Button size="sm" disabled={busy} onClick={onRedo}>
            Redo
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-fg-mid">{emptyState}</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex gap-2 border-b border-border/40 px-3 py-2">
              <span data-testid="kind-dot" className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", KIND_DOT[item.kind])} />
              <span className="flex min-w-0 flex-col">
                <span data-testid="history-summary" className="text-sm text-fg">
                  {item.summary}
                </span>
                <span className="text-sm text-fg-mid">
                  {item.user} · {new Date(item.timestamp).toLocaleString()}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
