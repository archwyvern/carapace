import { useEffect, useState } from "react";

/** "just now" / "12s ago" / "3m ago" / "2h ago" / "5d ago". Pure — feed it both times. */
export function timeAgo(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Refresh cadence scaled to the age: second-precision needs ~1s ticks, minute
// precision only needs one per ~15s, older stamps barely change.
function refreshDelay(ageMs: number): number {
  if (ageMs < 60_000) return 1_000;
  if (ageMs < 3_600_000) return 15_000;
  return 60_000;
}

/**
 * Self-updating relative timestamp ("12s ago"). Presentational: a plain <span>
 * carrying the exact time as its title; styling comes from the caller.
 */
export function RelativeTime({ at, className }: { at: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      timer = setTimeout(tick, refreshDelay(Date.now() - at));
    };
    timer = setTimeout(tick, refreshDelay(Date.now() - at));
    return () => clearTimeout(timer);
  }, [at]);
  return (
    <span className={className} title={new Date(at).toLocaleString()}>
      {timeAgo(at, now)}
    </span>
  );
}
