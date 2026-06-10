import type { HTMLAttributes } from "react";
import { cx } from "../cx";

export type BadgeTone = "accent" | "info" | "success" | "warning" | "error" | "neutral";

const TONES: Record<BadgeTone, string> = {
  accent: "border-accent/40 bg-accent/15 text-accent",
  info: "border-info/40 bg-info/15 text-info",
  success: "border-success/40 bg-success/15 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning",
  error: "border-error/40 bg-error/15 text-error",
  neutral: "border-border bg-surface-raised text-fg-mid",
};

/** Small uppercase status chip. */
export function Badge({
  tone = "accent",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 text-2xs uppercase tracking-wide",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
