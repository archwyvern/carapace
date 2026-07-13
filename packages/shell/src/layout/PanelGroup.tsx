import {
  Children,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * N-pane resizable split with collapsible panes and caller-owned size/collapse persistence —
 * the richer sibling of the 2-pane {@link SplitView}. Declare panes as {@link SplitPane}
 * children; a pane with no `defaultSize` is "flex" and absorbs remaining space (and window
 * resizes). Drag the dividers to resize; double-click a divider next to a `collapsible` pane
 * to collapse/expand it.
 */

/** Divider visual width (px). The grab area extends past it for an easier hit target. */
export const SASH_SIZE = 1;
const GRAB_OVERLAP = 3;

function Divider({
  direction,
  onDrag,
  onDoubleClick,
}: {
  direction: "horizontal" | "vertical";
  onDrag: (delta: number) => void;
  onDoubleClick?: () => void;
}) {
  const dragging = useRef(false);
  const last = useRef(0);
  const isHorizontal = direction === "horizontal";

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      last.current = isHorizontal ? e.clientX : e.clientY;
      const move = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const pos = isHorizontal ? ev.clientX : ev.clientY;
        const delta = pos - last.current;
        last.current = pos;
        if (delta !== 0) onDrag(delta);
      };
      const up = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [isHorizontal, onDrag],
  );

  return (
    <div className="relative shrink-0" style={isHorizontal ? { width: SASH_SIZE } : { height: SASH_SIZE }}>
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        className="group absolute z-20"
        style={{
          cursor: isHorizontal ? "col-resize" : "row-resize",
          ...(isHorizontal
            ? { top: 0, bottom: 0, left: -GRAB_OVERLAP, right: -GRAB_OVERLAP }
            : { left: 0, right: 0, top: -GRAB_OVERLAP, bottom: -GRAB_OVERLAP }),
        }}
      >
        <div
          className="absolute bg-border transition-colors group-hover:bg-accent"
          style={
            isHorizontal
              ? { top: 0, bottom: 0, left: GRAB_OVERLAP, width: SASH_SIZE }
              : { left: 0, right: 0, top: GRAB_OVERLAP, height: SASH_SIZE }
          }
        />
      </div>
    </div>
  );
}

export interface SplitPaneProps {
  id: string;
  minSize?: number;
  maxSize?: number;
  /** Fixed initial size in px. Omit to make the pane "flex" (fills remaining space). */
  defaultSize?: number;
  collapsible?: boolean;
  children: ReactNode;
}

/** Declarative child of {@link PanelGroup}. Renders nothing on its own — PanelGroup reads its props. */
export function SplitPane(_props: SplitPaneProps) {
  return null;
}

interface PaneConfig {
  id: string;
  minSize: number;
  maxSize: number;
  defaultSize: number | null;
  collapsible: boolean;
  children: ReactNode;
}

export interface PanelGroupProps {
  direction: "horizontal" | "vertical";
  /** Optional caller-side identifier (e.g. for keying persisted sizes). Not used for layout. */
  id?: string;
  children: ReactNode;
  savedSizes?: Record<string, number>;
  onSizesChange?: (sizes: Record<string, number>) => void;
  savedCollapsed?: Record<string, boolean>;
  onCollapsedChange?: (collapsed: Record<string, boolean>) => void;
}

function parsePanes(children: ReactNode): PaneConfig[] {
  const panes: PaneConfig[] = [];
  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !("type" in child)) return;
    const el = child as ReactElement<SplitPaneProps>;
    if (el.type !== SplitPane) return;
    panes.push({
      id: el.props.id,
      minSize: el.props.minSize ?? 0,
      maxSize: el.props.maxSize ?? Infinity,
      defaultSize: el.props.defaultSize ?? null,
      collapsible: el.props.collapsible ?? false,
      children: el.props.children,
    });
  });
  return panes;
}

export function PanelGroup({
  direction,
  children,
  savedSizes,
  savedCollapsed,
  onSizesChange,
  onCollapsedChange,
}: PanelGroupProps) {
  const panes = parsePanes(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(savedCollapsed ?? {});
  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;
  const isHorizontal = direction === "horizontal";

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || panes.length === 0) return;
    const totalSpace = isHorizontal ? container.clientWidth : container.clientHeight;
    const available = totalSpace - (panes.length - 1) * SASH_SIZE;

    const initial: number[] = panes.map((p) => {
      if (collapsed[p.id]) return 0;
      if (p.defaultSize !== null) return savedSizes?.[p.id] ?? p.defaultSize;
      return 0; // flex — fills the remainder below
    });
    const allocated = initial.reduce((a, b) => a + b, 0);
    const flexCount = initial.filter((s) => s === 0).length;
    if (flexCount > 0) {
      const perFlex = Math.max(0, (available - allocated) / flexCount);
      for (let i = 0; i < initial.length; i++) if (initial[i] === 0) initial[i] = perFlex;
    } else if (allocated !== available) {
      const scale = available / allocated;
      for (let i = 0; i < initial.length; i++) initial[i] = Math.round((initial[i] ?? 0) * scale);
    }
    setSizes(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panes.length, direction]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const prevTotal = sizesRef.current.reduce((a, b) => a + b, 0);
      const newTotal =
        (isHorizontal ? container.clientWidth : container.clientHeight) - (panes.length - 1) * SASH_SIZE;
      if (prevTotal <= 0 || newTotal <= 0 || Math.abs(newTotal - prevTotal) < 2) return;
      const delta = newTotal - prevTotal;
      setSizes((prev) => {
        const next = [...prev];
        const flexIndices = panes
          .map((p, i) => (p.defaultSize === null && !collapsed[p.id] ? i : -1))
          .filter((i) => i >= 0);
        if (flexIndices.length > 0) {
          const perFlex = delta / flexIndices.length;
          for (const fi of flexIndices) next[fi] = Math.max(panes[fi]!.minSize, Math.round((prev[fi] ?? 0) + perFlex));
        } else {
          const scale = newTotal / prevTotal;
          for (let i = 0; i < next.length; i++) {
            if (collapsed[panes[i]!.id]) continue;
            next[i] = Math.max(panes[i]?.minSize ?? 0, Math.round((prev[i] ?? 0) * scale));
          }
        }
        return next;
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, panes.length]);

  const emitSizes = useCallback(
    (newSizes: number[]) => {
      if (!onSizesChange) return;
      const map: Record<string, number> = {};
      panes.forEach((p, i) => { map[p.id] = newSizes[i] ?? 0; });
      onSizesChange(map);
    },
    [panes, onSizesChange],
  );

  const handleDrag = useCallback(
    (sashIndex: number, delta: number) => {
      // Compute OUTSIDE the state updater: React replays updaters during render, and emitting
      // (a parent setState) from inside one is an update-during-render violation.
      const prev = sizesRef.current;
      const next = [...prev];
      const left = panes[sashIndex]!;
      const right = panes[sashIndex + 1]!;
      let leftNew = (next[sashIndex] ?? 0) + delta;
      let rightNew = (next[sashIndex + 1] ?? 0) - delta;
      if (leftNew < left.minSize) { rightNew += leftNew - left.minSize; leftNew = left.minSize; }
      if (rightNew < right.minSize) { leftNew += rightNew - right.minSize; rightNew = right.minSize; }
      if (leftNew > left.maxSize) { rightNew += leftNew - left.maxSize; leftNew = left.maxSize; }
      if (rightNew > right.maxSize) { leftNew += rightNew - right.maxSize; rightNew = right.maxSize; }
      next[sashIndex] = Math.max(left.minSize, leftNew);
      next[sashIndex + 1] = Math.max(right.minSize, rightNew);
      setSizes(next);
      emitSizes(next);
    },
    [panes, emitSizes],
  );

  const handleDoubleClick = useCallback(
    (sashIndex: number) => {
      const left = panes[sashIndex]!;
      const right = panes[sashIndex + 1]!;
      const target = right.collapsible ? right : left.collapsible ? left : null;
      if (!target) return;
      // Same rule as handleDrag: compute outside the updaters, emit as plain calls.
      const nextCollapsed = { ...collapsed, [target.id]: !collapsed[target.id] };
      const next = [...sizesRef.current];
      const idx = panes.indexOf(target);
      const donor = idx === 0 ? 1 : idx - 1;
      if (collapsed[target.id]) {
        const restore = target.defaultSize ?? target.minSize;
        next[donor] = (next[donor] ?? 0) - restore;
        next[idx] = restore;
      } else {
        next[donor] = (next[donor] ?? 0) + (next[idx] ?? 0);
        next[idx] = 0;
      }
      setCollapsed(nextCollapsed);
      setSizes(next);
      onCollapsedChange?.(nextCollapsed);
      emitSizes(next);
    },
    [panes, collapsed, emitSizes, onCollapsedChange],
  );

  return (
    <div ref={containerRef} className={`flex flex-1 overflow-hidden ${isHorizontal ? "flex-row" : "flex-col"}`}>
      {panes.map((pane, i) => {
        const size = sizes[i] ?? 0;
        const isCollapsed = collapsed[pane.id] ?? false;
        const sizeStyle = isHorizontal
          ? { width: size, minWidth: isCollapsed ? 0 : pane.minSize }
          : { height: size, minHeight: isCollapsed ? 0 : pane.minSize };
        return (
          <Fragment key={pane.id}>
            {i > 0 && (
              <Divider
                direction={direction}
                onDrag={(delta) => handleDrag(i - 1, delta)}
                onDoubleClick={
                  panes[i - 1]!.collapsible || pane.collapsible ? () => handleDoubleClick(i - 1) : undefined
                }
              />
            )}
            {isCollapsed ? (
              <div
                className="flex cursor-pointer items-center justify-center border-r border-border bg-surface transition hover:bg-surface-raised"
                style={{ width: 24, minWidth: 24, flexShrink: 0 }}
                onClick={() => handleDoubleClick(i === 0 ? 0 : i - 1)}
                title="Expand panel"
              >
                <span className="text-base text-fg-mid">{isHorizontal ? "►" : "▼"}</span>
              </div>
            ) : (
              <div
                className={`${isHorizontal ? "h-full" : "w-full"} overflow-hidden ${
                  pane.defaultSize !== null ? "shrink-0" : `${isHorizontal ? "min-w-0" : "min-h-0"} shrink`
                }`}
                style={sizeStyle}
              >
                {pane.children}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
