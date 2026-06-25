/** Set a single component of a vector (immutable). */
export function setAxis(values: number[], index: number, v: number): number[] {
  const next = [...values];
  next[index] = v;
  return next;
}

/**
 * Aspect-locked edit: setting component `index` to `v` scales every component by the same factor so
 * their proportions hold. A zero component has no ratio to preserve, so that edit just sets the one
 * value (the others stay put).
 */
export function ratioLocked(values: number[], index: number, v: number): number[] {
  const old = values[index] ?? 0;
  if (old === 0) return setAxis(values, index, v);
  const factor = v / old;
  return values.map((x) => x * factor);
}
