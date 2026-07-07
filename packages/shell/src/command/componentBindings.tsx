import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { parseChord } from "./keybinding";
import type { Chord } from "./keybinding";

/**
 * The component keybinding registry: carapace widgets register their verb shortcuts (rename,
 * delete, ...) here with a factory default, and resolve the EFFECTIVE chord through a three-tier
 * cascade — factory default -> host-declared default -> user override — via KeybindingProvider.
 * No provider mounted = factory defaults, so zero-config consumers are unchanged. Navigation
 * conventions (arrows/Home/End/Enter/Space) are deliberately NOT registered — those stay fixed.
 */
export interface ComponentBindingDef {
  /** Stable id, namespaced by component ("tree.rename"). */
  id: string;
  /** Verb label for the host's shortcut editor ("Rename"). */
  label: string;
  /** Focus scope for the editor's When column ("tree focus"). */
  when: string;
  /** Factory default chord — SINGLE-STEP only (focused widgets can't hold a pending prefix). */
  keys: string | null;
}

const REGISTRY = new Map<string, ComponentBindingDef>();

/** Register a component's bindings (module scope; re-registering an id is a no-op). */
export function defineComponentBindings(defs: ComponentBindingDef[]): void {
  for (const def of defs) {
    if (def.keys && parseChord(def.keys).steps.length !== 1) {
      throw new Error(`component binding ${def.id}: factory default must be single-step, got "${def.keys}"`);
    }
    if (!REGISTRY.has(def.id)) REGISTRY.set(def.id, def);
  }
}

/** Every registered component binding — the host merges these into its shortcut editor. */
export function allComponentBindings(): ComponentBindingDef[] {
  return [...REGISTRY.values()];
}

export interface KeybindingsConfig {
  /** Host-declared default chords by binding id (tier 2; null = unbound by default). */
  defaults?: Record<string, string | null>;
  /** User rebinds by binding id (tier 3; null = unbound). */
  overrides?: Record<string, string | null>;
}

const KeybindingContext = createContext<KeybindingsConfig | null>(null);

export function KeybindingProvider(props: { config: KeybindingsConfig; children: ReactNode }): React.JSX.Element {
  return <KeybindingContext.Provider value={props.config}>{props.children}</KeybindingContext.Provider>;
}

/** The effective chord STRING for a binding under a config — the host-side resolver (editor rows). */
export function effectiveComponentKeys(id: string, config: KeybindingsConfig): string | null {
  const factory = REGISTRY.get(id)?.keys ?? null;
  const withDefaults = config.defaults && id in config.defaults ? (config.defaults[id] ?? null) : factory;
  return config.overrides && id in config.overrides ? (config.overrides[id] ?? null) : withDefaults;
}

/** The effective chord for a registered binding, parsed; null = unbound or unknown id. */
export function useKeybinding(id: string): Chord | null {
  const config = useContext(KeybindingContext);
  return useMemo(() => {
    const keys = effectiveComponentKeys(id, config ?? {});
    return keys ? parseChord(keys) : null;
  }, [id, config]);
}
