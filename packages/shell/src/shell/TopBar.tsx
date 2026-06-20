import type { ReactNode } from "react";
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
}

export function TopBar({ logo, menu, title, center, actions, showWindowControls = true }: TopBarProps) {
  return (
    <header className="flex h-9 select-none items-center gap-2 border-b border-border bg-surface px-2 text-sm text-fg-mid">
      {logo && <div className="flex shrink-0 items-center">{logo}</div>}
      {menu ? <MenuBar menu={menu} /> : title ? <span className="truncate">{title}</span> : null}
      {center ? <div className="flex min-w-0 flex-1 items-center">{center}</div> : <div className="flex-1" />}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {showWindowControls && <WindowControls />}
    </header>
  );
}
