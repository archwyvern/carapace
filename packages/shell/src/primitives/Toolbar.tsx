import type { ReactNode } from "react";
import { cx } from "../cx";

export interface ToolbarProps {
  children: ReactNode;
  justify?: "start" | "between" | "end";
  className?: string;
}

/** A control-height horizontal bar. PageHeader is the titled specialisation. */
export function Toolbar({ children, justify = "between", className }: ToolbarProps) {
  const j =
    justify === "between" ? "justify-between" : justify === "end" ? "justify-end" : "justify-start";
  return (
    <div
      className={cx(
        "flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface-raised px-3",
        j,
        className,
      )}
    >
      {children}
    </div>
  );
}
