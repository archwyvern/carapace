import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { CommandRegistry } from "./registry";
import { matchEvent, parseChord } from "./keybinding";

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

/** Global keydown → run the first command whose keybinding chord matches. */
export function useCommandKeybindings(registry: CommandRegistry): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A focused handler (e.g. a tree row's F2/Delete, an editor binding) that already
      // consumed the key wins — don't also fire a global command for the same chord.
      if (e.defaultPrevented) return;
      for (const cmd of registry.all()) {
        if (cmd.keybinding && matchEvent(parseChord(cmd.keybinding), e)) {
          e.preventDefault();
          registry.run(cmd.id);
          return;
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [registry]);
}
