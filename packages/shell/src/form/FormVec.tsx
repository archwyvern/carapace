import { useState } from "react";
import { SpinSlider } from "../primitives/SpinSlider";
import { LinkToggle } from "./LinkToggle";
import { ratioLocked, setAxis } from "./ratioLock";
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
  /** Discrete arrow/spin/wheel increment for every axis (default 1; Shift = ×10). */
  step?: number;
  /** Per-component text labels, replacing the X/Y/Z axis letters + colours (for non-spatial
   *  groupings like radius/radius2). */
  labels?: string[];
  /** Show a chain toggle that locks the components' aspect ratio while editing. */
  link?: boolean;
  /** Initial lock state for `link` (ephemeral — held in component state, never persisted). */
  defaultLinked?: boolean;
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
 *  click-to-type, expression eval) — consistent with every other scalar field in the inspector.
 *  With `link`, a chain toggle locks the components' ratio so editing one scales the rest. */
export function FormVec({ label, layout, value, size, min, max, integer, step, labels, link, defaultLinked, axes, onChange, onCommit }: FormVecProps) {
  const [linked, setLinked] = useState(defaultLinked ?? false);

  const applyAxis = (index: number, v: number): number[] =>
    link && linked ? ratioLocked(value, index, v) : setAxis(value, index, v);

  const column = (axes ?? (size === 2 ? "column" : "row")) === "column";
  const labelText = labels ?? AXIS_LABELS;
  const showAxisColor = labels === undefined;

  const axesEl = (
    <div className={`flex gap-1 ${column ? "flex-col" : ""}`}>
      {Array.from({ length: size }, (_, i) => (
        <div key={i} className={`flex items-center gap-1 ${column ? "" : "min-w-0 flex-1"}`}>
          {showAxisColor ? (
            <span className="w-2.5 shrink-0 text-2xs font-semibold" style={{ color: AXIS_COLORS[i] }}>
              {labelText[i]}
            </span>
          ) : (
            <span className="w-14 shrink-0 truncate text-base text-fg-mid">{labelText[i]}</span>
          )}
          <div className="relative min-w-0 flex-1">
            {showAxisColor && (
              <span className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[3px] rounded-l-control" style={{ background: AXIS_COLORS[i] }} />
            )}
            <SpinSlider
              value={value[i] ?? 0}
              onChange={(v) => onChange(applyAxis(i, v))}
              onCommit={onCommit ? (v) => onCommit(applyAxis(i, v)) : undefined}
              min={min}
              max={max}
              integer={integer}
              step={step}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const body = link ? (
    <div className="flex items-stretch gap-1">
      <div className="min-w-0 flex-1">{axesEl}</div>
      <LinkToggle linked={linked} onToggle={() => setLinked((v) => !v)} column={column} />
    </div>
  ) : (
    axesEl
  );

  return label === undefined ? body : (
    <FieldLayout label={label} layout={layout}>
      {body}
    </FieldLayout>
  );
}
