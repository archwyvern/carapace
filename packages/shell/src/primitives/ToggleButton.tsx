import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { tv } from "tailwind-variants";
import { cx } from "../cx";

const toggleButton = tv({
  base: "border border-border px-3 text-base outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
  variants: {
    pressed: {
      true: "bg-list-active text-fg",
      false: "text-fg-mid hover:bg-surface-raised hover:text-accent",
    },
  },
});

export interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** A single on/off toolbar toggle (aria-pressed) — e.g. a snap switch. Mutually-exclusive groups
 *  use <Segmented> instead. */
export function ToggleButton({ pressed, onChange, className, children, ref, ...rest }: ToggleButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={toggleButton({ pressed, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface SegmentedOption<V extends string> {
  value: V;
  /** Visible segment text; defaults to the value. */
  label?: ReactNode;
  /** Selected tint: danger (deny-style) or accent (privileged); neutral otherwise. */
  tone?: "danger" | "accent";
}

const SELECTED_TONE: Record<"neutral" | "danger" | "accent", string> = {
  neutral: "bg-list-active text-fg",
  danger: "bg-error/15 text-error",
  accent: "bg-list-active text-accent",
};

export interface SegmentedProps<V extends string> {
  options: readonly SegmentedOption<V>[] | readonly V[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
  /** Extra classes per segment button (sizing). */
  segmentClassName?: string;
}

/**
 * Segmented — mutually-exclusive toolbar toggles rendered as one bordered strip (view modes,
 * display units, ...). Deliberately a group of aria-pressed buttons, NOT role=tablist: there is
 * no tabpanel/roving-tabindex behind these, so the tab pattern would be a broken ARIA promise.
 */
export function Segmented<V extends string>({ options, value, onChange, label, className, segmentClassName }: SegmentedProps<V>) {
  const opts: SegmentedOption<V>[] = options.map((o) => (typeof o === "string" ? { value: o } : o));
  return (
    <div className={cx("flex items-stretch border border-border", className)} role="group" aria-label={label}>
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "border-r border-border px-3 text-base capitalize outline-none transition-colors last:border-r-0 focus-visible:ring-1 focus-visible:ring-ring",
            value === o.value
              ? (SELECTED_TONE[o.tone ?? "neutral"])
              : "text-fg-mid hover:bg-surface-raised hover:text-accent",
            segmentClassName,
          )}
        >
          {o.label ?? o.value}
        </button>
      ))}
    </div>
  );
}
