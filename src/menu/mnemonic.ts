export interface ParsedMnemonic {
  /** Label with the `&&` marker removed. */
  text: string;
  /** Index of the mnemonic char in `text`, or -1 if none. */
  index: number;
  /** Mnemonic character upper-cased, or null. */
  key: string | null;
}

// `&&` immediately before a non-space, non-& char marks the mnemonic.
const MNEMONIC = /&&([^\s&])/;

export function parseMnemonic(label: string): ParsedMnemonic {
  const m = MNEMONIC.exec(label);
  if (!m) return { text: label, index: -1, key: null };
  const index = m.index;
  const text = label.slice(0, index) + label.slice(index + 2);
  return { text, index, key: m[1]!.toUpperCase() };
}
