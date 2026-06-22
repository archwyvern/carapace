import { useCallback, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { Menu } from "./Menu";
import type { MenuAction, MenuItem } from "./model";
import type { MenuSize } from "./MenuRow";

export interface ContextMenuProps {
  items: MenuItem[];
  /** A cursor point (from a right-click) or an element to anchor to. */
  anchor: { x: number; y: number } | HTMLElement;
  onClose: () => void;
  size?: MenuSize;
  filterable?: boolean;
  ariaLabel?: string;
  onAction?: (item: MenuAction) => void;
}

/** A context menu opened at a point or element; closes via Escape / outside-press. */
export function ContextMenu({ items, anchor, onClose, size, filterable, ariaLabel, onAction }: ContextMenuProps) {
  return (
    <Menu
      items={items}
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      anchor={anchor}
      size={size}
      filterable={filterable}
      ariaLabel={ariaLabel ?? "Context menu"}
      onAction={onAction}
    />
  );
}

export interface ContextMenuState {
  x: number;
  y: number;
}

/** Open/close state for a context menu, driven by an `onContextMenu` handler or a point. */
export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const open = useCallback((e: ReactMouseEvent | ContextMenuState) => {
    if ("clientX" in e) {
      e.preventDefault();
      setState({ x: e.clientX, y: e.clientY });
    } else {
      setState({ x: e.x, y: e.y });
    }
  }, []);
  const close = useCallback(() => setState(null), []);
  return { state, open, close };
}

export interface ContextMenuTriggerProps {
  items: MenuItem[] | ((e: MouseEvent) => MenuItem[]);
  children: ReactNode;
  size?: MenuSize;
  filterable?: boolean;
  onAction?: (item: MenuAction) => void;
}

/** Wraps a region; right-click opens a context menu with (optionally per-target) items. */
export function ContextMenuTrigger({ items, children, size, filterable, onAction }: ContextMenuTriggerProps) {
  const ctx = useContextMenu();
  const [resolved, setResolved] = useState<MenuItem[]>([]);
  return (
    <>
      <div
        onContextMenu={(e) => {
          const list = typeof items === "function" ? items(e.nativeEvent) : items;
          setResolved(list);
          ctx.open(e);
        }}
      >
        {children}
      </div>
      {ctx.state && (
        <ContextMenu
          items={resolved}
          anchor={ctx.state}
          onClose={ctx.close}
          size={size}
          filterable={filterable}
          onAction={onAction}
        />
      )}
    </>
  );
}
