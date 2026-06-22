import { flip, offset, shift, size } from "@floating-ui/react";
import type { Middleware } from "@floating-ui/react";

export type MenuAnchor = { x: number; y: number } | HTMLElement | null;

/** A floating-ui virtual reference anchored at a viewport point (cursor). */
export function pointReference(point: { x: number; y: number }) {
  return {
    getBoundingClientRect() {
      return {
        x: point.x, y: point.y,
        top: point.y, left: point.x, right: point.x, bottom: point.y,
        width: 0, height: 0,
      };
    },
  };
}

/**
 * Standard menu middleware: small offset, flip to stay on-screen, shift with viewport
 * padding, and `size` to clamp height to the viewport (exposed as the `--menu-max-h`
 * CSS var so the surface scrolls internally). Submenus use a larger offset.
 */
export function menuMiddleware(opts: { submenu?: boolean } = {}): Middleware[] {
  return [
    offset(opts.submenu ? { mainAxis: 0, alignmentAxis: -4 } : 4),
    flip({ padding: 8 }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ availableHeight, elements }) {
        elements.floating.style.setProperty("--menu-max-h", `${Math.max(120, availableHeight)}px`);
      },
    }),
  ];
}
