import { useState } from "react";
import { cx } from "../cx";
import { CloseIcon } from "../icons";

export interface ShortcutItem {
  keys: string;
  label: string;
}

export type ShortcutCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface ShortcutGuideProps {
  items: ShortcutItem[];
  title?: string;
  corner?: ShortcutCorner;
  defaultOpen?: boolean;
  /** Persist the open/closed state under this localStorage key. */
  storageKey?: string;
}

const CORNER: Record<ShortcutCorner, string> = {
  "bottom-right": "bottom-2 right-2 items-end",
  "bottom-left": "bottom-2 left-2 items-start",
  "top-right": "top-2 right-2 items-end",
  "top-left": "top-2 left-2 items-start",
};

function load(key: string | undefined, fallback: boolean): boolean {
  if (!key || typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

/**
 * Viewport-anchored, collapsible keyboard cheat-sheet. Sits in a corner as a small pill;
 * expands to a key/label panel. Pointer + wheel events are stopped so a canvas behind it keeps
 * receiving drags/zoom. Open state optionally persists to localStorage.
 */
export function ShortcutGuide({
  items,
  title = "Shortcuts",
  corner = "bottom-right",
  defaultOpen = false,
  storageKey,
}: ShortcutGuideProps) {
  const [open, setOpen] = useState(() => load(storageKey, defaultOpen));

  const toggle = (next: boolean) => {
    setOpen(next);
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* storage unavailable — in-memory only */
      }
    }
  };

  return (
    <div
      className={cx("pointer-events-none fixed z-[110] flex flex-col gap-1", CORNER[corner])}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      {open ? (
        <div className="pointer-events-auto w-56 rounded-control border border-border bg-surface-raised/95 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-2 py-1">
            <span className="text-base font-semibold text-fg-mid">{title}</span>
            <button
              type="button"
              aria-label="Hide shortcuts"
              onClick={() => toggle(false)}
              className="flex text-fg-mid hover:text-fg"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="max-h-[60vh] overflow-auto p-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-1 py-0.5 text-base">
                <span className="text-fg-mid">{it.label}</span>
                <kbd className="shrink-0 rounded-sm border border-border bg-surface-sunken px-1 font-mono text-2xs text-fg">
                  {it.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => toggle(true)}
          aria-label="Show keyboard shortcuts"
          className="pointer-events-auto flex items-center gap-1 rounded-control border border-border bg-surface-raised/95 px-2 py-1 text-base text-fg-mid shadow-lg backdrop-blur-sm hover:text-fg"
        >
          <kbd className="rounded-sm border border-border bg-surface-sunken px-1 font-mono text-2xs">?</kbd>
          {title}
        </button>
      )}
    </div>
  );
}
