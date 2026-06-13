import * as fsp from "node:fs/promises";
import * as nodePath from "node:path";
import { watch as chokidarWatch } from "chokidar";
import type { CarapaceHost, DirEntry } from "../host/types";
import { FS_INVOKE_CHANNEL, FS_EVENT_CHANNEL } from "./protocol";
import type { FsWatchEvent } from "./protocol";
import { VirtualPath } from "../path/VirtualPath";

type Fs = NonNullable<CarapaceHost["fs"]>;

/** Structural subset of electron's `ipcMain`. */
export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

/** Structural subset of electron's `WebContents`. */
export interface WebContentsLike {
  send(channel: string, ...args: unknown[]): void;
}

export interface NodeFsOptions {
  /**
   * Map of virtual scheme (e.g. `"core"`) to a real base directory. When set, the fs
   * speaks virtual paths (`"core://x"`) externally — resolving them to `<dir>/x` for
   * `node:fs` and re-virtualizing real paths in `list`/`watch` results, via
   * {@link VirtualPath}. Omit for plain real-path mode (paths in == paths out).
   */
  mounts?: Record<string, string>;
}

/**
 * Node-side filesystem provider over `node:fs` + chokidar (recursive watching that
 * works cross-platform, unlike `fs.watch`). The desktop implementation of
 * `CarapaceHost.fs`. With `mounts`, speaks virtual `scheme://` paths (resolution is
 * the mount table — carapace's equivalent of the engine's `ContentPaths`). Mirrors VS
 * Code's `DiskFileSystemProvider`. Node-only — never import into a browser bundle.
 */
export function createNodeFs(options: NodeFsOptions = {}): Fs {
  const mounts = options.mounts;

  const toReal = (vpath: string): string => {
    if (!mounts) return vpath;
    const vp = VirtualPath.from(vpath);
    const base = mounts[vp.scheme];
    if (base === undefined) throw new Error(`No mount for scheme "${vp.scheme}://"`);
    return vp.relativePath ? nodePath.join(base, vp.relativePath) : base;
  };

  const childPath = (parentVPath: string, name: string): string =>
    mounts ? VirtualPath.from(parentVPath).combine(name).path : nodePath.join(parentVPath, name);

  const toVirtual = (realPath: string): string => {
    if (!mounts) return realPath;
    for (const [scheme, base] of Object.entries(mounts)) {
      const rel = nodePath.relative(base, realPath);
      if (rel === "") return `${scheme}://`;
      if (!rel.startsWith("..") && !nodePath.isAbsolute(rel)) {
        return `${scheme}://${rel.split(nodePath.sep).join("/")}`;
      }
    }
    return realPath;
  };

  return {
    read: (p) => fsp.readFile(toReal(p), "utf-8"),
    write: (p, d) => fsp.writeFile(toReal(p), d),
    rename: (f, t) => fsp.rename(toReal(f), toReal(t)),
    delete: (p) => fsp.rm(toReal(p), { recursive: true, force: true }),
    createFile: (p, d) => fsp.writeFile(toReal(p), d, { flag: "wx" }),
    async createDir(p) {
      await fsp.mkdir(toReal(p), { recursive: true });
    },
    async list(p) {
      const ents = await fsp.readdir(toReal(p), { withFileTypes: true });
      return ents.map((e): DirEntry => ({ name: e.name, path: childPath(p, e.name), isDir: e.isDirectory() }));
    },
    watch(vpath, cb) {
      const w = chokidarWatch(toReal(vpath), { ignoreInitial: true, persistent: true });
      const fire = (kind: FsWatchEvent["kind"]) => (real: string) => cb(toVirtual(real), kind);
      w.on("add", fire("created"));
      w.on("addDir", fire("created"));
      w.on("change", fire("modified"));
      w.on("unlink", fire("deleted"));
      w.on("unlinkDir", fire("deleted"));
      return () => void w.close();
    },
  };
}

/**
 * Main-process server: handles renderer fs requests on the carapace fs channel and
 * forwards watch events to `webContents`. Pair with `createIpcFs` in the renderer.
 * `ipcMain`/`webContents` are passed structurally so carapace needn't depend on
 * electron. Mirrors VS Code's `DiskFileSystemProviderServer`.
 */
export function serveFs(ipcMain: IpcMainLike, webContents: WebContentsLike, fs: Fs = createNodeFs()): void {
  const watches = new Map<number, () => void>();
  ipcMain.handle(FS_INVOKE_CHANNEL, (_event, op, args) => {
    const a = (args as unknown[]) ?? [];
    switch (op as string) {
      case "read": return fs.read(a[0] as string);
      case "write": return fs.write(a[0] as string, a[1] as string);
      case "rename": return fs.rename(a[0] as string, a[1] as string);
      case "delete": return fs.delete(a[0] as string);
      case "createFile": return fs.createFile(a[0] as string, a[1] as string);
      case "createDir": return fs.createDir(a[0] as string);
      case "list": return fs.list(a[0] as string);
      case "watch": {
        const id = a[0] as number;
        const dispose = fs.watch(a[1] as string, (p, kind) => {
          const event: FsWatchEvent = { watchId: id, path: p, kind };
          webContents.send(FS_EVENT_CHANNEL, event);
        });
        watches.set(id, dispose);
        return undefined;
      }
      case "unwatch": {
        const id = a[0] as number;
        watches.get(id)?.();
        watches.delete(id);
        return undefined;
      }
      default:
        throw new Error(`Unknown fs op: ${String(op)}`);
    }
  });
}
