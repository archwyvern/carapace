import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormEnumProps {
  label: string;
  layout?: FieldLayoutMode;
  value: number;
  options: string[];
  onChange: (value: number) => void;
}

/** Labelled select. `value` is the option index. */
export function FormEnum({ label, layout, value, options, onChange }: FormEnumProps) {
  return (
    <FieldLayout label={label} layout={layout}>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-[22px] w-full cursor-pointer border border-border bg-surface px-1 text-sm text-fg outline-none focus:border-accent"
      >
        {options.map((opt, i) => (
          <option key={i} value={i}>
            {opt}
          </option>
        ))}
      </select>
    </FieldLayout>
  );
}
