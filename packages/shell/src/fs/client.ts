import type { CarapaceHost, DirEntry } from "../host/types";
import { FS_INVOKE_CHANNEL, FS_EVENT_CHANNEL } from "./protocol";
import type { FsBridge, FsWatchEvent } from "./protocol";

type Fs = NonNullable<CarapaceHost["fs"]>;

/** Structural subset of electron's `ipcRenderer` (so carapace needn't depend on electron). */
export interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
}

/** Structural subset of electron's `contextBridge`. */
export interface ContextBridgeLike {
  exposeInMainWorld(key: string, api: unknown): void;
}

/**
 * Renderer-side filesystem provider: implements `CarapaceHost.fs` by forwarding to
 * a preload-exposed {@link FsBridge}. Browser-safe (no node, no electron). The
 * desktop counterpart to a web adapter (e.g. skyrat's GCS-over-API). Mirrors VS
 * Code's `DiskFileSystemProviderClient`.
 */
export function createIpcFs(bridge: FsBridge): Fs {
  const watchers = new Map<number, (path: string, kind: FsWatchEvent["kind"]) => void>();
  let nextId = 1;
  bridge.subscribe((e) => watchers.get(e.watchId)?.(e.path, e.kind));
  const call = (op: string, ...args: unknown[]) => bridge.invoke(op, args);
  return {
    read: (p) => call("read", p) as Promise<string>,
    write: (p, d) => call("write", p, d) as Promise<void>,
    rename: (f, t) => call("rename", f, t) as Promise<void>,
    delete: (p) => call("delete", p) as Promise<void>,
    createFile: (p, d) => call("createFile", p, d) as Promise<void>,
    createDir: (p) => call("createDir", p) as Promise<void>,
    list: (p) => call("list", p) as Promise<DirEntry[]>,
    watch: (path, cb) => {
      const id = nextId++;
      watchers.set(id, cb);
      void call("watch", id, path);
      return () => {
        watchers.delete(id);
        void call("unwatch", id);
      };
    },
  };
}

/**
 * Preload helper: exposes the {@link FsBridge} to the renderer over the carapace fs
 * channels. Call from a sandbox-safe preload, passing electron's `contextBridge` and
 * `ipcRenderer`. The renderer then does `createIpcFs(window[key])`.
 */
export function exposeFs(contextBridge: ContextBridgeLike, ipcRenderer: IpcRendererLike, key = "carapaceFs"): void {
  const bridge: FsBridge = {
    invoke: (op, args) => ipcRenderer.invoke(FS_INVOKE_CHANNEL, op, args),
    subscribe: (cb) => {
      const handler = (_event: unknown, ...args: unknown[]) => cb(args[0] as FsWatchEvent);
      ipcRenderer.on(FS_EVENT_CHANNEL, handler);
      return () => ipcRenderer.removeListener(FS_EVENT_CHANNEL, handler);
    },
  };
  contextBridge.exposeInMainWorld(key, bridge);
}
