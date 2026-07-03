import { useState } from "react";
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
  /** Enables drag-reorder. `toIndex` is the insertion slot in the CURRENT array (0..tabs.length);
   *  the host owns the array, so it applies the move (and any persistence). */
  onReorder?: (id: string, toIndex: number) => void;
}

/** A data-driven editor tab strip. The active tab's content is the app's to render.
 *  With `onReorder`, tabs are draggable; an accent bar marks the insertion slot. */
export function EditorTabs({ tabs, activeId, onSelect, onClose, onReorder }: EditorTabsProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null); // insertion index while dragging

  const slotFor = (e: React.DragEvent, index: number): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? index : index + 1;
  };
  const endDrag = (): void => {
    setDragId(null);
    setSlot(null);
  };

  return (
    <div role="tablist" className="flex h-9 items-stretch overflow-x-auto border-b border-border bg-surface">
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        // insertion indicator: a left edge bar on the tab at the slot (or a right bar on the last)
        const showBefore = dragId !== null && slot === index;
        const showAfter = dragId !== null && index === tabs.length - 1 && slot === tabs.length;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            draggable={!!onReorder}
            onClick={() => onSelect(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onClose?.(tab.id);
            }}
            onDragStart={(e) => {
              if (!onReorder) return;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", tab.id);
              setDragId(tab.id);
            }}
            onDragOver={(e) => {
              if (!onReorder || dragId === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setSlot(slotFor(e, index));
            }}
            onDrop={(e) => {
              if (!onReorder || dragId === null) return;
              e.preventDefault();
              onReorder(dragId, slotFor(e, index));
              endDrag();
            }}
            onDragEnd={endDrag}
            className={`group relative flex cursor-pointer items-center gap-1.5 border-r border-border px-3 text-base whitespace-nowrap ${
              active ? "bg-surface-raised text-fg" : "text-fg-mid hover:text-fg"
            } ${dragId === tab.id ? "opacity-50" : ""}`}
          >
            {showBefore && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-accent" />}
            {showAfter && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-0.5 bg-accent" />}
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
