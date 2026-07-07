import { useState } from "react";
import type { ReactNode } from "react";
import { CloseIcon, PinIcon } from "../icons";
import { ContextMenu, useContextMenu } from "../menu/ContextMenu";
import type { MenuItem } from "../menu/model";

export interface EditorTab {
  id: string;
  title: string;
  dirty?: boolean;
  icon?: ReactNode;
  /** Pinned: renders compact (pin glyph, no title), hides the X, ignores middle-click close.
   *  The host owns tab data + ordering (pinned-first is the host's move on pin). */
  pinned?: boolean;
}

export type TabMenuVerb = "close" | "close-others" | "close-right" | "close-saved" | "close-all" | "pin";

/**
 * The tab ids a close verb acts on, in tab order (VS Code semantics: others/right/saved skip
 * pinned tabs; close-all is an explicit nuke and includes them). Exported so hosts can back
 * their keyboard commands with the exact menu behaviour.
 */
export function tabVerbIds(verb: Exclude<TabMenuVerb, "pin">, tabs: EditorTab[], id: string): string[] {
  const idx = tabs.findIndex((t) => t.id === id);
  switch (verb) {
    case "close":
      return idx >= 0 ? [id] : [];
    case "close-others":
      return tabs.filter((t) => t.id !== id && !t.pinned).map((t) => t.id);
    case "close-right":
      return tabs.filter((t, i) => i > idx && !t.pinned).map((t) => t.id);
    case "close-saved":
      return tabs.filter((t) => !t.dirty && !t.pinned).map((t) => t.id);
    case "close-all":
      return tabs.map((t) => t.id);
  }
}

export interface EditorTabsProps {
  tabs: EditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (id: string) => void;
  /** Enables drag-reorder. `toIndex` is the insertion slot in the CURRENT array (0..tabs.length);
   *  the host owns the array, so it applies the move (and any persistence). */
  onReorder?: (id: string, toIndex: number) => void;
  /** Batch close for the context-menu verbs — ONE call with the resolved id list, in tab order
   *  (the host sequences its own unsaved-changes guards). Single Close falls back to `onClose`. */
  onCloseMany?: (ids: string[]) => void;
  /** Pin/unpin a tab. The menu offers Pin/Unpin only when provided. */
  onPin?: (id: string, pinned: boolean) => void;
  /** Host extension items rendered between the close verbs and Pin (path/reveal verbs etc.). */
  extraMenuItems?: (tab: EditorTab) => MenuItem[];
  /** Display-only chord hint per verb (the host's effective binding). */
  menuShortcut?: (verb: TabMenuVerb) => string | undefined;
}

/** A data-driven editor tab strip. The active tab's content is the app's to render.
 *  With `onReorder`, tabs are draggable; an accent bar marks the insertion slot. Right-click
 *  opens the VS Code-style verb menu when `onCloseMany`/`onClose` is provided. */
export function EditorTabs({ tabs, activeId, onSelect, onClose, onReorder, onCloseMany, onPin, extraMenuItems, menuShortcut }: EditorTabsProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null); // insertion index while dragging
  const menu = useContextMenu();
  const [menuTabId, setMenuTabId] = useState<string | null>(null);

  const slotFor = (e: React.DragEvent, index: number): number => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? index : index + 1;
  };
  const endDrag = (): void => {
    setDragId(null);
    setSlot(null);
  };

  const closeMany = (ids: string[]): void => {
    if (ids.length === 0) return;
    if (onCloseMany) onCloseMany(ids);
    else if (onClose) for (const id of ids) onClose(id);
  };

  const menuItems = (tab: EditorTab): MenuItem[] => {
    const verb = (v: Exclude<TabMenuVerb, "pin">, label: string): MenuItem => {
      const ids = tabVerbIds(v, tabs, tab.id);
      return { label, shortcut: menuShortcut?.(v), enabled: ids.length > 0, run: () => closeMany(ids) };
    };
    const items: MenuItem[] = [
      verb("close", "Close"),
      verb("close-others", "Close Others"),
      verb("close-right", "Close to the Right"),
      verb("close-saved", "Close Saved"),
      verb("close-all", "Close All"),
    ];
    const extras = extraMenuItems?.(tab) ?? [];
    if (extras.length > 0) items.push({ separator: true }, ...extras);
    if (onPin) {
      items.push(
        { separator: true },
        { label: tab.pinned ? "Unpin" : "Pin", shortcut: menuShortcut?.("pin"), run: () => onPin(tab.id, !tab.pinned) },
      );
    }
    return items;
  };

  const canMenu = !!(onCloseMany || onClose);
  const menuTab = menuTabId !== null ? tabs.find((t) => t.id === menuTabId) : undefined;

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
            aria-label={tab.pinned ? tab.title : undefined}
            title={tab.pinned ? tab.title : undefined}
            draggable={!!onReorder}
            onClick={() => onSelect(tab.id)}
            onAuxClick={(e) => {
              // middle-click close — pinned tabs don't close this way (unpin or use the menu)
              if (e.button === 1 && !tab.pinned) onClose?.(tab.id);
            }}
            onContextMenu={(e) => {
              if (!canMenu) return;
              setMenuTabId(tab.id);
              menu.open(e);
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
            className={`group relative flex cursor-pointer items-center gap-1.5 border-r border-border ${tab.pinned ? "px-2" : "px-3"} text-base whitespace-nowrap ${
              active ? "bg-surface-raised text-fg" : "text-fg-mid hover:text-fg"
            } ${dragId === tab.id ? "opacity-50" : ""}`}
          >
            {showBefore && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-accent" />}
            {showAfter && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-0.5 bg-accent" />}
            {tab.pinned && <PinIcon aria-hidden className="h-3.5 w-3.5 shrink-0" />}
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {!tab.pinned && <span className="truncate">{tab.title}</span>}
            {tab.dirty && (
              <span aria-hidden className="text-fg">
                ●
              </span>
            )}
            {onClose && !tab.pinned && (
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
      {menu.state && menuTab ? (
        <ContextMenu
          items={menuItems(menuTab)}
          anchor={menu.state}
          onClose={() => {
            menu.close();
            setMenuTabId(null);
          }}
          ariaLabel={`Tab actions for ${menuTab.title}`}
        />
      ) : null}
    </div>
  );
}
