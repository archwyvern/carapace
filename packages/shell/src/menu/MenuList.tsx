import { useState } from "react";
import { Menu } from "./Menu";
import type { MenuItem } from "./model";
import type { MenuSize } from "./MenuRow";

/**
 * Legacy/embedded menu surface: an always-open Menu anchored to a wrapper element at its
 * render location. Retained for MenuBar dropdowns and existing callers; new code should
 * prefer ContextMenu / ContextMenuTrigger or Menu with an explicit anchor.
 */
export function MenuList({
  items, onClose, size, ariaLabel,
}: {
  items: MenuItem[];
  onClose: () => void;
  size?: MenuSize;
  ariaLabel?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <span ref={setAnchor} className="sr-only" aria-hidden />
      {anchor && (
        <Menu
          items={items}
          open
          onOpenChange={(o) => {
            if (!o) onClose();
          }}
          anchor={anchor}
          size={size}
          ariaLabel={ariaLabel}
        />
      )}
    </>
  );
}
