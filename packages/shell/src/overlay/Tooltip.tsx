import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../cx";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  /** Hover/focus dwell before showing, ms. Default 400. */
  delay?: number;
  className?: string;
}

/**
 * Hover/focus tooltip. Wraps a single trigger (rendered inline-flex) and portals a
 * positioned bubble to <body>. Pointer-transparent so it never eats clicks.
 */
export function Tooltip({ content, children, placement = "top", delay = 400, className }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const id = useId();

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx2 = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const pad = 8;
      setCoords(
        placement === "top"
          ? { x: cx2, y: r.top - pad }
          : placement === "bottom"
            ? { x: cx2, y: r.bottom + pad }
            : placement === "left"
              ? { x: r.left - pad, y: cy }
              : { x: r.right + pad, y: cy },
      );
    }, delay);
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCoords(null);
  };

  const transform =
    placement === "top"
      ? "translate(-50%, -100%)"
      : placement === "bottom"
        ? "translate(-50%, 0)"
        : placement === "left"
          ? "translate(-100%, -50%)"
          : "translate(0, -50%)";

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={content ? id : undefined}
        className="inline-flex"
      >
        {children}
      </span>
      {coords &&
        content &&
        createPortal(
          <div
            role="tooltip"
            id={id}
            style={{ position: "fixed", left: coords.x, top: coords.y, transform }}
            className={cx(
              "pointer-events-none z-[120] max-w-[280px] rounded-control border border-border bg-surface-raised px-2 py-1 text-xs text-fg shadow-lg",
              className,
            )}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
