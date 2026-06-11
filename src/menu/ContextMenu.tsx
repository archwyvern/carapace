import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { MenuList } from "./MenuList";
import type { MenuItem } from "./model";

export interface ContextMenuProps {
  items: MenuItem[];
  /** Cursor position (typically the right-click clientX/clientY). */
  x: number;
  y: number;
  onClose: () => void;
}

/**
 * A context menu: the shared MenuList opened at the cursor, in a portal, with
 * viewport edge-flip, click-outside, and Escape. Reuses the menu data model, so
 * items can be actions, separators, submenus, or command-refs.
 */
export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Keep the menu on-screen (runs before paint, so no visible jump).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (x + rect.width > window.innerWidth) left = Math.max(4, window.innerWidth - rect.width - 4);
    if (y + rect.height > window.innerHeight) top = Math.max(4, window.innerHeight - rect.height - 4);
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuList items={items} onClose={onClose} />
    </div>,
    document.body,
  );
}

export interface ContextMenuState {
  x: number;
  y: number;
}

/** Open/close state for a context menu, driven by an `onContextMenu` handler. */
export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const open = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setState({ x: e.clientX, y: e.clientY });
  }, []);
  const close = useCallback(() => setState(null), []);
  return { state, open, close };
}
