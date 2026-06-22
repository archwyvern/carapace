import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { CheckIcon, ChevronRightIcon } from "../icons";

export type MenuSize = "sm" | "md";

export function rowClass(opts: { danger?: boolean; size?: MenuSize } = {}): string {
  const pad = opts.size === "md" ? "px-2.5 py-1.5 text-md" : "px-2 py-1 text-base";
  return cx(
    "flex w-full items-center gap-2 text-left whitespace-nowrap outline-none",
    pad,
    "data-[active=true]:bg-accent data-[active=true]:text-accent-fg",
    "disabled:opacity-40 disabled:pointer-events-none",
    opts.danger && "text-error data-[active=true]:bg-error data-[active=true]:text-fg",
  );
}

export interface MenuRowShellProps {
  role: string;
  active: boolean;
  danger?: boolean;
  size?: MenuSize;
  disabled?: boolean;
  /** Explicit aria/title attributes. */
  ariaProps?: Record<string, string | number | boolean | undefined>;
  /** Result of floating-ui `getItemProps({...})` (or `getReferenceProps(...)`), spread onto the row. */
  itemProps?: Record<string, unknown>;
  tabIndex?: number;
  leading?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
}

/** A single interactive row: icon column, label (+ optional description), trailing column. */
export const MenuRowShell = forwardRef<HTMLButtonElement, MenuRowShellProps>(function MenuRowShell(
  { role, active, danger, size, disabled, ariaProps, itemProps, tabIndex, leading, label, description, trailing },
  ref,
) {
  return (
    <button
      type="button"
      ref={ref}
      role={role}
      tabIndex={tabIndex ?? -1}
      data-active={active}
      disabled={disabled}
      className={rowClass({ danger, size })}
      {...itemProps}
      {...ariaProps}
    >
      <span className="flex w-4 shrink-0 items-center justify-center">{leading}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {description && <span className="truncate text-2xs text-fg-mid">{description}</span>}
      </span>
      {trailing && <span className="ml-6 flex shrink-0 items-center gap-2">{trailing}</span>}
    </button>
  );
});

export function CheckSlot({ checked }: { checked: boolean }) {
  return checked ? <CheckIcon className="h-3.5 w-3.5" /> : null;
}

export function RadioDot({ selected }: { selected: boolean }) {
  return <span className={cx("h-1.5 w-1.5 rounded-full", selected ? "bg-current" : "bg-transparent")} />;
}

export function SubmenuArrow() {
  return <ChevronRightIcon aria-hidden className="h-3.5 w-3.5 text-fg-mid" />;
}

export function KeybindingChip({ text }: { text: string }) {
  return <span className="text-fg-mid">{text}</span>;
}

export function RowHeader({ text }: { text: string }) {
  return (
    <div role="presentation" className="px-2 pb-0.5 pt-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-mid">
      {text}
    </div>
  );
}

export function RowSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
