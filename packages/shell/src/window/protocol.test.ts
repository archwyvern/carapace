import { describe, expect, test } from "vitest";
import { serveWindow } from "./node";
import { createIpcWindow } from "./client";
import { WINDOW_INVOKE_CHANNEL } from "./protocol";
import type { WindowBridge } from "./protocol";

describe("window seam", () => {
  test("serveWindow <-> createIpcWindow round-trip drives the window", async () => {
    // Fake window tracking control calls + maximize state.
    let maximized = false;
    const calls: string[] = [];
    const win = {
      minimize: () => void calls.push("minimize"),
      maximize: () => {
        maximized = true;
      },
      unmaximize: () => {
        maximized = false;
      },
      isMaximized: () => maximized,
      close: () => void calls.push("close"),
    };

    // Fake ipcMain capturing the single invoke handler (as electron's would).
    let handler!: (event: unknown, op: string) => unknown;
    const ipcMain = {
      handle: (channel: string, h: (event: unknown, ...args: unknown[]) => unknown) => {
        expect(channel).toBe(WINDOW_INVOKE_CHANNEL);
        handler = h as typeof handler;
      },
    };
    serveWindow(ipcMain, () => win);

    // Bridge routing invoke() to the captured handler (the preload/ipcRenderer's job).
    const bridge: WindowBridge = { invoke: (op) => Promise.resolve(handler({}, op)) };
    const host = createIpcWindow(bridge);

    host.minimize();
    await Promise.resolve();
    expect(calls).toContain("minimize");

    expect(await host.isMaximized()).toBe(false);
    await host.toggleMaximize();
    expect(await host.isMaximized()).toBe(true);
    await host.toggleMaximize();
    expect(await host.isMaximized()).toBe(false);

    host.close();
    await Promise.resolve();
    expect(calls).toContain("close");

    // onMaximizeChanged is an inert no-op that still returns an unsubscribe.
    expect(typeof host.onMaximizeChanged(() => {})).toBe("function");
  });
});
