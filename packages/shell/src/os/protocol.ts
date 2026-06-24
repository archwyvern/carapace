// Wire protocol for the OS-integration seam (reveal a path in the native file manager).
// Browser-safe (no node, no electron) so the preload + renderer can import it.

export const OS_INVOKE_CHANNEL = "carapace:os:invoke";

/**
 * The thin bridge a (sandboxed) preload exposes to the renderer for native-OS actions — a single
 * request/reply channel carrying an op + a path. `createIpcOs` consumes it.
 */
export interface OsBridge {
  invoke(op: string, path: string): Promise<unknown>;
}
