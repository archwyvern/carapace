export type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Join truthy class values into a className string (clsx-lite). */
export function cx(...args: ClassValue[]): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === "string" || typeof a === "number") out.push(String(a));
    else if (Array.isArray(a)) {
      const nested = cx(...a);
      if (nested) out.push(nested);
    }
  }
  return out.join(" ");
}
