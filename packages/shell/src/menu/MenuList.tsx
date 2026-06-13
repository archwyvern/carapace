import { useState } from "react";
import type { ReactNode } from "react";
import { isCommandRef, isSeparator, isSubmenu } from "./model";
import type { MenuItem } from "./model";
import { parseMnemonic } from "./mnemonic";
import { useOptionalCommands } from "../command/context";

const ROW =
  "flex w-full items-center gap-2 px-2 py-1 text-left text-sm whitespace-nowrap hover:bg-accent hover:text-accent-fg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg";

/**
 * Renders a menu dropdown from the menu data model — actions, separators,
 * submenus (hover flyout), and command-refs (resolved via the command registry).
 * Shared by MenuBar and ContextMenu.
 */
export function MenuList({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const [openSub, setOpenSub] = useState<number | null>(null);
  const registry = useOptionalCommands();
  return (
    <div role="menu" className="min-w-[12rem] border border-border bg-surface-raised py-1 shadow-lg">
      {items.map((item, i) => {
        if (isSeparator(item)) {
          return <div key={i} role="separator" className="my-1 h-px bg-border" />;
        }
        if (isSubmenu(item)) {
          return (
            <div key={i} className="relative" onMouseEnter={() => setOpenSub(i)}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={openSub === i}
                className={ROW}
              >
                <span className="w-4" />
                <span className="flex-1">{parseMnemonic(item.label).text}</span>
                <span aria-hidden className="ml-6">&#x276F;</span>
              </button>
              {openSub === i && (
                <div className="absolute left-full top-0">
                  <MenuList items={item.items} onClose={onClose} />
                </div>
              )}
            </div>
          );
        }
        // Action or command-reference → resolve to a uniform shape.
        let label: string;
        let shortcut: string | undefined;
        let checked = false;
        let disabled: boolean;
        let activate: () => void;
        let icon: ReactNode = null;
        if (isCommandRef(item)) {
          const cmd = registry?.get(item.command);
          label = cmd?.label ?? item.command;
          shortcut = cmd?.keybinding;
          disabled = !cmd || !(registry?.isEnabled(item.command) ?? false);
          activate = () => registry?.run(item.command);
        } else {
          label = item.label;
          shortcut = item.shortcut;
          checked = item.checked ?? false;
          disabled = item.enabled === false;
          activate = item.run;
          icon = item.icon ?? null;
        }
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={disabled}
            className={ROW}
            onMouseEnter={() => setOpenSub(null)}
            onClick={() => {
              activate();
              onClose();
            }}
          >
            <span className="flex w-4 items-center justify-center">{icon ?? (checked ? "✓" : "")}</span>
            <span className="flex-1">{parseMnemonic(label).text}</span>
            {shortcut && <span className="ml-6 text-fg-mid">{shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}
