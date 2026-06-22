import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormStringProps {
  /** Omit for a bare control (the inspector table supplies the label); pass for standalone use. */
  label?: string;
  /** Accessible name when rendered bare (no `label`). */
  ariaLabel?: string;
  layout?: FieldLayoutMode;
  value: string;
  onChange: (value: string) => void;
  /** Called on blur / Enter. Pair with `onChange` (per-keystroke) for undo coalescing. */
  onCommit?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/** Single-line text input. Labelled via {@link FieldLayout} when `label` is set, else bare. */
export function FormString({ label, ariaLabel, layout, value, onChange, onCommit, placeholder, readOnly }: FormStringProps) {
  const input = (
    <input
      type="text"
      aria-label={label === undefined ? ariaLabel : undefined}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onCommit?.(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit?.(value);
        }
      }}
      className={`h-[22px] w-full rounded-control border border-border bg-surface-sunken px-1.5 text-base text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus:border-accent ${
        readOnly ? "cursor-default opacity-60" : ""
      }`}
    />
  );
  return label === undefined ? input : (
    <FieldLayout label={label} layout={layout}>
      {input}
    </FieldLayout>
  );
}
