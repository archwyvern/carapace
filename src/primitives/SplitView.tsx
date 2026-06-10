import { Children } from "react";
import type { ReactNode } from "react";
import { Sash } from "./Sash";

export interface SplitViewProps {
  orientation: "horizontal" | "vertical";
  /** Which pane holds the fixed `size` (the other flexes). Default "start". */
  primary?: "start" | "end";
  /** Controlled pixel size of the fixed pane. */
  size: number;
  onResize: (size: number) => void;
  min?: number;
  max?: number;
  /** Exactly two panes. */
  children: ReactNode;
}

/** Apply a sash drag delta to the fixed pane size, accounting for which side is fixed. */
export function resizeSplit(
  size: number,
  delta: number,
  opts: { primary: "start" | "end"; min: number; max: number },
): number {
  const d = opts.primary === "start" ? delta : -delta;
  return Math.max(opts.min, Math.min(opts.max, size + d));
}

/** A two-pane resizable split. Nest to build arbitrary layouts. */
export function SplitView({
  orientation,
  primary = "start",
  size,
  onResize,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  children,
}: SplitViewProps) {
  const horizontal = orientation === "horizontal";
  const panes = Children.toArray(children);
  const first = panes[0] ?? null;
  const second = panes[1] ?? null;

  const handleDrag = (delta: number) => onResize(resizeSplit(size, delta, { primary, min, max }));

  const fixed = (node: ReactNode) => (
    <div style={{ flex: `0 0 ${size}px` }} className="min-h-0 min-w-0 overflow-hidden">
      {node}
    </div>
  );
  const flex = (node: ReactNode) => (
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{node}</div>
  );
  const sash = <Sash orientation={horizontal ? "vertical" : "horizontal"} onDrag={handleDrag} />;

  return (
    <div className={`flex h-full w-full min-h-0 min-w-0 ${horizontal ? "flex-row" : "flex-col"}`}>
      {primary === "start" ? (
        <>
          {fixed(first)}
          {sash}
          {flex(second)}
        </>
      ) : (
        <>
          {flex(first)}
          {sash}
          {fixed(second)}
        </>
      )}
    </div>
  );
}
