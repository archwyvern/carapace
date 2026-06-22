import type { ReactNode } from "react";
import { cx } from "../cx";
import { Spinner } from "../primitives/Spinner";
import { ErrorIcon, InfoIcon, SearchIcon } from "../icons";

export type EmptyStateStatus = "empty" | "loading" | "error" | "info";

export interface EmptyStateProps {
  status?: EmptyStateStatus;
  /** Headline. Optional for loading. */
  title?: ReactNode;
  /** Secondary explanatory line. */
  message?: ReactNode;
  /** Override the default status icon. */
  icon?: ReactNode;
  /** Call-to-action (e.g. a Button). */
  action?: ReactNode;
  /** Float over the parent (absolute, dimmed scrim) instead of filling it inline. */
  overlay?: boolean;
  className?: string;
}

const DEFAULT_ICON: Record<EmptyStateStatus, ReactNode> = {
  empty: <SearchIcon />,
  loading: null,
  error: <ErrorIcon />,
  info: <InfoIcon />,
};

/**
 * Unified panel state — loading (spinner), empty (hint), error, or info — for the
 * blank/loading/failed states every list, grid, and panel needs. `overlay` floats
 * it over content (e.g. a refresh in progress).
 */
export function EmptyState({
  status = "empty",
  title,
  message,
  icon,
  action,
  overlay = false,
  className,
}: EmptyStateProps) {
  const leading = status === "loading" ? <Spinner size="md" /> : (icon ?? DEFAULT_ICON[status]);
  const iconTone = status === "error" ? "text-error" : "text-fg-mid";

  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={cx(
        "flex flex-col items-center justify-center gap-2 p-6 text-center",
        overlay ? "absolute inset-0 z-20 bg-surface/80 backdrop-blur-[1px]" : "h-full w-full",
        className,
      )}
    >
      {leading && <span className={cx("flex [&_svg]:h-6 [&_svg]:w-6", iconTone)}>{leading}</span>}
      {title !== undefined && (
        <div className={cx("text-base font-medium", status === "error" ? "text-error" : "text-fg")}>{title}</div>
      )}
      {message !== undefined && <div className="max-w-[44ch] text-base text-fg-mid">{message}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
