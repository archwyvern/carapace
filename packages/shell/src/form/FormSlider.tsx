import { SpinSlider } from "../primitives/SpinSlider";

export interface FormSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

/** Labelled slider — a SpinSlider with a range (drag-scrub + click-to-type). Step is the
 *  universal tier (0.01 · Shift 0.1 · Ctrl 1.0), not configurable. */
export function FormSlider({ label, value, min, max, onChange, onCommit }: FormSliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-md text-fg-mid">{label}</span>
      <SpinSlider value={value} onChange={onChange} onCommit={onCommit} min={min} max={max} />
    </div>
  );
}
