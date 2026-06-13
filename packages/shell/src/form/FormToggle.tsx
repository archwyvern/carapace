import type { ReactNode } from "react";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormToggleProps {
  label: string;
  /** When set, lays out via {@link FieldLayout}. Omitted = the standalone label-left/switch-right row. */
  layout?: FieldLayoutMode;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Extra content shown below when the toggle is on. */
  children?: ReactNode;
}

/** Labelled on/off switch. */
export function FormToggle({ label, layout, value, onChange, disabled, children }: FormToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`w-10 border py-0.5 text-xs uppercase tracking-wide transition ${
        disabled
          ? "cursor-not-allowed border-border bg-surface-raised text-fg-mid opacity-40"
          : value
            ? "border-accent bg-accent/20 text-accent"
            : "border-border bg-surface-raised text-fg-mid hover:text-fg"
      }`}
    >
      {value ? "On" : "Off"}
    </button>
  );

  const row = layout ? (
    <FieldLayout label={label} layout={layout}>
      {button}
    </FieldLayout>
  ) : (
    <div className="flex items-center justify-between">
      <span className={`text-sm text-fg-mid ${disabled ? "opacity-50" : ""}`}>{label}</span>
      {button}
    </div>
  );

  return (
    <div>
      {row}
      {value && children && <div className="mt-2">{children}</div>}
    </div>
  );
}
