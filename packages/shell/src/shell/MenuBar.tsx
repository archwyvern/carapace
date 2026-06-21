import { useEffect, useRef, useState } from "react";
import type { MenuModel } from "../menu/model";
import { parseMnemonic } from "../menu/mnemonic";
import { MenuList } from "../menu/MenuList";

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
            className={`px-2 text-xs hover:bg-surface-raised ${open === i ? "bg-surface-raised" : ""}`}
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
