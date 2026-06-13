import { useCallback, useEffect, useRef } from "react";
import { hsvToRgb } from "./colorMath";

const VALUE_STRIP_WIDTH = 20;
const VALUE_STRIP_GAP = 8;
const INDICATOR_RADIUS = 6;

export interface ColorWheelProps {
  hue: number;
  saturation: number;
  value: number;
  size: number;
  onChange: (h: number, s: number, v: number) => void;
}

/** HSV colour wheel + value strip (canvas; drag-driven). */
export function ColorWheel({ hue, saturation, value, size, onChange }: ColorWheelProps) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const draggingWheel = useRef(false);
  const draggingStrip = useRef(false);

  const wheelDiameter = size - VALUE_STRIP_WIDTH - VALUE_STRIP_GAP;
  const wheelRadius = wheelDiameter / 2;
  const stripHeight = wheelDiameter;

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = wheelDiameter;
    const h = wheelDiameter;
    canvas.width = w;
    canvas.height = h;

    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    const cx = w / 2;
    const cy = h / 2;
    const r = wheelRadius;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r) {
          const angle = Math.atan2(dy, dx);
          const hueVal = ((angle * 180) / Math.PI + 360) % 360;
          const sat = (dist / r) * 100;
          const [cr, cg, cb] = hsvToRgb(hueVal, sat, value);
          const idx = (y * w + x) * 4;
          data[idx] = Math.round(cr * 255);
          data[idx + 1] = Math.round(cg * 255);
          data[idx + 2] = Math.round(cb * 255);
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const indicatorAngle = (hue * Math.PI) / 180;
    const indicatorDist = (saturation / 100) * r;
    const ix = cx + Math.cos(indicatorAngle) * indicatorDist;
    const iy = cy + Math.sin(indicatorAngle) * indicatorDist;
    ctx.beginPath();
    ctx.arc(ix, iy, INDICATOR_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ix, iy, INDICATOR_RADIUS + 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hue, saturation, value, wheelDiameter, wheelRadius]);

  useEffect(() => {
    const canvas = stripRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = VALUE_STRIP_WIDTH;
    canvas.height = stripHeight;

    const [tr, tg, tb] = hsvToRgb(hue, saturation, 100);
    const gradient = ctx.createLinearGradient(0, 0, 0, stripHeight);
    gradient.addColorStop(0, `rgb(${Math.round(tr * 255)},${Math.round(tg * 255)},${Math.round(tb * 255)})`);
    gradient.addColorStop(1, "rgb(0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VALUE_STRIP_WIDTH, stripHeight);

    const iy = (1 - value / 100) * stripHeight;
    ctx.beginPath();
    ctx.moveTo(0, iy);
    ctx.lineTo(VALUE_STRIP_WIDTH, iy);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, iy + 1);
    ctx.lineTo(VALUE_STRIP_WIDTH, iy + 1);
    ctx.stroke();
  }, [hue, saturation, value, stripHeight]);

  const handleWheelPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = wheelRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dx = clientX - rect.left - wheelDiameter / 2;
      const dy = clientY - rect.top - wheelDiameter / 2;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), wheelRadius);
      const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      onChange(angle, (dist / wheelRadius) * 100, value);
    },
    [wheelDiameter, wheelRadius, value, onChange],
  );

  const handleStripPointer = useCallback(
    (clientY: number) => {
      const canvas = stripRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const y = Math.max(0, Math.min(clientY - rect.top, stripHeight));
      onChange(hue, saturation, (1 - y / stripHeight) * 100);
    },
    [hue, saturation, stripHeight, onChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (draggingWheel.current) handleWheelPointer(e.clientX, e.clientY);
      else if (draggingStrip.current) handleStripPointer(e.clientY);
    }
    function onUp() {
      draggingWheel.current = false;
      draggingStrip.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [handleWheelPointer, handleStripPointer]);

  return (
    <div className="flex" style={{ gap: VALUE_STRIP_GAP }}>
      <canvas
        ref={wheelRef}
        style={{ width: wheelDiameter, height: wheelDiameter, cursor: "crosshair", borderRadius: "50%" }}
        onPointerDown={(e) => {
          draggingWheel.current = true;
          handleWheelPointer(e.clientX, e.clientY);
        }}
      />
      <canvas
        ref={stripRef}
        style={{ width: VALUE_STRIP_WIDTH, height: stripHeight, cursor: "ns-resize", borderRadius: 2 }}
        onPointerDown={(e) => {
          draggingStrip.current = true;
          handleStripPointer(e.clientY);
        }}
      />
    </div>
  );
}
