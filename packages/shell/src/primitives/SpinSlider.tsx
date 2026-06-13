import { useRef, useState } from "react";

export interface SpinSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Fired on drag-release and on commit (Enter/blur). Pair with onChange so a
   *  whole drag or edit collapses to a single undo entry. */
  onCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  /** Soft max — drag/type may exceed `max`. */
  orGreater?: boolean;
  /** Soft min — drag/type may go below `min`. */
  orLess?: boolean;
  /** Logarithmic drag mapping (requires min > 0). */
  exp?: boolean;
  /** Suppress the fill bar. */
  hideSlider?: boolean;
  /** Unit suffix shown as dim micro-text. */
  suffix?: string;
  /** Opt in to wheel-to-step. Off by default so it never hijacks scroll. */
  wheel?: boolean;
  readOnly?: boolean;
}

function format(value: number, integer?: boolean): string {
  if (integer) return String(Math.round(value));
  if (Number.isInteger(value)) return value.toFixed(0);
  return parseFloat(value.toFixed(4)).toString();
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
  min, max, step, integer,
  orGreater, orLess, exp, hideSlider, suffix, wheel, readOnly,
}: SpinSliderProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  // acc = accumulated movementX since pointer-down; startVal captured so drags don't compound.
  const drag = useRef<{ startVal: number; acc: number; moved: boolean } | null>(null);

  const hasRange = min !== undefined && max !== undefined && max > min;
  const lo = min ?? 0;
  const hi = max ?? 0;
  const ratio = hasRange ? Math.min(1, Math.max(0, (value - lo) / (hi - lo))) : 0;
  const showBar = hasRange && !hideSlider;
  const effStep = step ?? (integer ? 1 : 0.01);
  // ~300px traverses a known range; capped so 0..1000 doesn't become twitchy. Shift = fine.
  const perPx = hasRange ? Math.min((hi - lo) / 300, 25 * effStep) : effStep * 2;
  const expOk = exp === true && hasRange && lo > 0;
  const logSpan = expOk ? Math.log(hi / lo) : 0;

  const clampRound = (v: number): number => {
    let x = v;
    if (min !== undefined && !orLess) x = Math.max(min, x);
    if (max !== undefined && !orGreater) x = Math.min(max, x);
    if (integer) return Math.round(x);
    if (effStep > 0) x = Math.round(x / effStep) * effStep;
    return parseFloat(x.toFixed(6));
  };
  const nudge = (dir: number, fine: boolean) =>
    onChange(clampRound(value + dir * effStep * (fine ? 10 : 1)));
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
    const fine = e.shiftKey ? 0.1 : 1;
    if (expOk && d.startVal > 0) {
      onChange(clampRound(d.startVal * Math.exp((d.acc / 300) * logSpan * fine)));
    } else {
      onChange(clampRound(d.startVal + d.acc * perPx * fine));
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
    const next = clampRound(value + (e.deltaY < 0 ? 1 : -1) * effStep);
    onChange(next);
    onCommit?.(next);
  };

  const commit = () => {
    const parsed = evaluate(text);
    if (parsed != null) {
      const v = clampRound(parsed);
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
        className="h-[22px] w-full border border-accent bg-surface-raised px-1.5 font-mono text-sm text-fg outline-none"
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
        else if (e.key === "ArrowUp") { e.preventDefault(); nudge(1, e.shiftKey); }
        else if (e.key === "ArrowDown") { e.preventDefault(); nudge(-1, e.shiftKey); }
      }}
      title="Drag to scrub · click or Enter to type · up/down to step · Shift = fine"
      className={`relative flex h-[22px] w-full cursor-ew-resize select-none items-center gap-1 overflow-hidden border border-border bg-surface-raised px-1.5 font-mono text-sm text-fg outline-none hover:border-accent focus-visible:border-accent focus-visible:outline-none ${
        readOnly ? "opacity-60" : ""
      }`}
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
    </div>
  );
}
