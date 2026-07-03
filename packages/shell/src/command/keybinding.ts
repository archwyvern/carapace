// Parse/match keybinding chords like "Ctrl+Shift+P", "Alt+F4", "Cmd+K".

/** Format a key combo for display (platform-aware: Ctrl/Shift/Alt -> ⌘/⇧/⌥ on Mac). */
export function formatKeys(keys: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
  return keys
    .replace(/Ctrl\+/gi, isMac ? "⌘" : "Ctrl+")
    .replace(/Shift\+/gi, isMac ? "⇧" : "Shift+")
    .replace(/Alt\+/gi, isMac ? "⌥" : "Alt+");
}

export interface Chord {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  /** Main key: upper-cased single char, or a named key ("Enter", "F4", "ArrowUp"). */
  key: string;
}

type ModFlag = "ctrl" | "shift" | "alt" | "meta";

const MODS: Record<string, ModFlag> = {
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  alt: "alt",
  option: "alt",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  super: "meta",
};

function normalizeKey(key: string): string {
  if (key === " ") return "Space"; // the event's literal space, named for display/parse symmetry
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Serialize a keydown into a chord string ("Ctrl+Shift+P"), or null while only modifiers are
 * held — the shortcut-recorder building block.
 */
export function chordFromEvent(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">): string | null {
  if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  parts.push(normalizeKey(e.key));
  return parts.join("+");
}

export function parseChord(spec: string): Chord {
  const chord: Chord = { ctrl: false, shift: false, alt: false, meta: false, key: "" };
  for (const raw of spec.split("+")) {
    const part = raw.trim();
    if (!part) continue;
    const mod = MODS[part.toLowerCase()];
    if (mod) chord[mod] = true;
    else chord.key = normalizeKey(part);
  }
  return chord;
}

export function matchEvent(chord: Chord, e: Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">): boolean {
  return (
    e.ctrlKey === chord.ctrl &&
    e.shiftKey === chord.shift &&
    e.altKey === chord.alt &&
    e.metaKey === chord.meta &&
    normalizeKey(e.key) === chord.key
  );
}
