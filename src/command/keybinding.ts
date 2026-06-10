// Parse/match keybinding chords like "Ctrl+Shift+P", "Alt+F4", "Cmd+K".

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
  return key.length === 1 ? key.toUpperCase() : key;
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

export function matchEvent(chord: Chord, e: KeyboardEvent): boolean {
  return (
    e.ctrlKey === chord.ctrl &&
    e.shiftKey === chord.shift &&
    e.altKey === chord.alt &&
    e.metaKey === chord.meta &&
    normalizeKey(e.key) === chord.key
  );
}
