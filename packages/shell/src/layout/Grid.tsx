import type { CSSProperties, ReactNode } from "react";
import { cx } from "../cx";

export interface GridProps {
  children: ReactNode;
  /** Minimum column width in px before wrapping to a new row. Default 240. */
  minColWidth?: number;
  /** Gap between cells in px. Default 12. */
  gap?: number;
  /** Use `auto-fit` (collapse empty tracks, cells stretch) instead of `auto-fill`. */
  fit?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Responsive auto-fill card grid. `repeat(auto-fill, minmax(minColWidth, 1fr))` —
 * the copy-pasted grid shape behind asset-browser and collection grids and
 * foley's sound grid, parameterised once.
 */
export function Grid({ children, minColWidth = 240, gap = 12, fit = false, className, style }: GridProps) {
  return (
    <div
      className={cx("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${fit ? "auto-fit" : "auto-fill"}, minmax(${minColWidth}px, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
