import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../cx";
import { CheckIcon, ChevronDownIcon } from "../icons";
import { Popover } from "../overlay/Popover";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Non-native styled single-select — a button trigger + a {@link Popover} listbox, full
 * keyboard support (arrows / Home / End / Enter / Esc), checkmark on the current option.
 * Use when the native `<select>` can't be themed to contract; FormEnum remains the labelled
 * inspector-row variant.
 */
export function Select({ options, value, onChange, placeholder = "Select…", disabled = false, ariaLabel, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = options.find((o) => o.value === value);

  const openMenu = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };

  const move = (dir: 1 | -1) => {
    const n = options.length;
    let i = active;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!options[i]?.disabled) break;
    }
    setActive(i);
  };

  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cx(
          "flex h-[22px] w-full items-center gap-1 rounded-control border border-border bg-surface-sunken px-1.5 text-xs text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus-visible:border-accent disabled:cursor-default disabled:opacity-60",
          className,
        )}
      >
        <span className={cx("min-w-0 flex-1 truncate text-left", !current && "text-fg-mid")}>
          {current ? current.label : placeholder}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-fg-mid" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} matchWidth>
        <ul role="listbox" className="min-w-[8rem]">
          {options.map((o, i) => {
            const sel = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={sel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cx(
                  "flex cursor-pointer items-center gap-1.5 px-2 py-1 text-xs",
                  o.disabled && "pointer-events-none opacity-40",
                  i === active ? "bg-list-active text-fg" : "text-fg-mid",
                )}
              >
                <span className="flex w-3.5 shrink-0 justify-center">
                  {sel && <CheckIcon className="h-3 w-3 text-accent" />}
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
