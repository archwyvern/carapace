export interface HistoryOptions<T> {
  /** Treat two snapshots as equal so a no-op commit is dropped. Defaults to `Object.is`. */
  equals?: (a: T, b: T) => boolean;
  /** Maximum undo depth; older entries are discarded past it. Default 200. */
  limit?: number;
}

export interface CommitOptions {
  /** Consecutive commits sharing this key fold into ONE undo entry until {@link History.endGesture}.
   *  Use it to collapse a drag (many intermediate states) into a single undo step. */
  coalesce?: string;
}

/**
 * A framework-agnostic snapshot undo/redo store (the pattern lambert's editor uses): the current
 * state plus past/future stacks of whole-state snapshots. `T` is whatever a snapshot is — an
 * immutable document, or a serialized string for a mutable model. Gesture coalescing folds a burst
 * of edits into one undo step. React binds via {@link useHistory} (`useSyncExternalStore`).
 *
 * It does not own application of a snapshot — `undo()`/`redo()` return the snapshot to apply and the
 * caller restores it (swap an immutable doc, or re-hydrate a live object graph).
 */
export class History<T> {
  private _undo: T[] = [];
  private _redo: T[] = [];
  private _gesture: string | null = null;
  private _current: T;
  private _version = 0;
  private readonly _equals: (a: T, b: T) => boolean;
  private readonly _limit: number;
  private readonly _listeners = new Set<() => void>();

  constructor(initial: T, opts: HistoryOptions<T> = {}) {
    this._current = initial;
    this._equals = opts.equals ?? Object.is;
    this._limit = opts.limit ?? 200;
  }

  get current(): T {
    return this._current;
  }
  get canUndo(): boolean {
    return this._undo.length > 0;
  }
  get canRedo(): boolean {
    return this._redo.length > 0;
  }
  /** Monotonic change counter — the {@link useHistory} snapshot, so React re-renders on every edit. */
  get version(): number {
    return this._version;
  }

  subscribe = (fn: () => void): (() => void) => {
    this._listeners.add(fn);
    return () => {
      this._listeners.delete(fn);
    };
  };

  private emit(): void {
    this._version++;
    for (const fn of this._listeners) fn();
  }

  /** Record a new state, pushing the prior onto the undo stack and clearing redo. Commits that share
   *  a live `coalesce` gesture key replace the current state without a new undo entry. No-op when the
   *  state is unchanged. */
  commit(next: T, opts: CommitOptions = {}): void {
    if (this._equals(next, this._current)) return;
    const key = opts.coalesce ?? null;
    const coalescing = key !== null && key === this._gesture;
    if (!coalescing) {
      this._undo.push(this._current);
      if (this._undo.length > this._limit) this._undo.shift();
      this._redo = [];
    }
    this._gesture = key;
    this._current = next;
    this.emit();
  }

  /** End the current coalescing gesture, so the next commit starts a fresh undo entry. */
  endGesture(): void {
    this._gesture = null;
  }

  /** Step back, returning the now-current snapshot to apply (or null if nothing to undo). */
  undo(): T | null {
    const prev = this._undo.pop();
    if (prev === undefined) return null;
    this._gesture = null;
    this._redo.push(this._current);
    this._current = prev;
    this.emit();
    return prev;
  }

  /** Step forward, returning the now-current snapshot to apply (or null if nothing to redo). */
  redo(): T | null {
    const next = this._redo.pop();
    if (next === undefined) return null;
    this._gesture = null;
    this._undo.push(this._current);
    this._current = next;
    this.emit();
    return next;
  }

  /** Replace the state and clear all history (open / load / new). */
  reset(state: T): void {
    this._undo = [];
    this._redo = [];
    this._gesture = null;
    this._current = state;
    this.emit();
  }
}
