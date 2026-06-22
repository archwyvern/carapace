import { useEffect, useRef, useState } from "react";
import type { MenuModel } from "../menu/model";
import { parseMnemonic } from "../menu/mnemonic";
import { Menu } from "../menu/Menu";

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
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "Alt") setMnemonics(true);
      else if (open !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        setOpen((cur) => (cur === null ? 0 : (cur + dir + menu.length) % menu.length));
      } else if (e.altKey && e.key.length === 1) {
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
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [menu, open]);

  const active = open !== null ? menu[open] : null;

  return (
    <div ref={rootRef} role="menubar" className="flex items-stretch">
      {menu.map((top, i) => (
        <button
          key={i}
          ref={(n) => {
            btnRefs.current[i] = n;
          }}
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={open === i}
          className={`px-2 text-base hover:bg-surface-raised ${open === i ? "bg-surface-raised" : ""}`}
          onClick={() => setOpen(open === i ? null : i)}
          onMouseEnter={() => {
            if (open !== null) setOpen(i);
          }}
        >
          <MenuLabel label={top.label} showMnemonic={mnemonics} />
        </button>
      ))}
      {active && open !== null && btnRefs.current[open] && (
        <Menu
          items={active.items}
          open
          modal={false}
          onOpenChange={(o) => {
            if (!o) setOpen(null);
          }}
          anchor={btnRefs.current[open]!}
          ariaLabel={parseMnemonic(active.label).text}
        />
      )}
    </div>
  );
}
