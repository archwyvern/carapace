import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import type { MenuModel } from "../menu/model";

export interface WorkbenchProps {
  logo?: ReactNode;
  menu?: MenuModel;
  title?: string;
  /** Flex-1 middle slot in the top bar (e.g. a breadcrumb trail). */
  center?: ReactNode;
  /** Right-aligned top-bar content before the window controls (e.g. account actions). */
  actions?: ReactNode;
  showWindowControls?: boolean;
  /** Make the top bar a draggable window region (frameless Electron). Interactive slots
   *  (menu / center / actions / window controls) stay clickable. */
  draggable?: boolean;
  /** Optional left icon strip. Omit → no activity bar, centre widens. */
  activityBar?: ReactNode;
  /** Optional bottom strip. Omit → no status bar, centre gets the height. */
  statusBar?: ReactNode;
  /** The centre — entirely the app's. */
  children: ReactNode;
}

/**
 * The composable shell frame. Owns the frame (top bar + optional activity/status
 * bars) and leaves the whole centre to the app. Omitted slots don't render.
 */
export function Workbench({
  logo,
  menu,
  title,
  center,
  actions,
  showWindowControls,
  draggable,
  activityBar,
  statusBar,
  children,
}: WorkbenchProps) {
  return (
    <div className="flex h-screen flex-col bg-surface text-fg">
      <TopBar logo={logo} menu={menu} title={title} center={center} actions={actions} showWindowControls={showWindowControls} draggable={draggable} />
      <div className="flex min-h-0 flex-1">
        {activityBar}
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      {statusBar}
    </div>
  );
}
