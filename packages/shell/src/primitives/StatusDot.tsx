import { cx } from "../cx";
import type { BadgeTone } from "./Badge";

const DOT: Record<BadgeTone, string> = {
  accent: "bg-accent",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  neutral: "bg-fg-mid",
};

export interface StatusDotProps {
  tone?: BadgeTone;
  /** Pulse — e.g. an in-progress / building state. */
  pulse?: boolean;
  /** Diameter in px. Default 8. */
  size?: number;
  className?: string;
}

/** A small coloured status indicator dot (shares Badge's tone vocabulary). */
export function StatusDot({ tone = "neutral", pulse = false, size = 8, className }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={`${tone} status`}
      className={cx("inline-block shrink-0 rounded-full", DOT[tone], pulse && "animate-pulse", className)}
      style={{ width: size, height: size }}
    />
  );
}
