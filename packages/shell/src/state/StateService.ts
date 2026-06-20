// Persistence-agnostic UI-state store: localStorage write-through with optional
// debounced sync to an injected remote. A generic primitive — it must NOT know about
// any specific app. The remote adapter and the localStorage key prefix are supplied by
// the consumer, so the shell has zero dependency on a particular app's data gateway.
// (Ported from Skyrat's @archwyvern/ui so the ecosystem shares one pattern.)

const REMOTE_META_KEYS = new Set(["id", "updatedAt", "createdAt"]);

type Listener = (value: unknown) => void;

/** Adapter the consuming app supplies for remote persistence (e.g. a server, or an
 *  Electron host's project-scoped state store) without the shell importing it. */
export interface RemoteStore {
  load(): Promise<Record<string, unknown>>;
  save(state: Record<string, unknown>): Promise<void>;
}

export interface StateServiceOptions {
  /** localStorage key prefix (e.g. "foley:"). Scope per app/project to avoid clashes. */
  prefix?: string;
  /** Optional remote persistence; when omitted, StateService is local-only. */
  remote?: RemoteStore;
}

export class StateService {
  private listeners = new Map<string, Set<Listener>>();
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private readonly prefix: string;
  private readonly remote?: RemoteStore;

  constructor(opts: StateServiceOptions = {}) {
    this.prefix = opts.prefix ?? "app:";
    this.remote = opts.remote;
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.flush());
    }
  }

  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      localStorage.setItem(this.prefix + key + ":ts", String(Date.now()));
    } catch {
      /* quota / unavailable — keep the in-memory notify below working anyway */
    }
    this.dirty = true;
    this.scheduleSync();
    this.notify(key, value);
  }

  subscribe(key: string, callback: Listener): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(callback);
    return () => { this.listeners.get(key)?.delete(callback); };
  }

  private notify(key: string, value: unknown) {
    const set = this.listeners.get(key);
    if (set) for (const cb of set) cb(value);
  }

  private scheduleSync() {
    if (this.syncTimer || !this.remote) return;
    this.syncTimer = setTimeout(() => { this.syncTimer = null; this.flush(); }, 5000);
  }

  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    if (!this.remote) return;
    const state: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (!fullKey || !fullKey.startsWith(this.prefix) || fullKey.endsWith(":ts")) continue;
      const key = fullKey.slice(this.prefix.length);
      if (REMOTE_META_KEYS.has(key)) continue;
      try { state[key] = JSON.parse(localStorage.getItem(fullKey)!); } catch { /* skip malformed */ }
    }
    this.remote.save(state).catch(() => {});
  }

  async loadRemote(): Promise<void> {
    if (!this.remote) return;
    try {
      const remote = await this.remote.load();
      for (const [key, value] of Object.entries(remote)) {
        if (REMOTE_META_KEYS.has(key)) continue;
        const localTs = Number(localStorage.getItem(this.prefix + key + ":ts") || "0");
        const recentLocal = localTs > Date.now() - 10000;
        if (!recentLocal) {
          localStorage.setItem(this.prefix + key, JSON.stringify(value));
          this.notify(key, value);
        }
      }
    } catch {
      /* offline — use local only */
    }
  }
}
