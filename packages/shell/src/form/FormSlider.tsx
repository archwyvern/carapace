import { SpinSlider } from "../primitives/SpinSlider";

export interface FormSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

/** Labelled slider — a SpinSlider with a range (drag-scrub + click-to-type). */
export function FormSlider({ label, value, min, max, step, onChange, onCommit }: FormSliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-fg-mid">{label}</span>
      <SpinSlider value={value} onChange={onChange} onCommit={onCommit} min={min} max={max} step={step} />
    </div>
  );
}
