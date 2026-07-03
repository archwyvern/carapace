import { SpinSlider } from "../primitives/SpinSlider";

export interface FormSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

/** Labelled slider — a SpinSlider with a range (drag-scrub + click-to-type). Drag keeps the
 *  universal fine tiers; arrows step 1% of the range (a whole-unit step would leap to an end). */
export function FormSlider({ label, value, min, max, onChange, onCommit }: FormSliderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-md text-fg-mid">{label}</span>
      <SpinSlider value={value} onChange={onChange} onCommit={onCommit} min={min} max={max} step={(max - min) / 100} />
    </div>
  );
}
