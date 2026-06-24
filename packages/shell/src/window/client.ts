import type { CarapaceHost } from "../host/types";
import { WINDOW_INVOKE_CHANNEL } from "./protocol";
import type { WindowBridge } from "./protocol";

type WindowApi = CarapaceHost["window"];

/** Structural subset of electron's `ipcRenderer` (so carapace needn't depend on electron). */
export interface WindowIpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

/** Structural subset of electron's `contextBridge`. */
export interface WindowContextBridgeLike {
  exposeInMainWorld(key: string, api: unknown): void;
}

/**
 * Renderer-side `host.window`: forwards minimize / maximize / close / isMaximized to a
 * preload-exposed {@link WindowBridge}. Browser-safe (no electron). Pairs with `exposeWindow`
 * (preload) + `serveWindow` (main). `onMaximizeChanged` is a no-op — `WindowControls` shows a
 * static maximize icon and never observes it, so no event channel is needed.
 */
export function createIpcWindow(bridge: WindowBridge): WindowApi {
  return {
    minimize: () => void bridge.invoke("minimize"),
    toggleMaximize: () => bridge.invoke("toggleMaximize") as Promise<void>,
    close: () => void bridge.invoke("close"),
    isMaximized: () => bridge.invoke("isMaximized") as Promise<boolean>,
    onMaximizeChanged: () => () => {},
  };
}

/**
 * Preload helper: exposes the {@link WindowBridge} to the renderer over the carapace window
 * channel. Call from a sandbox-safe preload with electron's `contextBridge` + `ipcRenderer`;
 * the renderer then does `createIpcWindow(window[key])`.
 */
export function exposeWindow(
  contextBridge: WindowContextBridgeLike,
  ipcRenderer: WindowIpcRendererLike,
  key = "carapaceWindow",
): void {
  const bridge: WindowBridge = {
    invoke: (op) => ipcRenderer.invoke(WINDOW_INVOKE_CHANNEL, op),
  };
  contextBridge.exposeInMainWorld(key, bridge);
}
