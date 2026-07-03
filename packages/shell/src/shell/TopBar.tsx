import type { CSSProperties, ReactNode } from "react";
import { MenuBar } from "./MenuBar";
import { WindowControls } from "./WindowControls";
import type { MenuModel } from "../menu/model";

export interface TopBarProps {
  logo?: ReactNode;
  menu?: MenuModel;
  title?: string;
  /** Slot pinned to the true horizontal centre of the bar (e.g. a command/search pill),
   *  overlaid independent of the left/right cluster widths so it stays window-centred.
   *  Only the slot's own content opts out of dragging — the bar around it stays grabbable. */
  center?: ReactNode;
  /** Right-aligned content before the window controls (e.g. user/account actions). */
  actions?: ReactNode;
  showWindowControls?: boolean;
  /** Make the bar a draggable window region (frameless Electron). Interactive slots
   *  (menu / center / actions / window controls) opt out so they stay clickable. */
  draggable?: boolean;
}

export function TopBar({ logo, menu, title, center, actions, showWindowControls = true, draggable = false }: TopBarProps) {
  const drag = draggable ? ({ WebkitAppRegion: "drag" } as CSSProperties) : undefined;
  const noDrag = draggable ? ({ WebkitAppRegion: "no-drag" } as CSSProperties) : undefined;
  return (
    <header style={drag} className="relative flex h-9 select-none items-center gap-2 border-b border-border bg-surface px-2 text-base text-fg-mid">
      {logo && <div className="flex shrink-0 items-center">{logo}</div>}
      {menu ? (
        <div style={noDrag} className="flex items-center">
          <MenuBar menu={menu} />
        </div>
      ) : title ? (
        <span className="truncate">{title}</span>
      ) : null}
      {/* Draggable spacer: fills the gap between the left and right clusters so the bar
          is grabbable everywhere except the interactive slots. */}
      <div className="min-w-0 flex-1" />
      {actions && (
        <div style={noDrag} className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
      {showWindowControls && (
        // -mr-2 bleeds through the bar padding so the close button reaches the window edge
        <div style={noDrag} className="-mr-2 flex shrink-0 items-center">
          <WindowControls />
        </div>
      )}
      {/* Centre slot overlays the bar, pinned to the window's true centre. Its wrapper
          shrink-wraps the content, so no-drag covers only the pill — not the whole width. */}
      {center && (
        <div style={noDrag} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {center}
        </div>
      )}
    </header>
  );
}
