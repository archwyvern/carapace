import { ColorPickerButton } from "../color/ColorPickerButton";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormColorProps {
  /** Omit for a bare control (the inspector table supplies the label); pass for standalone use. */
  label?: string;
  /** Accessible name when rendered bare (no `label`). */
  ariaLabel?: string;
  layout?: FieldLayoutMode;
  value: number[];
  hasAlpha?: boolean;
  onChange: (value: number[]) => void;
}

const to2 = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, "0").toUpperCase();

/** Colour field — a swatch (opens the picker) beside a read-only hex well. Labelled via
 *  {@link FieldLayout} when `label` is set, else bare. */
export function FormColor({ label, ariaLabel, layout, value, hasAlpha, onChange }: FormColorProps) {
  const hex = `${to2(value[0] ?? 0)}${to2(value[1] ?? 0)}${to2(value[2] ?? 0)}`;
  const alpha = hasAlpha ? to2(value[3] ?? 1) : null;
  const field = (
    <div className="flex items-center gap-2">
      <div className="h-[22px] w-[26px] shrink-0">
        <ColorPickerButton value={value} hasAlpha={hasAlpha} onChange={onChange} ariaLabel={label !== undefined ? `${label} colour` : ariaLabel} />
      </div>
      <div className="flex h-[22px] min-w-0 flex-1 items-center gap-1 rounded-control border border-border bg-surface-sunken px-1.5 font-mono text-base text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
        <span className="truncate">{hex}</span>
        {alpha && <span className="shrink-0 text-fg-mid">{alpha}</span>}
      </div>
    </div>
  );
  return label === undefined ? field : (
    <FieldLayout label={label} layout={layout}>
      {field}
    </FieldLayout>
  );
}
