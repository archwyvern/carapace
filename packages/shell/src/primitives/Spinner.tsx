import { cx } from "../cx";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZE: Record<SpinnerSize, string> = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

/** Indeterminate loading ring. Inherits its colour from `currentColor` (gold by default). */
export function Spinner({ size = "md", className }: { size?: SpinnerSize; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cx(
        "inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em] text-accent",
        SIZE[size],
        className,
      )}
    />
  );
}
