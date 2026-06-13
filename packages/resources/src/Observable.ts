export interface Subscription {
  unsubscribe(): void;
}

export type Listener<T> = (value: T, previous: T) => void;

/**
 * A typed, observable field on a {@link Resource}. Changes fire synchronously to
 * subscribers and to the owning instance (which forwards up the ownership chain
 * to the file root). Pure data — no UI/React coupling.
 */
export class Observable<T> {
  private _value: T;
  private _subscribers = new Set<Listener<T>>();

  constructor(
    readonly name: string,
    initial: T,
    private readonly _onOwnerChange: ((name: string, prev: T, next: T) => void) | null = null,
  ) {
    this._value = initial;
  }

  get(): T {
    return this._value;
  }

  set(value: T): void {
    if (equal(this._value, value)) return;
    const prev = this._value;
    this._value = value;
    for (const fn of this._subscribers) fn(value, prev);
    this._onOwnerChange?.(this.name, prev, value);
  }

  subscribe(fn: Listener<T>): Subscription {
    this._subscribers.add(fn);
    return { unsubscribe: () => { this._subscribers.delete(fn); } };
  }
}

/**
 * Structural equality for the value shapes resources store: scalars, nested arrays, and
 * value-types that self-compare via an `equals(other)` method (e.g. `@carapace/primitives`
 * `Vector2`/`ColorF`). Duck-typed on `equals` so this stays decoupled from any value-type
 * package. Without it, two equal-but-distinct value instances would spuriously re-fire
 * `Observable.set` (reference inequality) and break modified/reset detection.
 */
export function equal<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const eq = (a as { equals?: (o: unknown) => boolean }).equals;
    if (typeof eq === "function") return eq.call(a, b);
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
      return true;
    }
  }
  return false;
}
