import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "../icons";

export interface SpinSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Fired on drag-release and on commit (Enter/blur). Pair with onChange so a
   *  whole drag or edit collapses to a single undo entry. */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  /** Integer field — the drag step is always 1.0 (the float Shift/Ctrl tiers don't apply). */
  integer?: boolean;
  /** Discrete increment for arrow keys, spin buttons, and wheel (default 1; Shift = ×10).
   *  Added unrounded — 0.2 steps to 1.2, not 1.0. Drag scrubbing keeps the universal fine tiers. */
  step?: number;
  /** Soft max — drag/type may exceed `max`. */
  orGreater?: boolean;
  /** Soft min — drag/type may go below `min`. */
  orLess?: boolean;
  /** Logarithmic drag mapping (requires min > 0). */
  exp?: boolean;
  /** Suppress the fill bar. */
  hideSlider?: boolean;
  /** Show stacked inc/dec buttons on the right (a classic spinbox). Each click steps by the
   *  universal step (Shift/Ctrl coarsen it on float fields) and commits. */
  spinButtons?: boolean;
  /** Unit suffix shown as dim micro-text. */
  suffix?: string;
  /** Opt in to wheel-to-step. Off by default so it never hijacks scroll. */
  wheel?: boolean;
  readOnly?: boolean;
  /** Extra left padding in px (both display and edit modes) — room for an in-field adornment
   *  like FormVec's axis letter, so adorned and bare fields keep identical outer geometry. */
  paddingLeft?: number;
}

function format(value: number, integer?: boolean): string {
  if (integer) return String(Math.round(value));
  if (Number.isInteger(value)) return value.toFixed(0);
  return parseFloat(value.toFixed(4)).toString();
}

type Mod = { shiftKey: boolean; ctrlKey: boolean };

/**
 * The universal DRAG step (per pixel of scrub). Float fields step by 0.01; Shift coarsens to 0.1,
 * Ctrl to 1.0. Integer fields step 1.0 — except when the field has a bounded range, where the
 * step is scaled so the FULL RANGE takes ~150px of drag (capped at 1/px): a 1..8 field must not
 * sweep its whole range in 7 pixels. Keyboard arrows, spin buttons, and wheel use the discrete
 * `step` prop instead (default 1, Shift ×10) — see `discrete` below.
 */
function stepFor(integer: boolean | undefined, mod: Mod, range?: number): number {
  if (integer) return range !== undefined ? Math.min(1, range / 150) : 1;
  if (mod.ctrlKey) return 1;
  if (mod.shiftKey) return 0.1;
  return 0.01;
}

// Text -> number; supports arithmetic expressions like "1+2*3".
function evaluate(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const direct = parseFloat(trimmed);
  if (!isNaN(direct) && String(direct) === trimmed) return direct;
  if (!/^[-+*/().\d\s]+$/.test(trimmed)) return isNaN(direct) ? null : direct;
  try {
    const result = Function(`"use strict"; return (${trimmed});`)();
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function SpinSlider({
  value, onChange, onCommit,
  min, max, integer, step,
  orGreater, orLess, exp, hideSlider, spinButtons, suffix, wheel, readOnly, paddingLeft,
}: SpinSliderProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  // acc = accumulated movementX since pointer-down; startVal captured so drags don't compound.
  const drag = useRef<{ startVal: number; acc: number; moved: boolean } | null>(null);
  // Discrete steps base on the last value WE sent until the prop catches up — key-repeat outruns
  // the parent's re-render, and stepping from the stale prop silently drops every other press.
  const pending = useRef<number | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [value]);

  const hasRange = min !== undefined && max !== undefined && max > min;
  const lo = min ?? 0;
  const hi = max ?? 0;
  const ratio = hasRange ? Math.min(1, Math.max(0, (value - lo) / (hi - lo))) : 0;
  const showBar = hasRange && !hideSlider;
  const expOk = exp === true && hasRange && lo > 0;
  const logSpan = expOk ? Math.log(hi / lo) : 0;

  const clamp = (v: number): number => {
    let x = v;
    if (min !== undefined && !orLess) x = Math.max(min, x);
    if (max !== undefined && !orGreater) x = Math.min(max, x);
    if (integer) return Math.round(x);
    return parseFloat(x.toFixed(6));
  };
  // Arrow keys / spin buttons / wheel move by the WHOLE discrete step (default 1, Shift ×10),
  // added unrounded; only drag-scrubbing uses the fine stepFor tiers.
  const discrete = (mod: Mod): number => (step ?? 1) * (mod.shiftKey ? 10 : 1);
  const nudge = (dir: number, mod: Mod) => {
    const v = clamp((pending.current ?? value) + dir * discrete(mod));
    pending.current = v;
    onChange(v);
  };
  // Like nudge but also commits — used by the inc/dec spin buttons (each click is discrete).
  const stepBy = (dir: number, mod: Mod) => {
    const v = clamp((pending.current ?? value) + dir * discrete(mod));
    pending.current = v;
    onChange(v);
    onCommit?.(v);
  };
  const beginEdit = () => { setText(format(value, integer)); setEditing(true); };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly || editing) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture?.(e.pointerId);
    const lock = el.requestPointerLock?.() as unknown as Promise<void> | undefined;
    if (lock && typeof lock.then === "function") lock.catch(() => {}); // ignore lock denial; capture still works
    drag.current = { startVal: value, acc: 0, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.acc += e.movementX;
    if (!d.moved && Math.abs(d.acc) < 3) return;
    d.moved = true;
    if (expOk && d.startVal > 0) {
      onChange(clamp(d.startVal * Math.exp((d.acc / 300) * logSpan)));
    } else {
      // Per-pixel granularity = the active step tier: 0.01/px (float), 0.1 with Shift, 1.0 with
      // Ctrl, 1.0 (int, range-scaled when bounded). Hold Ctrl to scrub large unbounded fields.
      onChange(clamp(d.startVal + d.acc * stepFor(integer, e, hasRange ? hi - lo : undefined)));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    const el = e.currentTarget as HTMLElement;
    el.releasePointerCapture?.(e.pointerId);
    if (document.pointerLockElement === el) document.exitPointerLock?.();
    if (d && !d.moved) beginEdit();
    else if (d) onCommit?.(value);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (wheel !== true || readOnly || editing) return;
    stepBy(e.deltaY < 0 ? 1 : -1, e);
  };

  const commit = () => {
    const parsed = evaluate(text);
    if (parsed != null) {
      const v = clamp(parsed);
      onChange(v);
      onCommit?.(v);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-[22px] w-full rounded-control border border-accent bg-surface-sunken px-1.5 font-mono text-base text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none"
        style={paddingLeft !== undefined ? { paddingLeft } : undefined}
      />
    );
  }

  return (
    <div
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); beginEdit(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); nudge(1, e); }
        else if (e.key === "ArrowDown") { e.preventDefault(); nudge(-1, e); }
      }}
      title="Drag to scrub (Shift = fine) · click or Enter to type · up/down step ±1 (Shift ±10)"
      className={`relative flex h-[22px] w-full cursor-ew-resize select-none items-center gap-1 overflow-hidden rounded-control border border-border bg-surface-sunken px-1.5 font-mono text-base text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none hover:border-accent focus-visible:border-accent focus-visible:outline-none ${
        readOnly ? "opacity-60" : ""
      }`}
      style={paddingLeft !== undefined ? { paddingLeft } : undefined}
    >
      {showBar && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[2px] bg-accent"
          style={{ width: `${ratio * 100}%` }}
        />
      )}
      <span className="pointer-events-none relative flex-1 truncate">{format(value, integer)}</span>
      {suffix && (
        <span className="pointer-events-none relative shrink-0 text-[10px] leading-none text-fg-mid opacity-70">
          {suffix}
        </span>
      )}
      {spinButtons && !readOnly && (
        <span className="relative -mr-1 flex shrink-0 flex-col self-stretch border-l border-border" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" tabIndex={-1} aria-label="Increment" onClick={(e) => { e.stopPropagation(); stepBy(1, e); }}
            className="flex h-[10px] w-4 items-center justify-center text-fg-mid hover:bg-surface-raised hover:text-fg"><ChevronDownIcon className="h-2.5 w-2.5 rotate-180" /></button>
          <button type="button" tabIndex={-1} aria-label="Decrement" onClick={(e) => { e.stopPropagation(); stepBy(-1, e); }}
            className="flex h-[10px] w-4 items-center justify-center text-fg-mid hover:bg-surface-raised hover:text-fg"><ChevronDownIcon className="h-2.5 w-2.5" /></button>
        </span>
      )}
    </div>
  );
}
