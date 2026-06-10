import type { ReactNode } from "react";
import { MenuBar } from "./MenuBar";
import { WindowControls } from "./WindowControls";
import type { MenuModel } from "../menu/model";

export interface TopBarProps {
  logo?: ReactNode;
  menu?: MenuModel;
  title?: string;
  showWindowControls?: boolean;
}

export function TopBar({ logo, menu, title, showWindowControls = true }: TopBarProps) {
  return (
    <header className="flex h-9 select-none items-center gap-2 border-b border-border bg-surface px-2 text-sm text-fg-mid">
      {logo && <div className="flex shrink-0 items-center">{logo}</div>}
      {menu ? <MenuBar menu={menu} /> : title ? <span className="truncate">{title}</span> : null}
      <div className="flex-1" />
      {showWindowControls && <WindowControls />}
    </header>
  );
}
