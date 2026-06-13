import { useRef } from "react";

export interface SashProps {
  /** "vertical" = a vertical bar dragged left/right; "horizontal" = a bar dragged up/down. */
  orientation: "vertical" | "horizontal";
  /** Pixels moved along the drag axis since the last event. */
  onDrag: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/** A draggable divider. Tracks clientX/Y deltas; the parent decides what to resize. */
export function Sash({ orientation, onDrag, onDragStart, onDragEnd }: SashProps) {
  const vertical = orientation === "vertical";
  const dragging = useRef(false);
  const last = useRef(0);

  const axis = (e: React.PointerEvent) => (vertical ? e.clientX : e.clientY);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragging.current = true;
    last.current = axis(e);
    onDragStart?.();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const p = axis(e);
    onDrag(p - last.current);
    last.current = p;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    onDragEnd?.();
  };

  return (
    <div
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={
        vertical
          ? "w-1 shrink-0 cursor-col-resize bg-border hover:bg-accent"
          : "h-1 shrink-0 cursor-row-resize bg-border hover:bg-accent"
      }
    />
  );
}
