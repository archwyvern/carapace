import type { ReactNode } from "react";
import { cx } from "../cx";

export interface PageHeaderProps {
  /** Muted uppercase title (or a custom node). */
  title: ReactNode;
  /** Accent brand/eyebrow shown before the title. */
  eyebrow?: ReactNode;
  /** Element before the eyebrow/title (e.g. a back button). */
  leading?: ReactNode;
  /** Right-aligned action controls. */
  actions?: ReactNode;
  className?: string;
}

/** Titled top bar — the titled specialisation of Toolbar. */
export function PageHeader({ title, eyebrow, leading, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cx(
        "flex h-9 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        {eyebrow && <span className="shrink-0 font-semibold text-accent">{eyebrow}</span>}
        {typeof title === "string" ? (
          <span className="truncate text-md uppercase tracking-wide text-fg-mid">{title}</span>
        ) : (
          title
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
