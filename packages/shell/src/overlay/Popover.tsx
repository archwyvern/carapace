import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cx } from "../cx";

export type PopoverPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger element to anchor against. */
  anchorRef: RefObject<HTMLElement | null>;
  placement?: PopoverPlacement;
  /** Make the popover at least as wide as the anchor (select-style menus). */
  matchWidth?: boolean;
  /** Gap between anchor and popover, px. Default 4. */
  offset?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Anchored, viewport-aware popover. Portals to <body>, positions against `anchorRef`,
 * flips top/bottom when the preferred side is cramped, clamps horizontally, and caps its
 * height to the available space (scrolls past that). Dismisses on outside pointer + Escape.
 * The composition primitive behind Select, dropdown menus, and autocompletes.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  placement = "bottom-start",
  matchWidth = false,
  offset = 4,
  children,
  className,
}: PopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", top: 0, left: 0, visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor || !pop) return;
      const a = anchor.getBoundingClientRect();
      const pw = pop.offsetWidth;
      const ph = pop.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const below = vh - a.bottom - offset;
      const above = a.top - offset;
      const wantTop = placement.startsWith("top");
      const useTop = wantTop ? above >= ph || above >= below : below < ph && above > below;
      const top = useTop ? Math.max(offset, a.top - offset - ph) : a.bottom + offset;
      const end = placement.endsWith("end");
      let left = end ? a.right - pw : a.left;
      left = Math.max(offset, Math.min(left, vw - pw - offset));
      setStyle({
        position: "fixed",
        top,
        left,
        maxHeight: Math.max(96, (useTop ? above : below)),
        minWidth: matchWidth ? a.width : undefined,
        visibility: "visible",
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, placement, matchWidth, offset, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      style={style}
      className={cx(
        "z-[120] overflow-auto rounded-control border border-border bg-surface-raised py-1 shadow-lg",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
