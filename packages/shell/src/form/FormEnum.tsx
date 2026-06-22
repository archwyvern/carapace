import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormEnumProps {
  /** Omit for a bare control (the inspector table supplies the label); pass for standalone use. */
  label?: string;
  /** Accessible name when rendered bare (no `label`). */
  ariaLabel?: string;
  layout?: FieldLayoutMode;
  value: number;
  options: string[];
  onChange: (value: number) => void;
}

/** Select. `value` is the option index. Labelled via {@link FieldLayout} when `label` is set, else bare. */
export function FormEnum({ label, ariaLabel, layout, value, options, onChange }: FormEnumProps) {
  const select = (
    <select
      aria-label={label === undefined ? ariaLabel : undefined}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="h-[22px] w-full cursor-pointer rounded-control border border-border bg-surface-raised px-1.5 text-base text-fg outline-none focus:border-accent"
    >
      {options.map((opt, i) => (
        <option key={i} value={i}>
          {opt}
        </option>
      ))}
    </select>
  );
  return label === undefined ? select : (
    <FieldLayout label={label} layout={layout}>
      {select}
    </FieldLayout>
  );
}
