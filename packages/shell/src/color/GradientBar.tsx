import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cx } from "../cx";
import { IconButton } from "../primitives/IconButton";
import { CloseIcon } from "../icons";

export interface GradientStop {
  /** Position along the bar, 0..1. */
  offset: number;
  /** Hex colour, e.g. "#d6a35a". */
  color: string;
}

export interface GradientBarProps {
  stops: GradientStop[];
  onChange: (stops: GradientStop[]) => void;
  className?: string;
}

const sorted = (s: GradientStop[]) => [...s].sort((a, b) => a.offset - b.offset);

/**
 * Presentational gradient-stop editor over a generic `{offset, color}[]` model: drag markers
 * to reposition, click the track to add a stop, edit/remove the selected one. Composes carapace's
 * colour input; the resource-agnostic version of drydock's gradient editor.
 */
export function GradientBar({ stops, onChange, className }: GradientBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const ordered = sorted(stops);

  const css = `linear-gradient(to right, ${ordered.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ")})`;

  const offsetAt = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const dragStop = (index: number, e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(index);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const next = stops.map((s, i) => (i === index ? { ...s, offset: offsetAt(ev.clientX) } : s));
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const addStop = (e: ReactPointerEvent) => {
    const offset = offsetAt(e.clientX);
    // sample the colour already at that position by nearest stop
    const near = ordered.length
      ? ordered.reduce((a, b) => (Math.abs(b.offset - offset) < Math.abs(a.offset - offset) ? b : a))
      : undefined;
    const next = [...stops, { offset, color: near?.color ?? "#ffffff" }];
    onChange(next);
    setSelected(next.length - 1);
  };

  const editColor = (color: string) => onChange(stops.map((s, i) => (i === selected ? { ...s, color } : s)));
  const removeSelected = () => {
    if (stops.length <= 2) return;
    onChange(stops.filter((_, i) => i !== selected));
    setSelected(0);
  };

  const cur = stops[selected];

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <div
        ref={trackRef}
        onPointerDown={addStop}
        className="relative h-6 cursor-copy rounded-control border border-border shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"
        style={{ background: css }}
      >
        {stops.map((s, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Stop ${i + 1}`}
            onPointerDown={(e) => dragStop(i, e)}
            className={cx(
              "absolute top-1/2 h-4 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border shadow-sm",
              i === selected ? "border-fg ring-1 ring-fg" : "border-fg/50",
            )}
            style={{ left: `${s.offset * 100}%`, background: s.color }}
          />
        ))}
      </div>
      {cur && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Stop colour"
            value={cur.color}
            onChange={(e) => editColor(e.target.value)}
            className="h-6 w-9 cursor-pointer rounded-control border border-border bg-surface-sunken"
          />
          <span className="font-mono text-2xs uppercase text-fg-mid">{cur.color}</span>
          <span className="text-2xs text-fg-mid">{Math.round(cur.offset * 100)}%</span>
          <span className="flex-1" />
          <IconButton
            label="Remove stop"
            variant="danger"
            icon={<CloseIcon />}
            disabled={stops.length <= 2}
            onClick={removeSelected}
          />
        </div>
      )}
    </div>
  );
}
