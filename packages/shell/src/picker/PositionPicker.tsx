import { PadInput } from "../form/PadInput";

const SIZE = 120;

export interface PositionPickerProps {
  label?: string;
  value: { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
}

/** A [-1,1] square position picker (drag, double-click to reset, arrow keys to nudge) with a
 *  label + live readout + reset affordance. The bare pad itself is form/PadInput — use that
 *  directly for compact hosts like the inspector's `pad` field. */
export function PositionPicker({ label, value, onChange }: PositionPickerProps) {
  const isActive = value.x !== 0 || value.y !== 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base text-fg-mid">{label ?? "Position"}</span>
        <span className="text-base tabular-nums text-accent">
          {value.x.toFixed(2)}, {value.y.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-center">
        <PadInput
          value={[value.x, value.y]}
          onChange={([x, y]) => onChange({ x, y })}
          size={SIZE}
          ariaLabel={label ?? "Position"}
        />
      </div>
      {isActive ? (
        <button
          type="button"
          onClick={() => onChange({ x: 0, y: 0 })}
          className="mx-auto mt-1.5 block text-base uppercase tracking-wide text-fg-mid hover:text-fg"
        >
          Reset to center
        </button>
      ) : (
        <p className="mt-1.5 text-center text-base text-fg-mid">Click to set position</p>
      )}
    </div>
  );
}
