export interface FormEnumProps {
  label: string;
  value: number;
  options: string[];
  onChange: (value: number) => void;
}

/** Labelled select. `value` is the option index. */
export function FormEnum({ label, value, options, onChange }: FormEnumProps) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-sm text-fg-mid">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-[22px] cursor-pointer border border-border bg-surface px-1 text-sm text-fg outline-none focus:border-accent"
      >
        {options.map((opt, i) => (
          <option key={i} value={i}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
