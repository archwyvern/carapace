// Gizmo axis colours: X=red, Y=green, Z=blue, W=accent gold (axis identity — not
// the status tokens).
const AXIS_LABELS = ["X", "Y", "Z", "W"];
const AXIS_COLORS = ["#c85050", "#6aaa4e", "#5080c8", "#c8a84e"];

export interface FormVecProps {
  label: string;
  value: number[];
  size: 2 | 3 | 4;
  step?: number;
  onChange: (value: number[]) => void;
}

/** Labelled multi-axis number field (vec2/3/4). */
export function FormVec({ label, value, size, step = 0.01, onChange }: FormVecProps) {
  function handleChange(index: number, v: number) {
    const next = [...value];
    next[index] = v;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-fg-mid">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: size }, (_, i) => (
          <div key={i} className="flex flex-1 items-center gap-1">
            <span className="w-2.5 text-sm font-semibold" style={{ color: AXIS_COLORS[i] }}>
              {AXIS_LABELS[i]}
            </span>
            <input
              type="number"
              value={value[i] ?? 0}
              step={step}
              onChange={(e) => handleChange(i, parseFloat(e.target.value) || 0)}
              className="h-[22px] min-w-0 flex-1 border border-border bg-surface px-1 text-sm text-fg outline-none focus:border-accent"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
