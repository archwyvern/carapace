import { cx } from "../cx";

// Consistent save-state cue shared by every editor, so "unsaved / saving /
// saved" reads the same everywhere instead of each editor inventing its own.
// A pure presentational pill driven by the editor's existing state — drop it
// next to the Save button.
export type SaveState = "saved" | "unsaved" | "saving" | "error";

const LABELS: Record<SaveState, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Save failed",
};

export interface SaveStatusProps {
  status: SaveState;
  /** Tooltip — e.g. the error message when status="error". */
  title?: string;
  className?: string;
}

export function SaveStatus({ status, title, className }: SaveStatusProps) {
  const dot =
    status === "saving" ? "bg-accent animate-pulse"
      : status === "saved" ? "bg-success"
        : status === "error" ? "bg-error"
          : "bg-warning";
  return (
    <div
      role="status"
      aria-live="polite"
      title={title}
      className={cx("flex items-center gap-1.5 text-base select-none whitespace-nowrap", className)}
    >
      <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
      <span className="text-fg-mid">{LABELS[status]}</span>
    </div>
  );
}
