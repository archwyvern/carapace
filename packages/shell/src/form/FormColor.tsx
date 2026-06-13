import { ColorPickerButton } from "../color/ColorPickerButton";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

export interface FormColorProps {
  label: string;
  layout?: FieldLayoutMode;
  value: number[];
  hasAlpha?: boolean;
  onChange: (value: number[]) => void;
}

/** Labelled colour field — a colour swatch (opening the picker) with a label. */
export function FormColor({ label, layout, value, hasAlpha, onChange }: FormColorProps) {
  return (
    <FieldLayout label={label} layout={layout}>
      <div style={{ height: 22 }}>
        <ColorPickerButton value={value} hasAlpha={hasAlpha} onChange={onChange} ariaLabel={`${label} colour`} />
      </div>
    </FieldLayout>
  );
}
