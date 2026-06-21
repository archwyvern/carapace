import { useEffect, useMemo, useState } from "react";
import { useCommands } from "./context";
import { parseMnemonic } from "../menu/mnemonic";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  placeholder?: string;
}

/** Ctrl+P-style overlay over the command registry: filter, arrow-nav, Enter to run. */
export function CommandPalette({ open, onClose, placeholder = "Type a command…" }: CommandPaletteProps) {
  const registry = useCommands();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registry
      .all()
      .filter((c) => registry.isEnabled(c.id))
      .filter((c) => !q || `${c.category ?? ""} ${parseMnemonic(c.label).text}`.toLowerCase().includes(q));
  }, [registry, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  const choose = (i: number) => {
    const cmd = results[i];
    if (cmd) {
      registry.run(cmd.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-[34rem] max-w-[90vw] border border-border bg-surface-raised shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(highlight);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="w-full rounded-control border border-border bg-surface-sunken px-3 py-2 text-xs text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus:border-accent"
        />
        <ul role="listbox" className="max-h-80 overflow-auto py-1">
          {results.length === 0 && (
            <li className="px-3 py-2 text-xs text-fg-mid">No matching commands</li>
          )}
          {results.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => choose(i)}
                className={`flex w-full items-center gap-2 px-3 py-1 text-left text-xs ${
                  i === highlight ? "bg-accent text-accent-fg" : "text-fg"
                }`}
              >
                {cmd.category && <span className="text-fg-mid">{cmd.category}:</span>}
                <span className="flex-1">{parseMnemonic(cmd.label).text}</span>
                {cmd.keybinding && (
                  <span className={i === highlight ? "" : "text-fg-mid"}>{cmd.keybinding}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
