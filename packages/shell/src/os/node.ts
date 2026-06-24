import { OS_INVOKE_CHANNEL } from "./protocol";

/** Structural subset of electron's `ipcMain`. */
export interface OsIpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

/** Structural subset of electron's `shell` (so carapace needn't depend on electron). */
export interface ShellLike {
  showItemInFolder(fullPath: string): void;
}

export interface ServeOsOptions {
  /**
   * electron's `shell` (or anything with `showItemInFolder`) — carapace has no electron dep, so
   * the app plugs the real one in.
   */
  shell: ShellLike;
  /**
   * Optional adapter mapping a host path to a real OS path before revealing. Apps that speak
   * virtual paths (e.g. drydock's `core://…`) provide this; apps whose paths are already real OS
   * paths omit it.
   */
  resolve?(path: string): string | Promise<string>;
}

/**
 * Main-process server for the OS-integration seam: handles the renderer's reveal request by
 * resolving the path through the optional adapter, then calling electron's
 * `shell.showItemInFolder`. Pair with `exposeOs` (preload) + `createIpcOs` (renderer). `ipcMain`
 * + `shell` are passed structurally so carapace needn't depend on electron.
 */
export function serveOs(ipcMain: OsIpcMainLike, options: ServeOsOptions): void {
  ipcMain.handle(OS_INVOKE_CHANNEL, async (_event, op, path) => {
    const real = options.resolve ? await options.resolve(path as string) : (path as string);
    switch (op as string) {
      case "reveal":
        options.shell.showItemInFolder(real);
        return undefined;
      case "realpath":
        return real;
      default:
        throw new Error(`Unknown os op: ${String(op)}`);
    }
  });
}
