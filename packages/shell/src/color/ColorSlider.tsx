import { useCallback, useEffect, useRef } from "react";

const TRACK_HEIGHT = 14;

export interface ColorSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Label colour (e.g. the channel's axis colour). */
  color: string;
  /** Gradient stops as RGB (0-1) triples. */
  gradient: [number, number, number][];
  onChange: (value: number) => void;
}

/** A single colour-channel slider: a canvas gradient track + drag + numeric input. */
export function ColorSlider({ label, value, min, max, step, color, gradient, onChange }: ColorSliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.offsetWidth;
    if (w === 0) return;
    canvas.width = w;
    canvas.height = TRACK_HEIGHT;
    if (gradient.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      for (let i = 0; i < gradient.length; i++) {
        const [r, g, b] = gradient[i]!;
        grad.addColorStop(
          i / (gradient.length - 1),
          `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`,
        );
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#333";
    }
    ctx.beginPath();
    ctx.roundRect(0, 0, w, TRACK_HEIGHT, 3);
    ctx.fill();
  }, [gradient]);

  const handlePointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const stepped = Math.round((min + ratio * (max - min)) / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    [min, max, step, onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (dragging.current) handlePointer(e.clientX);
    }
    function onUp() {
      dragging.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handlePointer]);

  const ratio = max !== min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  return (
    <div className="flex items-center gap-1.5" style={{ height: 24 }}>
      <span className="shrink-0 text-base font-semibold" style={{ width: 12, color }}>
        {label}
      </span>
      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer"
        style={{ height: TRACK_HEIGHT }}
        onPointerDown={(e) => {
          dragging.current = true;
          handlePointer(e.clientX);
        }}
      >
        <canvas ref={canvasRef} className="block w-full rounded-[3px]" style={{ height: TRACK_HEIGHT }} />
        <div
          className="pointer-events-none absolute rounded-[2px] border border-black/40 bg-white"
          style={{ top: -1, left: `calc(${ratio * 100}% - 4px)`, width: 8, height: TRACK_HEIGHT + 2 }}
        />
      </div>
      <input
        type="number"
        value={parseFloat(value.toFixed(step < 1 ? 2 : 0))}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-[22px] shrink-0 border border-border bg-surface px-1 text-right text-base text-fg outline-none"
        style={{ width: 52 }}
      />
    </div>
  );
}
