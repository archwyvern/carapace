import { ColorPickerButton } from "../color/ColorPickerButton";

export interface FormColorProps {
  label: string;
  value: number[];
  hasAlpha?: boolean;
  onChange: (value: number[]) => void;
}

/** Labelled colour field (a ColorPickerButton with a stacked label). */
export function FormColor({ label, value, hasAlpha, onChange }: FormColorProps) {
  return <ColorPickerButton label={label} value={value} hasAlpha={hasAlpha} onChange={onChange} />;
}
