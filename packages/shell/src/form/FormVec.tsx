import { SpinSlider } from "../primitives/SpinSlider";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

// Gizmo axis colours: X=red, Y=green, Z=blue, W=accent gold (axis identity — not
// the status tokens).
const AXIS_LABELS = ["X", "Y", "Z", "W"];
const AXIS_COLORS = ["#c85050", "#6aaa4e", "#5080c8", "#c8a84e"];

export interface FormVecProps {
  label: string;
  layout?: FieldLayoutMode;
  value: number[];
  size: 2 | 3 | 4;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  /** Drag-scrub speed multiplier passed to each axis SpinSlider (1 = default). */
  dragScale?: number;
  /** Shift-held drag multiplier passed to each axis SpinSlider (default 0.1 fine; >1 = coarse/faster). */
  shiftScale?: number;
  onChange: (value: number[]) => void;
  /** Fired on per-axis commit (drag-release / Enter / blur) with the full updated array. */
  onCommit?: (value: number[]) => void;
}

/** Labelled multi-axis number field (vec2/3/4). Each axis is a full SpinSlider (drag-scrub,
 *  click-to-type, expression eval) — consistent with every other scalar field in the inspector. */
export function FormVec({ label, layout, value, size, step, min, max, integer, dragScale, shiftScale, onChange, onCommit }: FormVecProps) {
  const withAxis = (index: number, v: number): number[] => {
    const next = [...value];
    next[index] = v;
    return next;
  };

  return (
    <FieldLayout label={label} layout={layout}>
      <div className="flex gap-1">
        {Array.from({ length: size }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-1 items-center gap-1">
            <span className="w-2.5 shrink-0 text-sm font-semibold" style={{ color: AXIS_COLORS[i] }}>
              {AXIS_LABELS[i]}
            </span>
            <div className="min-w-0 flex-1">
              <SpinSlider
                value={value[i] ?? 0}
                onChange={(v) => onChange(withAxis(i, v))}
                onCommit={onCommit ? (v) => onCommit(withAxis(i, v)) : undefined}
                step={step}
                min={min}
                max={max}
                integer={integer}
                dragScale={dragScale}
                shiftScale={shiftScale}
              />
            </div>
          </div>
        ))}
      </div>
    </FieldLayout>
  );
}
