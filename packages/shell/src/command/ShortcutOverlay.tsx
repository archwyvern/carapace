import { useEffect } from "react";
import { useCommands } from "./context";

export interface ShortcutOverlayProps {
  open: boolean;
  onClose: () => void;
}

/** A keyboard-shortcut cheat sheet, sourced from the command registry (commands
 *  with a `keybinding`, grouped by `category`). */
export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const registry = useCommands();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const groups = new Map<string, { id: string; label: string; keybinding: string }[]>();
  for (const cmd of registry.all()) {
    if (!cmd.keybinding) continue;
    const group = cmd.category ?? "General";
    const list = groups.get(group) ?? [];
    list.push({ id: cmd.id, label: cmd.label, keybinding: cmd.keybinding });
    groups.set(group, list);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="flex max-h-[80vh] w-[500px] flex-col border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-border bg-surface-raised px-4">
          <span className="text-xs uppercase tracking-wide text-accent">Keyboard Shortcuts</span>
          <button type="button" onClick={onClose} className="text-sm text-fg-mid hover:text-fg">
            Esc
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {groups.size === 0 ? (
            <span className="text-sm text-fg-mid">No shortcuts registered</span>
          ) : (
            [...groups.entries()].map(([group, shortcuts]) => (
              <div key={group} className="mb-4 last:mb-0">
                <div className="mb-2 border-b border-border/40 pb-1 text-xs uppercase tracking-wide text-fg-mid">
                  {group}
                </div>
                {shortcuts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-fg-mid">{s.label}</span>
                    <kbd className="border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-accent">
                      {s.keybinding}
                    </kbd>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
