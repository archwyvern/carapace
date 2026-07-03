import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import { Modal } from "../overlay/Modal";
import { TextInput } from "../primitives/TextInput";
import { CloseIcon } from "../icons";

export interface SettingsScreen {
  id: string;
  /** Nav-row label; also the screen's header title. */
  label: string;
  /** Nav group heading the screen sits under (e.g. "Project", "Document"). Ungrouped screens lead. */
  group?: string;
  /** Extra search terms for the nav filter — the setting NAMES the screen contains ("green",
   *  "bit depth", "keybinding"), so searching a setting finds its screen, JetBrains-style. */
  keywords?: string[];
  render: () => ReactNode;
}

export interface SettingsModalProps {
  /** Accessible dialog name (default "Settings"). */
  title?: string;
  screens: SettingsScreen[];
  /** Screen to open on; falls back to the first screen. */
  initialScreen?: string;
  onScreenChange?: (id: string) => void;
  onClose: () => void;
}

/**
 * JetBrains-style settings dialog: a left nav list of screens (grouped) and a screen host on the
 * right. Settings screens are INSTANT-APPLY — there is no OK/Apply/Cancel; Escape (or the X, or the
 * backdrop) closes. The panel is deliberately smaller than the window so the app peeks around it
 * and instant-apply changes preview live.
 */
export function SettingsModal({ title = "Settings", screens, initialScreen, onScreenChange, onClose }: SettingsModalProps) {
  const first = screens[0]?.id ?? "";
  const [active, setActive] = useState(initialScreen && screens.some((s) => s.id === initialScreen) ? initialScreen : first);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  // search filters the nav by group/label/keywords (the JetBrains pattern: find the screen that
  // owns a setting by the setting's name)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return screens;
    return screens.filter((s) =>
      `${s.group ?? ""} ${s.label} ${(s.keywords ?? []).join(" ")}`.toLowerCase().includes(q),
    );
  }, [screens, query]);
  // nav rows in display order: group headings interleaved, preserving screen order within a group
  const rows = useMemo(() => {
    const out: Array<{ heading: string } | SettingsScreen> = [];
    let lastGroup: string | undefined;
    for (const s of visible) {
      if (s.group !== lastGroup) {
        if (s.group) out.push({ heading: s.group });
        lastGroup = s.group;
      }
      out.push(s);
    }
    return out;
  }, [visible]);

  const current = screens.find((s) => s.id === active) ?? screens[0];
  const select = (id: string): void => {
    setActive(id);
    onScreenChange?.(id);
  };

  // vertical arrow-key navigation across the flat (filtered) screen list, skipping headings
  const onNavKey = (e: React.KeyboardEvent): void => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (e.target instanceof HTMLInputElement) return; // the search box keeps its own arrows
    if (visible.length === 0) return;
    e.preventDefault();
    const idx = Math.max(0, visible.findIndex((s) => s.id === active));
    const next = visible[(idx + (e.key === "ArrowDown" ? 1 : visible.length - 1)) % visible.length];
    if (next) {
      select(next.id);
      listRef.current?.querySelector<HTMLElement>(`[data-screen="${next.id}"]`)?.focus();
    }
  };

  return (
    <Modal
      ariaLabel={title}
      onClose={onClose}
      className="flex h-[560px] max-h-[82vh] w-[760px] max-w-[86vw] border border-border bg-surface-raised outline-none"
    >
      <div
        ref={listRef}
        role="tablist"
        aria-orientation="vertical"
        aria-label={title}
        className="flex w-48 shrink-0 flex-col overflow-y-auto border-r border-border py-2"
        onKeyDown={onNavKey}
      >
        <div className="px-3 pb-2 text-lg font-semibold text-fg">{title}</div>
        <div className="px-2 pb-2">
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" aria-label="Search settings" />
        </div>
        {rows.length === 0 ? <div className="px-3 py-1 text-base text-fg-mid">No matches</div> : null}
        {rows.map((row) =>
          "heading" in row ? (
            <div key={`h:${row.heading}`} className="px-3 pb-1 pt-2.5 text-sm font-semibold uppercase tracking-wide text-fg-mid">
              {row.heading}
            </div>
          ) : (
            <button
              key={row.id}
              type="button"
              role="tab"
              data-screen={row.id}
              aria-selected={row.id === active}
              tabIndex={row.id === active ? 0 : -1}
              className={cx(
                "cursor-pointer px-3 py-1 text-left text-base",
                row.id === active ? "bg-list-active text-fg" : "text-fg-mid hover:bg-hover hover:text-fg",
                row.group && "pl-5",
              )}
              onClick={() => select(row.id)}
            >
              {row.label}
            </button>
          ),
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="text-md font-semibold text-fg">
            {current?.group ? <span className="text-fg-mid">{current.group} › </span> : null}
            {current?.label}
          </div>
          <button
            type="button"
            aria-label="Close settings"
            className="cursor-pointer p-1 text-fg-mid hover:text-fg"
            onClick={onClose}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-4">
          {current?.render()}
        </div>
      </div>
    </Modal>
  );
}
