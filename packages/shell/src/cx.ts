import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type { ClassValue };

/**
 * Compose class names: clsx semantics (strings / arrays / conditionals) followed by
 * tailwind-merge conflict resolution — when two utilities target the same property the
 * LATER one wins, so a caller's `className` reliably overrides a component's defaults
 * (e.g. `cx("px-3", "px-4")` → `"px-4"`). This is the seam every component merges through.
 */
export function cx(...args: ClassValue[]): string {
  return twMerge(clsx(args));
}
