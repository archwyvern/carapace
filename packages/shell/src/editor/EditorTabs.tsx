import type { ReactNode } from "react";
import { CloseIcon } from "../icons";

export interface EditorTab {
  id: string;
  title: string;
  dirty?: boolean;
  icon?: ReactNode;
}

export interface EditorTabsProps {
  tabs: EditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
}

/** A data-driven editor tab strip. The active tab's content is the app's to render. */
export function EditorTabs({ tabs, activeId, onSelect, onClose }: EditorTabsProps) {
  return (
    <div role="tablist" className="flex h-9 items-stretch overflow-x-auto border-b border-border bg-surface">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onClose?.(tab.id);
            }}
            className={`group flex cursor-pointer items-center gap-1.5 border-r border-border px-3 text-xs whitespace-nowrap ${
              active ? "bg-surface-raised text-fg" : "text-fg-mid hover:text-fg"
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="truncate">{tab.title}</span>
            {tab.dirty && (
              <span aria-hidden className="text-fg">
                ●
              </span>
            )}
            {onClose && (
              <button
                type="button"
                aria-label={`Close ${tab.title}`}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="ml-1 flex items-center rounded px-1 text-fg-mid opacity-0 hover:bg-border hover:text-fg group-hover:opacity-100"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
