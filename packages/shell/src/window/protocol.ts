// Wire protocol for the window-control seam (frameless TopBar window controls).
// Browser-safe (no node, no electron) so the preload + renderer can import it.

export const WINDOW_INVOKE_CHANNEL = "carapace:window:invoke";

/**
 * The thin bridge a (sandboxed) preload exposes to the renderer for the title-bar window
 * controls — a single request/reply channel. `createIpcWindow` consumes it.
 */
export interface WindowBridge {
  invoke(op: string): Promise<unknown>;
}
