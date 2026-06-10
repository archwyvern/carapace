import { useEffect, useRef, useState } from "react";
import { isCommandRef, isSeparator, isSubmenu } from "../menu/model";
import type { MenuItem, MenuModel } from "../menu/model";
import { parseMnemonic } from "../menu/mnemonic";
import { useOptionalCommands } from "../command/context";

export interface MenuBarProps {
  menu: MenuModel;
}

/** Renders a label, underlining the `&&` mnemonic char when `showMnemonic`. */
function MenuLabel({ label, showMnemonic }: { label: string; showMnemonic: boolean }) {
  const { text, index } = parseMnemonic(label);
  if (index < 0 || !showMnemonic) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="underline">{text[index]}</span>
      {text.slice(index + 1)}
    </>
  );
}

const ROW = "flex w-full items-center gap-2 px-2 py-1 text-left text-sm whitespace-nowrap hover:bg-accent hover:text-accent-fg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg";

function MenuList({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const [openSub, setOpenSub] = useState<number | null>(null);
  const registry = useOptionalCommands();
  return (
    <div
      role="menu"
      className="min-w-[12rem] border border-border bg-surface-raised py-1 shadow-lg"
    >
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
            <span className="w-4 text-center">{checked ? "✓" : ""}</span>
            <span className="flex-1">{parseMnemonic(label).text}</span>
            {shortcut && <span className="ml-6 text-fg-mid">{shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MenuBar({ menu }: MenuBarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [mnemonics, setMnemonics] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "Alt") setMnemonics(true);
      else if (e.altKey && e.key.length === 1) {
        const k = e.key.toUpperCase();
        const idx = menu.findIndex((m) => parseMnemonic(m.label).key === k);
        if (idx >= 0) {
          e.preventDefault();
          setMnemonics(true);
          setOpen(idx);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setMnemonics(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [menu]);

  return (
    <div ref={rootRef} role="menubar" className="flex items-stretch">
      {menu.map((top, i) => (
        <div key={i} className="relative flex">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === i}
            className={`px-2 text-sm hover:bg-surface-raised ${open === i ? "bg-surface-raised" : ""}`}
            onClick={() => setOpen(open === i ? null : i)}
            onMouseEnter={() => {
              if (open !== null) setOpen(i);
            }}
          >
            <MenuLabel label={top.label} showMnemonic={mnemonics} />
          </button>
          {open === i && (
            <div className="absolute left-0 top-full z-50">
              <MenuList items={top.items} onClose={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
