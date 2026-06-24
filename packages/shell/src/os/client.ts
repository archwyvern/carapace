import type { CarapaceHost } from "../host/types";
import { OS_INVOKE_CHANNEL } from "./protocol";
import type { OsBridge } from "./protocol";

type OsApi = NonNullable<CarapaceHost["os"]>;

/** Structural subset of electron's `ipcRenderer` (so carapace needn't depend on electron). */
export interface OsIpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

/** Structural subset of electron's `contextBridge`. */
export interface OsContextBridgeLike {
  exposeInMainWorld(key: string, api: unknown): void;
}

/**
 * Renderer-side `host.os`: forwards native-OS actions (reveal a path in the file manager) to a
 * preload-exposed {@link OsBridge}. Browser-safe (no electron). Pairs with `exposeOs` (preload)
 * + `serveOs` (main). `path` is whatever the app speaks — real or virtual; `serveOs`'s optional
 * adapter resolves it to a real OS path before revealing.
 */
export function createIpcOs(bridge: OsBridge): OsApi {
  return {
    reveal: (path) => bridge.invoke("reveal", path) as Promise<void>,
  };
}

/**
 * Preload helper: exposes the {@link OsBridge} to the renderer over the carapace OS channel.
 * Call from a sandbox-safe preload with electron's `contextBridge` + `ipcRenderer`; the renderer
 * then does `createIpcOs(window[key])`.
 */
export function exposeOs(
  contextBridge: OsContextBridgeLike,
  ipcRenderer: OsIpcRendererLike,
  key = "carapaceOs",
): void {
  const bridge: OsBridge = {
    invoke: (op, path) => ipcRenderer.invoke(OS_INVOKE_CHANNEL, op, path),
  };
  contextBridge.exposeInMainWorld(key, bridge);
}
