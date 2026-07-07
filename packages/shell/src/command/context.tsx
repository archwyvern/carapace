import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { CommandRegistry } from "./registry";
import { createChordMatcher, parseChord } from "./keybinding";

const CommandContext = createContext<CommandRegistry | null>(null);

export function CommandProvider(props: { registry: CommandRegistry; children: ReactNode }) {
  return (
    <CommandContext.Provider value={props.registry}>
      {props.children}
    </CommandContext.Provider>
  );
}

export function useCommands(): CommandRegistry {
  const registry = useContext(CommandContext);
  if (registry === null) {
    throw new Error("useCommands must be used within a <CommandProvider>");
  }
  return registry;
}

/** Like useCommands but returns null instead of throwing when no provider is present. */
export function useOptionalCommands(): CommandRegistry | null {
  return useContext(CommandContext);
}

/** Global keydown → run the command whose keybinding matches (two-step chords included). */
export function useCommandKeybindings(registry: CommandRegistry): void {
  useEffect(() => {
    const matcher = createChordMatcher();
    const onKey = (e: KeyboardEvent) => {
      // A focused handler (e.g. a tree row's F2/Delete, an editor binding) that already
      // consumed the key wins — don't also fire a global command for the same chord.
      if (e.defaultPrevented) return;
      const bindings = registry
        .all()
        .filter((c) => c.keybinding)
        .map((c) => ({ id: c.id, chord: parseChord(c.keybinding!) }));
      const m = matcher.feed(bindings, e);
      if (m.type === "run") {
        e.preventDefault();
        registry.run(m.id);
      } else if (m.type === "pending" || m.type === "cancel") {
        e.preventDefault(); // mid-sequence keys never leak into widgets
      }
    };
    const onBlur = () => matcher.reset();
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [registry]);
}
