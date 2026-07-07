import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { BackIcon, HistoryIcon } from "../icons";
import { IconButton } from "../primitives/IconButton";
import { SaveStatus, type SaveStatusProps } from "../primitives/SaveStatus";
import { LockBanner } from "./LockBanner";
import { PresenceStack, type PresenceUser } from "./PresenceStack";

export interface ResourceShellProps {
  onBack: () => void;
  /** Accessible name for the back button. Default "Back". */
  backLabel?: string;
  /** Text span or an editable input — consumer's choice. */
  title: ReactNode;
  /** Small label after the title (type tag, badge). */
  meta?: ReactNode;
  /** Consumer toolbar cluster, rendered before the built-ins. */
  actions?: ReactNode;
  /** Renders PresenceStack when non-empty. */
  presence?: PresenceUser[];
  /** Renders SaveStatus when provided. */
  saveStatus?: Pick<SaveStatusProps, "status" | "title">;
  /** Renders LockBanner under the toolbar. */
  lock?: { holder: string } | null;
  /** Full-width notices (error strips) under the toolbar/lock. */
  banner?: ReactNode;
  /** When provided the shell renders a History toggle and owns the right aside. */
  historyPanel?: ReactNode;
  /** The domain body — mounted in the standard flex row, untouched. */
  children: ReactNode;
  className?: string;
}

/** Standard resource-detail chrome (collab spec §7): toolbar (back / title /
 *  actions / presence / save state), lock banner, notices, and a toggleable
 *  shared-history aside around a domain-specific body. Presentational — the
 *  consumer owns all data and state except the history-panel visibility. */
export function ResourceShell({
  onBack,
  backLabel = "Back",
  title,
  meta,
  actions,
  presence,
  saveStatus,
  lock,
  banner,
  historyPanel,
  children,
  className,
}: ResourceShellProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <div className={cx("flex flex-1 flex-col overflow-hidden", className)}>
      <div className="flex h-control shrink-0 items-center justify-between border-b border-border bg-surface2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton label={backLabel} icon={<BackIcon />} onClick={onBack} />
          {title}
          {meta}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {historyPanel !== undefined && (
            <IconButton
              label="History"
              icon={<HistoryIcon />}
              active={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
            />
          )}
          {presence && presence.length > 0 && <PresenceStack users={presence} />}
          {saveStatus && <SaveStatus status={saveStatus.status} title={saveStatus.title} />}
        </div>
      </div>
      {lock && <LockBanner holder={lock.holder} />}
      {banner}
      <div className="flex flex-1 overflow-hidden">
        {children}
        {historyOpen && historyPanel !== undefined && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">{historyPanel}</aside>
        )}
      </div>
    </div>
  );
}
