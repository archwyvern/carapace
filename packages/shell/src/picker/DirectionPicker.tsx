import { useCallback, useEffect, useRef, useState } from "react";

const SIZE = 120;
const RADIUS = SIZE / 2 - 2;
const CENTER = SIZE / 2;

function clampToCircle(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

export interface DirectionPickerProps {
  label?: string;
  value: { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
}

/** A unit-circle direction picker (drag, double-click to reset, arrow keys to nudge). */
export function DirectionPicker({ label, value, onChange }: DirectionPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const isActive = value.x !== 0 || value.y !== 0;

  const posFromEvent = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * SIZE;
    const py = ((clientY - rect.top) / rect.height) * SIZE;
    const c = clampToCircle((px - CENTER) / RADIUS, (py - CENTER) / RADIUS);
    return clampToCircle(Math.round(c.x * 100) / 100, Math.round(c.y * 100) / 100);
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

    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(CENTER - RADIUS, CENTER);
    ctx.lineTo(CENTER + RADIUS, CENTER);
    ctx.moveTo(CENTER, CENTER - RADIUS);
    ctx.lineTo(CENTER, CENTER + RADIUS);
    ctx.stroke();

    const dotX = CENTER + value.x * RADIUS;
    const dotY = CENTER + value.y * RADIUS;
    if (isActive) {
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(dotX, dotY);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? accent : border;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 2, 0, Math.PI * 2);
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
      const c = clampToCircle(x, y);
      onChange({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100 });
    },
    [value, onChange],
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-base text-fg-mid">{label ?? "Direction"}</span>
        <span className="text-base tabular-nums text-accent">
          {value.x.toFixed(2)}, {value.y.toFixed(2)}
        </span>
      </div>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={label ?? "Direction"}
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
          className="mx-auto mt-1.5 block text-base uppercase tracking-wide text-fg-mid hover:text-fg"
        >
          Reset to center
        </button>
      ) : (
        <p className="mt-1.5 text-center text-base text-fg-mid">Click to set direction</p>
      )}
    </div>
  );
}
