import { describe, expect, test } from "vitest";
import { serveOs } from "./node";
import { createIpcOs } from "./client";
import { OS_INVOKE_CHANNEL } from "./protocol";
import type { OsBridge } from "./protocol";

describe("os seam", () => {
  test("serveOs <-> createIpcOs round-trip resolves the path then reveals it", async () => {
    // Fake electron shell recording revealed real paths.
    const revealed: string[] = [];
    const shell = { showItemInFolder: (p: string) => void revealed.push(p) };

    // Fake ipcMain capturing the single invoke handler (as electron's would).
    let handler!: (event: unknown, op: string, path: string) => unknown;
    const ipcMain = {
      handle: (channel: string, h: (event: unknown, ...args: unknown[]) => unknown) => {
        expect(channel).toBe(OS_INVOKE_CHANNEL);
        handler = h as typeof handler;
      },
    };
    // Adapter mapping a virtual path to a real OS path (a virtual-path app's job, e.g. drydock).
    serveOs(ipcMain, { shell, resolve: (p) => p.replace("core://", "/project/") });

    // Bridge routing invoke() to the captured handler (the preload/ipcRenderer's job).
    const bridge: OsBridge = { invoke: (op, path) => Promise.resolve(handler({}, op, path)) };
    const host = createIpcOs(bridge);

    await host.reveal("core://ships/zarha.sfx");
    expect(revealed).toEqual(["/project/ships/zarha.sfx"]);

    // realpath returns the adapter-resolved real path (what "Copy Absolute Path" copies).
    expect(await host.realpath("core://ships/zarha.sfx")).toBe("/project/ships/zarha.sfx");
  });

  test("serveOs without an adapter reveals the path as-is", async () => {
    const revealed: string[] = [];
    const shell = { showItemInFolder: (p: string) => void revealed.push(p) };
    let handler!: (event: unknown, op: string, path: string) => unknown;
    const ipcMain = {
      handle: (_channel: string, h: (event: unknown, ...args: unknown[]) => unknown) => {
        handler = h as typeof handler;
      },
    };
    serveOs(ipcMain, { shell });

    const bridge: OsBridge = { invoke: (op, path) => Promise.resolve(handler({}, op, path)) };
    const host = createIpcOs(bridge);
    await host.reveal("/home/u/notes.txt");
    expect(revealed).toEqual(["/home/u/notes.txt"]);
    expect(await host.realpath("/home/u/notes.txt")).toBe("/home/u/notes.txt");
  });

  test("serveOs rejects an unknown op", async () => {
    const shell = { showItemInFolder: () => {} };
    let handler!: (event: unknown, op: string, path: string) => unknown;
    const ipcMain = {
      handle: (_channel: string, h: (event: unknown, ...args: unknown[]) => unknown) => {
        handler = h as typeof handler;
      },
    };
    serveOs(ipcMain, { shell });
    await expect(Promise.resolve(handler({}, "bogus", "x"))).rejects.toThrow(/Unknown os op/);
  });
});
