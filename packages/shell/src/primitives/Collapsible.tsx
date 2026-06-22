import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { ChevronRightIcon } from "../icons";

export type CollapsibleVariant = "band" | "plain";

export interface CollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  /** Uncontrolled initial state. Default open. */
  defaultOpen?: boolean;
  /** Controlled open state (pair with onOpenChange). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Right-aligned header content (actions, counts). Clicks here don't toggle. */
  trailing?: ReactNode;
  /** "band" = raised header bar (default); "plain" = borderless header. */
  variant?: CollapsibleVariant;
  className?: string;
  bodyClassName?: string;
}

/** Standalone disclosure section — a chevron header that shows/hides its body. */
export function Collapsible({
  title,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
  trailing,
  variant = "band",
  className,
  bodyClassName,
}: CollapsibleProps) {
  const [internal, setInternal] = useState(defaultOpen);
  const isOpen = open ?? internal;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      <div
        className={cx(
          "flex h-6 shrink-0 items-center gap-1 px-1.5",
          variant === "band" && "border-b border-border bg-surface-raised",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-1 text-left outline-none focus-visible:text-fg"
        >
          <ChevronRightIcon
            aria-hidden
            className={cx("h-3.5 w-3.5 shrink-0 text-fg-mid transition-transform", isOpen && "rotate-90")}
          />
          <span className="truncate text-base font-semibold text-fg-mid">{title}</span>
        </button>
        {trailing && <span className="flex shrink-0 items-center">{trailing}</span>}
      </div>
      {isOpen && <div className={cx("min-h-0", bodyClassName)}>{children}</div>}
    </div>
  );
}
