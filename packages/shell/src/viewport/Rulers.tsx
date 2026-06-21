import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";

export interface RulersProps {
  /** Pixels per world unit (the viewport zoom). Default 1. */
  scale?: number;
  /** World-origin position within the content area, in px (the viewport pan). Default {0,0}. */
  origin?: { x: number; y: number };
  /** Ruler strip thickness, px. Default 22. */
  thickness?: number;
  /** Target px between labelled (major) ticks — drives the nice-step. Default 80. */
  targetSpacing?: number;
  /** The canvas/viewport content the rulers frame. */
  children: ReactNode;
  className?: string;
}

interface Tick {
  pos: number;
  label: string;
  major: boolean;
}

/** Smallest 1/2/5 × 10ⁿ step whose world-width covers `units`. */
function niceStep(units: number): number {
  if (!(units > 0) || !isFinite(units)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(units)));
  for (const m of [1, 2, 5]) if (m * mag >= units) return m * mag;
  return 10 * mag;
}

function fmt(v: number): string {
  return String(Math.round(v * 1e6) / 1e6);
}

function buildTicks(extent: number, origin: number, scale: number, step: number, sub: number): Tick[] {
  if (extent <= 0 || !(scale > 0)) return [];
  const ticks: Tick[] = [];
  const startWorld = -origin / scale;
  const endWorld = (extent - origin) / scale;
  const first = Math.floor(startWorld / sub) * sub;
  for (let w = first; w <= endWorld + 1e-9; w += sub) {
    const pos = origin + w * scale;
    if (pos < -1 || pos > extent + 1) continue;
    const major = Math.abs(w / step - Math.round(w / step)) < 0.1;
    ticks.push({ pos, label: fmt(Math.round(w / step) * step), major });
  }
  return ticks;
}

/**
 * Measurement rulers framing a 2D viewport — top + left strips with a "nice-step" tick scale
 * (1/2/5×10ⁿ) anchored to the world origin and zoom. Reusable canvas chrome for any pannable/
 * zoomable editor; pass the viewport's `scale` + `origin` and it stays in sync.
 */
export function Rulers({
  scale = 1,
  origin = { x: 0, y: 0 },
  thickness = 22,
  targetSpacing = 80,
  children,
  className,
}: RulersProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const step = niceStep(targetSpacing / (scale || 1));
  const sub = step / 5;
  const xticks = useMemo(() => buildTicks(size.w, origin.x, scale, step, sub), [size.w, origin.x, scale, step, sub]);
  const yticks = useMemo(() => buildTicks(size.h, origin.y, scale, step, sub), [size.h, origin.y, scale, step, sub]);

  return (
    <div className={cx("relative h-full w-full bg-surface", className)}>
      <div
        className="absolute left-0 top-0 border-b border-r border-border bg-surface-raised"
        style={{ width: thickness, height: thickness }}
      />
      <div
        className="absolute top-0 overflow-hidden border-b border-border bg-surface-raised"
        style={{ left: thickness, right: 0, height: thickness }}
      >
        <svg width={size.w} height={thickness} className="block">
          {xticks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.pos}
                x2={t.pos}
                y1={t.major ? thickness - 10 : thickness - 5}
                y2={thickness}
                stroke="var(--color-border)"
              />
              {t.major && (
                <text x={t.pos + 3} y={thickness - 12} fill="var(--color-fg-mid)" fontSize={9} fontFamily="var(--font-sans, sans-serif)">
                  {t.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div
        className="absolute left-0 overflow-hidden border-r border-border bg-surface-raised"
        style={{ top: thickness, bottom: 0, width: thickness }}
      >
        <svg width={thickness} height={size.h} className="block">
          {yticks.map((t, i) => (
            <g key={i}>
              <line
                y1={t.pos}
                y2={t.pos}
                x1={t.major ? thickness - 10 : thickness - 5}
                x2={thickness}
                stroke="var(--color-border)"
              />
              {t.major && (
                <text
                  fill="var(--color-fg-mid)"
                  fontSize={9}
                  fontFamily="var(--font-sans, sans-serif)"
                  textAnchor="end"
                  transform={`translate(11 ${t.pos - 4}) rotate(-90)`}
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div ref={contentRef} className="absolute overflow-hidden" style={{ top: thickness, left: thickness, right: 0, bottom: 0 }}>
        {children}
      </div>
    </div>
  );
}
