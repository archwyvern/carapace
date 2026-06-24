import { WINDOW_INVOKE_CHANNEL } from "./protocol";

/** Structural subset of electron's `ipcMain`. */
export interface WindowIpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

/** Structural subset of electron's `BrowserWindow` (so carapace needn't depend on electron). */
export interface BrowserWindowLike {
  minimize(): void;
  maximize(): void;
  unmaximize(): void;
  isMaximized(): boolean;
  close(): void;
}

/**
 * Main-process server for the window-control seam: handles the renderer's minimize / toggle-
 * maximize / close / isMaximized requests against the current window. `getWindow` is read per
 * call, so it survives window recreation (Electron `activate`). Pair with `exposeWindow`
 * (preload) + `createIpcWindow` (renderer). `ipcMain` is passed structurally so carapace needn't
 * depend on electron. The app is responsible for creating the window with `frame: false`.
 */
export function serveWindow(ipcMain: WindowIpcMainLike, getWindow: () => BrowserWindowLike | null): void {
  ipcMain.handle(WINDOW_INVOKE_CHANNEL, (_event, op) => {
    const win = getWindow();
    switch (op as string) {
      case "minimize":
        win?.minimize();
        return undefined;
      case "toggleMaximize":
        if (win?.isMaximized()) win.unmaximize();
        else win?.maximize();
        return undefined;
      case "close":
        win?.close();
        return undefined;
      case "isMaximized":
        return win?.isMaximized() ?? false;
      default:
        throw new Error(`Unknown window op: ${String(op)}`);
    }
  });
}
