// Command registry — the single source of truth for actions. A command drives the
// menu, its keybinding, and the command palette. Mirrors VS Code's command model.

import type { ReactNode } from "react";

export interface Command {
  id: string;
  /** Display label (palette + menu). `&&` mnemonic allowed when shown in a menu. */
  label: string;
  /** Palette grouping / menu provenance, e.g. "File". */
  category?: string;
  /** Display + binding chord, e.g. "Ctrl+Shift+P". */
  keybinding?: string;
  /** Leading icon shown when the command appears in a menu. */
  icon?: ReactNode;
  /** Secondary text shown in a menu. */
  description?: string;
  /** Toggle state; when defined the command renders as a checkbox menu item. */
  checked?: boolean;
  /** Dynamic enablement; defaults to always enabled. */
  isEnabled?: () => boolean;
  run: () => void;
}

export interface CommandRegistry {
  /** Register a command; returns an unregister function. */
  register(command: Command): () => void;
  get(id: string): Command | undefined;
  all(): Command[];
  isEnabled(id: string): boolean;
  /** Run a command by id (no-op if missing or disabled). */
  run(id: string): void;
}

export function createCommandRegistry(initial: Command[] = []): CommandRegistry {
  const commands = new Map<string, Command>();

  const register = (command: Command) => {
    commands.set(command.id, command);
    return () => {
      if (commands.get(command.id) === command) commands.delete(command.id);
    };
  };

  for (const c of initial) register(c);

  const isEnabled = (id: string): boolean => {
    const c = commands.get(id);
    if (!c) return false;
    return c.isEnabled ? c.isEnabled() : true;
  };

  return {
    register,
    get: (id) => commands.get(id),
    all: () => [...commands.values()],
    isEnabled,
    run: (id) => {
      const c = commands.get(id);
      if (c && isEnabled(id)) c.run();
    },
  };
}
