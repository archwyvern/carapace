import type { CSSProperties, ReactNode } from "react";
import { MenuBar } from "./MenuBar";
import { WindowControls } from "./WindowControls";
import type { MenuModel } from "../menu/model";

export interface TopBarProps {
  logo?: ReactNode;
  menu?: MenuModel;
  title?: string;
  /** Flex-1 middle slot (e.g. a breadcrumb trail). Takes the place of the spacer. */
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
    <header style={drag} className="flex h-9 select-none items-center gap-2 border-b border-border bg-surface px-2 text-xs text-fg-mid">
      {logo && <div className="flex shrink-0 items-center">{logo}</div>}
      {menu ? (
        <div style={noDrag} className="flex items-center">
          <MenuBar menu={menu} />
        </div>
      ) : title ? (
        <span className="truncate">{title}</span>
      ) : null}
      {center ? (
        <div style={noDrag} className="flex min-w-0 flex-1 items-center">
          {center}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {actions && (
        <div style={noDrag} className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
      {showWindowControls && (
        <div style={noDrag} className="flex shrink-0 items-center">
          <WindowControls />
        </div>
      )}
    </header>
  );
}
