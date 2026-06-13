import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormStringProps {
  label: string;
  layout?: FieldLayoutMode;
  value: string;
  onChange: (value: string) => void;
  /** Called on blur / Enter. Pair with `onChange` (per-keystroke) for undo coalescing. */
  onCommit?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/** Labelled single-line text input. */
export function FormString({ label, layout, value, onChange, onCommit, placeholder, readOnly }: FormStringProps) {
  return (
    <FieldLayout label={label} layout={layout}>
      <input
        type="text"
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
        className={`h-[22px] w-full border border-border bg-surface px-1 text-sm text-fg outline-none focus:border-accent ${
          readOnly ? "cursor-default opacity-60" : ""
        }`}
      />
    </FieldLayout>
  );
}
