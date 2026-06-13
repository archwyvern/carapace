import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 120;

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
}

export interface PositionPickerProps {
  label?: string;
  value: { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
}

/** A [-1,1] square position picker (drag, double-click to reset, arrow keys to nudge). */
export function PositionPicker({ label, value, onChange }: PositionPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const isActive = value.x !== 0 || value.y !== 0;

  const posFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
    return { x: clampUnit(nx), y: clampUnit(ny) };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => onChange(posFromEvent(e.clientX, e.clientY));
    const onUp = () => setDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onChange, posFromEvent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const styles = getComputedStyle(canvas);
    const accent = styles.getPropertyValue("--color-accent").trim() || "#4f8cff";
    const border = styles.getPropertyValue("--color-border").trim() || "#34343a";
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

    const half = SIZE / 2;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(SIZE, half);
    ctx.moveTo(half, 0);
    ctx.lineTo(half, SIZE);
    ctx.stroke();

    const dotX = ((value.x + 1) / 2) * SIZE;
    const dotY = ((value.y + 1) / 2) * SIZE;
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
  }, [value, isActive]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 0.05;
      let { x, y } = value;
      switch (e.key) {
        case "ArrowLeft": x -= step; break;
        case "ArrowRight": x += step; break;
        case "ArrowUp": y -= step; break;
        case "ArrowDown": y += step; break;
        default: return;
      }
      e.preventDefault();
      onChange({ x: clampUnit(x), y: clampUnit(y) });
    },
    [value, onChange],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-fg-mid">{label ?? "Position"}</span>
        <span className="text-xs tabular-nums text-accent">
          {value.x.toFixed(2)}, {value.y.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={label ?? "Position"}
          style={{ width: SIZE, height: SIZE, cursor: dragging ? "grabbing" : "crosshair" }}
          onMouseDown={(e) => {
            e.preventDefault();
            setDragging(true);
            onChange(posFromEvent(e.clientX, e.clientY));
          }}
          onDoubleClick={() => onChange({ x: 0, y: 0 })}
          onKeyDown={handleKeyDown}
        />
      </div>
      {isActive ? (
        <button
          type="button"
          onClick={() => onChange({ x: 0, y: 0 })}
          className="mx-auto mt-1.5 block text-xs uppercase tracking-wide text-fg-mid hover:text-fg"
        >
          Reset to center
        </button>
      ) : (
        <p className="mt-1.5 text-center text-xs text-fg-mid">Click to set position</p>
      )}
    </div>
  );
}
