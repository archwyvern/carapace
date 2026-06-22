import { useRef } from "react";

export interface SashProps {
  /** "vertical" = a vertical line dragged left/right; "horizontal" = a bar dragged up/down. */
  orientation: "vertical" | "horizontal";
  /** Pixels moved along the drag axis since the last event. */
  onDrag: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

/**
 * A 1px visual divider with a wide (7px) invisible grab area overlapping its neighbours, so it's
 * easy to grab without a chunky bar. Tracks pointer deltas along its axis; the parent owns
 * clamping/persistence. The line lightens to the accent on hover.
 */
export function Sash({ orientation, onDrag, onDragStart, onDragEnd }: SashProps) {
  const last = useRef(0);
  // Only a drag that STARTED on this sash resizes. Gating onPointerMove on `e.buttons` alone is not
  // enough: with no pointer capture, a press that began elsewhere (and never captured the pointer)
  // delivers move events to whatever the cursor passes over — so dragging the button across a sash
  // would wrongly grab it. The pointerdown handler captures the pointer and arms this flag; moves are
  // ignored until then.
  const dragging = useRef(false);
  const horizontal = orientation === "horizontal";
  return (
    <div className={`group relative shrink-0 ${horizontal ? "h-px" : "w-px"}`}>
      <div
        role="separator"
        aria-orientation={horizontal ? "horizontal" : "vertical"}
        className={`absolute z-20 ${
          horizontal ? "inset-x-0 -top-[3px] h-[7px] cursor-row-resize" : "inset-y-0 -left-[3px] w-[7px] cursor-col-resize"
        }`}
        onPointerDown={(e) => {
          if (e.button) return; // primary button only (0); ignore middle/right
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          dragging.current = true;
          last.current = horizontal ? e.clientY : e.clientX;
          onDragStart?.();
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const c = horizontal ? e.clientY : e.clientX;
          onDrag(c - last.current);
          last.current = c;
        }}
        onPointerUp={() => {
          if (!dragging.current) return;
          dragging.current = false;
          onDragEnd?.();
        }}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
      />
      <div
        className={`pointer-events-none absolute bg-border transition-colors group-hover:bg-accent ${
          horizontal ? "inset-x-0 top-0 h-px" : "inset-y-0 left-0 w-px"
        }`}
      />
    </div>
  );
}
