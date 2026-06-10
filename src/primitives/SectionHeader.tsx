import type { ReactNode } from "react";
import { cx } from "../cx";

/** A small section-band header. */
export function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex h-6 items-center gap-1.5 border-b border-border bg-surface-raised px-3", className)}>
      <span className="text-sm font-semibold text-fg-mid">{children}</span>
    </div>
  );
}
