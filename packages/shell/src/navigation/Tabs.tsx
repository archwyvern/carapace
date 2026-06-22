import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { tv } from "tailwind-variants";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export type TabsVariant = "segmented" | "underline";

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** "segmented" = pill group on a sunken track (default); "underline" = line tabs. */
  variant?: TabsVariant;
  ariaLabel?: string;
  className?: string;
}

const tabs = tv({
  slots: {
    list: "",
    tab: "inline-flex items-center gap-1.5 text-base outline-none transition-colors",
  },
  variants: {
    variant: {
      segmented: {
        list: "inline-flex items-center gap-0.5 rounded-control bg-surface-sunken p-0.5",
        tab: "rounded-[3px] px-2.5 py-1 focus-visible:ring-1 focus-visible:ring-ring",
      },
      underline: {
        list: "flex items-center gap-1 border-b border-border",
        tab: "-mb-px border-b-2 px-2.5 py-1.5 focus-visible:text-fg",
      },
    },
    active: { true: {}, false: {} },
    disabled: { true: { tab: "pointer-events-none opacity-40" } },
  },
  compoundVariants: [
    { variant: "segmented", active: true, class: { tab: "bg-surface-raised text-fg shadow-sm" } },
    { variant: "segmented", active: false, class: { tab: "text-fg-mid hover:text-fg" } },
    { variant: "underline", active: true, class: { tab: "border-accent text-fg" } },
    { variant: "underline", active: false, class: { tab: "border-transparent text-fg-mid hover:text-fg" } },
  ],
  defaultVariants: { variant: "segmented" },
});

/**
 * Inline tab switcher for small, fixed view sets (Code / Analysis, Edit / Preview).
 * Distinct from EditorTabs (document tabs with close/dirty/reorder). Full roving-
 * tabindex keyboard support (arrows, Home/End).
 */
export function Tabs({ items, value, onChange, variant = "segmented", ariaLabel, className }: TabsProps) {
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  const nextEnabled = (from: number, dir: 1 | -1) => {
    const n = items.length;
    let i = from;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!items[i]?.disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = nextEnabled(idx, 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = nextEnabled(idx, -1);
    else if (e.key === "Home") next = nextEnabled(items.length - 1, 1);
    else if (e.key === "End") next = nextEnabled(0, -1);
    else return;
    e.preventDefault();
    onChange(items[next]!.id);
    btns.current[next]?.focus();
  };

  const slots = tabs({ variant });

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      className={slots.list({ class: className })}
    >
      {items.map((it, i) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            ref={(el) => {
              btns.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={it.disabled}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={tabs({ variant, active, disabled: it.disabled }).tab()}
          >
            {it.icon && <span className="flex [&_svg]:h-3.5 [&_svg]:w-3.5">{it.icon}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
