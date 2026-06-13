// Wire protocol shared by the node-side fs server and the renderer-side fs client.
// Browser-safe (no node, no electron) so the preload + renderer can import it.

export const FS_INVOKE_CHANNEL = "carapace:fs:invoke";
export const FS_EVENT_CHANNEL = "carapace:fs:event";

export interface FsWatchEvent {
  watchId: number;
  path: string;
  kind: "created" | "modified" | "deleted";
}

/**
 * The thin bridge a (sandboxed) preload exposes to the renderer: one request/reply
 * channel plus a push channel for watch events. `createIpcFs` consumes it.
 */
export interface FsBridge {
  invoke(op: string, args: unknown[]): Promise<unknown>;
  subscribe(cb: (event: FsWatchEvent) => void): () => void;
}
