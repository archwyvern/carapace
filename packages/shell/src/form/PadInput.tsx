import { useCallback, useEffect, useRef, useState } from "react";

/** Clamp to the unit range at display precision (2dp — the pad's pixel resolution). */
function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
}

export interface PadInputProps {
  /** [x, y], nominally -1..1 each (out-of-range values render clamped to the rim). */
  value: [number, number];
  onChange: (value: [number, number]) => void;
  /** Fires when a gesture settles: drag release, an arrow-key nudge, double-click reset. */
  onCommit?: (value: [number, number]) => void;
  /** Pad edge in px. Default 64 — the inspector-row scale. */
  size?: number;
  ariaLabel?: string;
}

/** Bare [-1,1]² XY pad: drag the handle, double-click to reset, arrow keys to nudge. The
 *  building block under PositionPicker (which adds label/readout/reset chrome) and the
 *  inspector's opt-in `pad` field. */
export function PadInput({ value, onChange, onCommit, size = 64, ariaLabel }: PadInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  // The last value THIS pad emitted — a drag's mouseup must commit what the drag produced, not a
  // possibly stale prop (the parent may batch/coalesce renders mid-drag).
  const lastEmitted = useRef<[number, number]>(value);
  const isActive = value[0] !== 0 || value[1] !== 0;

  const emit = useCallback(
    (v: [number, number]) => {
      lastEmitted.current = v;
      onChange(v);
    },
    [onChange],
  );

  const posFromEvent = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const rect = canvas.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
      return [clampUnit(nx), clampUnit(ny)];
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => emit(posFromEvent(e.clientX, e.clientY));
    const onUp = () => {
      setDragging(false);
      onCommit?.(lastEmitted.current);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, emit, posFromEvent, onCommit]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const styles = getComputedStyle(canvas);
    const accent = styles.getPropertyValue("--color-accent").trim() || "#4f8cff";
    const border = styles.getPropertyValue("--color-border").trim() || "#34343a";
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    const half = size / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(size, half);
    ctx.moveTo(half, 0);
    ctx.lineTo(half, size);
    ctx.stroke();

    // Out-of-range values (soft-typed past ±1) draw clamped to the rim.
    const dotX = ((Math.max(-1, Math.min(1, value[0])) + 1) / 2) * size;
    const dotY = ((Math.max(-1, Math.min(1, value[1])) + 1) / 2) * size;
    if (isActive) {
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.lineTo(dotX, dotY);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? accent : border;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(half, half, 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
  }, [value, isActive, size]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.05;
      let [x, y] = value;
      switch (e.key) {
        case "ArrowLeft": x -= step; break;
        case "ArrowRight": x += step; break;
        case "ArrowUp": y -= step; break;
        case "ArrowDown": y += step; break;
        default: return;
      }
      e.preventDefault();
      const v: [number, number] = [clampUnit(x), clampUnit(y)];
      emit(v);
      onCommit?.(v);
    },
    [value, emit, onCommit],
  );

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      role="slider"
      aria-label={ariaLabel ?? "XY pad"}
      aria-valuetext={`${value[0].toFixed(2)}, ${value[1].toFixed(2)}`}
      className="shrink-0 rounded-control outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{ width: size, height: size, cursor: dragging ? "grabbing" : "crosshair" }}
      onMouseDown={(e) => {
        e.preventDefault();
        canvasRef.current?.focus();
        setDragging(true);
        emit(posFromEvent(e.clientX, e.clientY));
      }}
      onDoubleClick={() => {
        emit([0, 0]);
        onCommit?.([0, 0]);
      }}
      onKeyDown={handleKeyDown}
    />
  );
}
