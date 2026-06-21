import { SpinSlider } from "../primitives/SpinSlider";
import { FieldLayout, type FieldLayoutMode } from "./FieldLayout";

// Gizmo axis colours: X=red, Y=green, Z=blue, W=accent gold (axis identity — not
// the status tokens).
const AXIS_LABELS = ["X", "Y", "Z", "W"];
const AXIS_COLORS = ["#c85050", "#6aaa4e", "#5080c8", "#c8a84e"];

export interface FormVecProps {
  /** Omit for a bare control (the inspector table supplies the label); pass for standalone use. */
  label?: string;
  layout?: FieldLayoutMode;
  value: number[];
  size: 2 | 3 | 4;
  min?: number;
  max?: number;
  integer?: boolean;
  /**
   * Axis arrangement. Defaults by size: a Vector2 stacks its components vertically (each gets the
   * full control width — the standard, readable form in a narrow inspector column), vec3/4 sit in a
   * row. Pass explicitly to override.
   */
  axes?: "row" | "column";
  onChange: (value: number[]) => void;
  /** Fired on per-axis commit (drag-release / Enter / blur) with the full updated array. */
  onCommit?: (value: number[]) => void;
}

/** Labelled multi-axis number field (vec2/3/4). Each axis is a full SpinSlider (drag-scrub,
 *  click-to-type, expression eval) — consistent with every other scalar field in the inspector. */
export function FormVec({ label, layout, value, size, min, max, integer, axes, onChange, onCommit }: FormVecProps) {
  const withAxis = (index: number, v: number): number[] => {
    const next = [...value];
    next[index] = v;
    return next;
  };

  const column = (axes ?? (size === 2 ? "column" : "row")) === "column";

  const axesEl = (
    <div className={`flex gap-1 ${column ? "flex-col" : ""}`}>
      {Array.from({ length: size }, (_, i) => (
        <div key={i} className={`flex items-center gap-1 ${column ? "" : "min-w-0 flex-1"}`}>
          <span className="w-2.5 shrink-0 text-2xs font-semibold" style={{ color: AXIS_COLORS[i] }}>
            {AXIS_LABELS[i]}
          </span>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px] rounded-l-control" style={{ background: AXIS_COLORS[i] }} />
            <SpinSlider
              value={value[i] ?? 0}
              onChange={(v) => onChange(withAxis(i, v))}
              onCommit={onCommit ? (v) => onCommit(withAxis(i, v)) : undefined}
              min={min}
              max={max}
              integer={integer}
            />
          </div>
        </div>
      ))}
    </div>
  );
  return label === undefined ? axesEl : (
    <FieldLayout label={label} layout={layout}>
      {axesEl}
    </FieldLayout>
  );
}
