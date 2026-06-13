import type { CarapaceHost, ChangeKind, DirEntry } from "./types";

type Watcher = (path: string, kind: ChangeKind) => void;

export function createMemoryHost(seed: Record<string, string> = {}): CarapaceHost & { fs: NonNullable<CarapaceHost["fs"]> } {
  const files = new Map<string, string>(Object.entries(seed));
  const watchers = new Set<Watcher>();
  let maximized = false;
  const maxListeners = new Set<(m: boolean) => void>();

  const emit = (path: string, kind: ChangeKind) => {
    for (const w of watchers) w(path, kind);
  };

  return {
    window: {
      minimize() {},
      close() {},
      async toggleMaximize() {
        maximized = !maximized;
        for (const l of maxListeners) l(maximized);
      },
      async isMaximized() {
        return maximized;
      },
      onMaximizeChanged(cb) {
        maxListeners.add(cb);
        return () => maxListeners.delete(cb);
      },
    },
    fs: {
      async read(path) {
        const v = files.get(path);
        if (v === undefined) throw new Error(`ENOENT: ${path}`);
        return v;
      },
      async write(path, data) {
        const existed = files.has(path);
        files.set(path, data);
        emit(path, existed ? "modified" : "created");
      },
      async rename(from, to) {
        const v = files.get(from);
        if (v === undefined) throw new Error(`ENOENT: ${from}`);
        files.delete(from);
        files.set(to, v);
        emit(from, "deleted");
        emit(to, "created");
      },
      async delete(path) {
        if (!files.delete(path)) throw new Error(`ENOENT: ${path}`);
        emit(path, "deleted");
      },
      async createFile(path, data) {
        files.set(path, data);
        emit(path, "created");
      },
      async createDir() {
        // Directories are implicit in this flat in-memory store.
      },
      async list(path): Promise<DirEntry[]> {
        const prefix = path === "/" ? "/" : path.endsWith("/") ? path : `${path}/`;
        const children = new Map<string, boolean>(); // name -> isDir
        for (const p of files.keys()) {
          if (!p.startsWith(prefix)) continue;
          const rest = p.slice(prefix.length);
          if (!rest) continue;
          const slash = rest.indexOf("/");
          if (slash === -1) children.set(rest, false);
          else children.set(rest.slice(0, slash), true);
        }
        return [...children].map(([name, isDir]) => ({ name, path: `${prefix}${name}`, isDir }));
      },
      watch(_path, cb) {
        watchers.add(cb);
        return () => watchers.delete(cb);
      },
    },
    dialog: {
      async openFile() {
        return null;
      },
      async saveFile() {
        return null;
      },
      async message() {},
    },
    clipboard: {
      async writeText() {},
      async readText() {
        return "";
      },
    },
  };
}
