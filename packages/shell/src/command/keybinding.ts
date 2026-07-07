// Parse/match keybinding chords: single-step ("Ctrl+Shift+P", "Alt+F4") or two-step sequences
// ("Ctrl+K U" — press Ctrl+K, release, then U; VS Code-style).

/** Format a key combo for display (platform-aware: Ctrl/Shift/Alt -> ⌘/⇧/⌥ on Mac). */
export function formatKeys(keys: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
  return keys
    .replace(/Ctrl\+/gi, isMac ? "⌘" : "Ctrl+")
    .replace(/Shift\+/gi, isMac ? "⇧" : "Shift+")
    .replace(/Alt\+/gi, isMac ? "⌥" : "Alt+");
}

/** One keystroke: the modifiers held plus the main key. */
export interface ChordStep {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  /** Main key: upper-cased single char, or a named key ("Enter", "F4", "ArrowUp"). */
  key: string;
}

/** A binding: one keystroke, or a two-step sequence (steps[0] is the prefix). */
export interface Chord {
  steps: ChordStep[];
}

type KeyboardEventLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">;

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
 * Serialize a keydown into a chord-step string ("Ctrl+Shift+P"), or null while only modifiers are
 * held — the shortcut-recorder building block.
 */
export function chordFromEvent(e: KeyboardEventLike): string | null {
  if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  parts.push(normalizeKey(e.key));
  return parts.join("+");
}

function parseStep(spec: string): ChordStep {
  const step: ChordStep = { ctrl: false, shift: false, alt: false, meta: false, key: "" };
  for (const raw of spec.split("+")) {
    const part = raw.trim();
    if (!part) continue;
    const mod = MODS[part.toLowerCase()];
    if (mod) step[mod] = true;
    else step.key = normalizeKey(part);
  }
  return step;
}

/** Serialize a step back to its canonical string form ("Ctrl+K") — prefix bookkeeping. */
function stepToString(step: ChordStep): string {
  const parts: string[] = [];
  if (step.ctrl) parts.push("Ctrl");
  if (step.shift) parts.push("Shift");
  if (step.alt) parts.push("Alt");
  if (step.meta) parts.push("Meta");
  parts.push(step.key);
  return parts.join("+");
}

/** Parse a binding spec: steps separated by whitespace ("Ctrl+K U" = two-step). */
export function parseChord(spec: string): Chord {
  return { steps: spec.trim().split(/\s+/).filter(Boolean).map(parseStep) };
}

/** Match one keystroke against one step. */
export function matchStep(step: ChordStep, e: KeyboardEventLike): boolean {
  return (
    e.ctrlKey === step.ctrl &&
    e.shiftKey === step.shift &&
    e.altKey === step.alt &&
    e.metaKey === step.meta &&
    normalizeKey(e.key) === step.key
  );
}

/**
 * Match a keydown against a SINGLE-STEP chord. Two-step chords never match here — stateless
 * callers can't hold the pending prefix; use createChordMatcher for those.
 */
export function matchEvent(chord: Chord, e: KeyboardEventLike): boolean {
  return chord.steps.length === 1 && matchStep(chord.steps[0]!, e);
}

export type ChordMatch =
  | { type: "run"; id: string }
  /** A two-step prefix matched — the caller should swallow the key and may surface the prefix. */
  | { type: "pending"; prefix: string }
  /** A pending sequence was aborted (Esc or an unmatched second step) — swallow, dispatch nothing. */
  | { type: "cancel" }
  | { type: "none" };

/**
 * Stateful matcher for chord sequences (VS Code semantics): a step that prefixes any two-step
 * binding swallows the key and waits — shadowing a single-step binding on the same step; the next
 * keystroke completes the sequence or cancels it. Bare-modifier keydowns are ignored throughout.
 */
export function createChordMatcher(): {
  feed(bindings: ReadonlyArray<{ id: string; chord: Chord }>, e: KeyboardEventLike): ChordMatch;
  reset(): void;
} {
  let pending: string | null = null;
  return {
    feed(bindings, e) {
      if (e.key === "Control" || e.key === "Shift" || e.key === "Alt" || e.key === "Meta") return { type: "none" };
      if (pending !== null) {
        const prefix = pending;
        pending = null;
        if (e.key === "Escape") return { type: "cancel" };
        for (const b of bindings) {
          if (b.chord.steps.length === 2 && stepToString(b.chord.steps[0]!) === prefix && matchStep(b.chord.steps[1]!, e)) {
            return { type: "run", id: b.id };
          }
        }
        return { type: "cancel" };
      }
      let single: string | null = null;
      let prefixed = false;
      for (const b of bindings) {
        if (b.chord.steps.length === 1) {
          if (single === null && matchStep(b.chord.steps[0]!, e)) single = b.id;
        } else if (b.chord.steps.length === 2 && matchStep(b.chord.steps[0]!, e)) {
          prefixed = true;
        }
      }
      if (prefixed) {
        // the prefix wins even when a single-step binding shares the step (VS Code shadowing)
        pending = chordFromEvent(e);
        return { type: "pending", prefix: pending! };
      }
      if (single !== null) return { type: "run", id: single };
      return { type: "none" };
    },
    reset() {
      pending = null;
    },
  };
}
