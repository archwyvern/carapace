/** One step on the timeline: the `before`/`after` snapshot of the single entity (`id`) it changed. */
export interface SessionHistoryEntry<S> {
  id: string;
  before: S;
  after: S;
}

export interface SessionHistoryOptions<S> {
  /** Restore a recorded snapshot onto the entity with `id`. May be async (e.g. load it first). The
   *  store moves the entity's baseline to this snapshot BEFORE calling `apply`, so the settled state
   *  the restore produces re-records as a no-op rather than a fresh undo step. */
  apply: (id: string, snapshot: S) => void | Promise<void>;
  /** Treat two snapshots as equal so an unchanged `record` is dropped. Defaults to `Object.is`. */
  equals?: (a: S, b: S) => boolean;
  /** Maximum undo depth; older entries are discarded past it. Default 500. */
  limit?: number;
}

/**
 * A session-wide undo/redo timeline across many keyed entities (open files, documents, objects).
 *
 * Unlike a single-document {@link History}, one action here can touch several entities and still be
 * one coherent timeline: an editor that edits a resource AND its nested file-backed references in one
 * gesture records an entry per entity onto ONE chronological stack, so undo walks them in order
 * regardless of which entity each touched. This is the Godot / JetBrains model — undo follows the
 * action, not the file.
 *
 * Snapshots are opaque `S` (a serialized string, an immutable doc — whatever round-trips through
 * `apply`). The store owns the timeline and per-entity baselines; it does NOT know how to capture or
 * restore a snapshot — the consumer feeds settled states via {@link record} and supplies `apply`.
 */
export class SessionHistory<S = string> {
  private _undo: SessionHistoryEntry<S>[] = [];
  private _redo: SessionHistoryEntry<S>[] = [];
  private _baselines = new Map<string, S>();
  private _version = 0;
  private readonly _listeners = new Set<() => void>();
  private readonly _apply: (id: string, snapshot: S) => void | Promise<void>;
  private readonly _equals: (a: S, b: S) => boolean;
  private readonly _limit: number;

  constructor(opts: SessionHistoryOptions<S>) {
    this._apply = opts.apply;
    this._equals = opts.equals ?? Object.is;
    this._limit = opts.limit ?? 500;
  }

  get canUndo(): boolean {
    return this._undo.length > 0;
  }
  get canRedo(): boolean {
    return this._redo.length > 0;
  }
  /** Monotonic change counter — a stable `useSyncExternalStore` snapshot for toolbar binding. */
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

  /** Establish (or reset) an entity's baseline without recording an undo step — e.g. on load/open. */
  setBaseline(id: string, snapshot: S): void {
    this._baselines.set(id, snapshot);
  }

  /** Drop an entity's baseline (e.g. on close). Its timeline entries survive — undoing one re-applies
   *  through the supplied `apply`, which can reload the entity. */
  forget(id: string): void {
    this._baselines.delete(id);
  }

  /** Record an entity's settled state. If it differs from its baseline, push a `{ before, after }`
   *  delta onto the timeline (clearing redo) and advance the baseline. A no-op when unchanged — which
   *  is also how an `apply`-triggered re-record collapses to nothing, since `apply` moves the baseline
   *  first. */
  record(id: string, snapshot: S): void {
    const before = this._baselines.get(id);
    this._baselines.set(id, snapshot);
    if (before === undefined || this._equals(before, snapshot)) return;
    this._undo.push({ id, before, after: snapshot });
    if (this._undo.length > this._limit) this._undo.shift();
    this._redo = [];
    this.emit();
  }

  /** Step the timeline back one edit, restoring the prior snapshot to its entity. Returns the id of
   *  the entity it restored (so the UI can reveal it), or null if nothing to undo. */
  async undo(): Promise<string | null> {
    const entry = this._undo.pop();
    if (!entry) return null;
    this._redo.push(entry);
    this._baselines.set(entry.id, entry.before);
    this.emit();
    await this._apply(entry.id, entry.before);
    return entry.id;
  }

  /** Step the timeline forward one edit. Returns the restored entity's id, or null. */
  async redo(): Promise<string | null> {
    const entry = this._redo.pop();
    if (!entry) return null;
    this._undo.push(entry);
    this._baselines.set(entry.id, entry.after);
    this.emit();
    await this._apply(entry.id, entry.after);
    return entry.id;
  }

  /** Clear the whole timeline and all baselines (e.g. session reset). */
  clear(): void {
    this._undo = [];
    this._redo = [];
    this._baselines.clear();
    this.emit();
  }
}
