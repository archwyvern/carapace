import type { ReactNode } from "react";
import { cx } from "../cx";

export interface PanelProps {
  title?: ReactNode;
  /** Secondary line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned header actions (e.g. IconButtons). */
  actions?: ReactNode;
  /** Footer band content. */
  footer?: ReactNode;
  children: ReactNode;
  /** Scroll the body region (default true). */
  scroll?: boolean;
  className?: string;
  bodyClassName?: string;
}

/**
 * A dockable panel: bordered surface with an optional header band (title +
 * subtitle + actions), a flexible body, and an optional footer band. The
 * recurring "Dock"/inspector-panel chrome across drydock, foley, and lambert.
 */
export function Panel({
  title,
  subtitle,
  actions,
  footer,
  children,
  scroll = true,
  className,
  bodyClassName,
}: PanelProps) {
  const hasHeader = title !== undefined || subtitle !== undefined || actions !== undefined;
  return (
    <div className={cx("flex min-h-0 flex-col border border-border bg-surface", className)}>
      {hasHeader && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface-raised px-2.5 py-1.5">
          <div className="min-w-0 flex-1">
            {title !== undefined && <div className="truncate text-xs font-bold text-fg">{title}</div>}
            {subtitle !== undefined && <div className="truncate text-2xs text-fg-mid">{subtitle}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
        </div>
      )}
      <div className={cx("min-h-0 flex-1", scroll && "overflow-auto", bodyClassName)}>{children}</div>
      {footer !== undefined && (
        <div className="shrink-0 border-t border-border px-2.5 py-1.5 text-2xs text-fg-mid">{footer}</div>
      )}
    </div>
  );
}
