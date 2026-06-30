import type { ReactNode } from "react";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormToggleProps {
  /** Omit for a bare switch (the inspector table supplies the label); pass for standalone use. */
  label?: string;
  /** Accessible name when rendered bare (no `label`). */
  ariaLabel?: string;
  /** When set, lays out via {@link FieldLayout}. Omitted (with a `label`) = label-left/switch-right row. */
  layout?: FieldLayoutMode;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Extra content shown below when the toggle is on. */
  children?: ReactNode;
}

/** On/off switch. Labelled (via {@link FieldLayout} or a label-left row) when `label` is set, else bare. */
export function FormToggle({ label, ariaLabel, layout, value, onChange, disabled, children }: FormToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label ?? ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`relative h-5 w-[34px] shrink-0 rounded-full border shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-surface-raised opacity-40"
          : value
            ? "cursor-pointer border-accent bg-accent hover:brightness-110"
            : "cursor-pointer border-border bg-surface-sunken hover:border-fg-mid"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-3.5 w-3.5 rounded-full bg-gradient-to-b from-[#f2f3f5] to-[#c7ccd3] shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform duration-200 ${
          value ? "translate-x-[14px]" : ""
        }`}
      />
    </button>
  );

  let row: ReactNode;
  if (label === undefined) {
    row = button;
  } else if (layout) {
    row = (
      <FieldLayout label={label} layout={layout}>
        {button}
      </FieldLayout>
    );
  } else {
    row = (
      <div className="flex items-center justify-between">
        <span className={`text-md text-fg-mid ${disabled ? "opacity-50" : ""}`}>{label}</span>
        {button}
      </div>
    );
  }

  return (
    <div>
      {row}
      {value && children && <div className="mt-2">{children}</div>}
    </div>
  );
}
