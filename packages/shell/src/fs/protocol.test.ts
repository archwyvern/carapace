// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as os from "node:os";
import * as fsp from "node:fs/promises";
import * as nodePath from "node:path";
import { createNodeFs, serveFs } from "./node";
import type { IpcMainLike, WebContentsLike } from "./node";
import { createIpcFs } from "./client";
import { FS_INVOKE_CHANNEL, FS_EVENT_CHANNEL } from "./protocol";
import type { FsBridge, FsWatchEvent } from "./protocol";
import type { ChangeKind } from "../host/types";

/**
 * Stand up the full provider seam in-process: a fake IPC transport connecting
 * `serveFs` (main side) to `createIpcFs` (renderer side). This is the exact path a
 * desktop app (drydock) runs at runtime, minus electron — so it catches dispatch /
 * arg-shape / event-forwarding regressions the per-side unit tests can't.
 */
function connect(fs: Parameters<typeof serveFs>[2]) {
  let invoke: ((event: unknown, op: string, args: unknown[]) => unknown) | undefined;
  const ipcMain: IpcMainLike = {
    handle(channel, listener) {
      if (channel === FS_INVOKE_CHANNEL) invoke = listener as typeof invoke;
    },
  };
  const subscribers = new Set<(e: FsWatchEvent) => void>();
  const webContents: WebContentsLike = {
    send(channel, ...args) {
      if (channel === FS_EVENT_CHANNEL) for (const s of subscribers) s(args[0] as FsWatchEvent);
    },
  };
  serveFs(ipcMain, webContents, fs);
  const bridge: FsBridge = {
    invoke: (op, args) => Promise.resolve(invoke!({}, op, args as unknown[])),
    subscribe: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
  return createIpcFs(bridge);
}

describe("fs protocol round-trip (createIpcFs <-> serveFs <-> createNodeFs)", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "carapace-proto-"));
  });
  afterAll(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  it("drives create / list / read / rename / delete across the wire", async () => {
    const client = connect(createNodeFs());

    await client.createDir(nodePath.join(dir, "sub"));
    await client.createFile(nodePath.join(dir, "sub", "a.txt"), "hello");

    const list = await client.list(nodePath.join(dir, "sub"));
    expect(list.map((e) => e.name)).toEqual(["a.txt"]);
    expect(list[0]!.isDir).toBe(false);

    expect(await client.read(nodePath.join(dir, "sub", "a.txt"))).toBe("hello");

    await client.rename(nodePath.join(dir, "sub", "a.txt"), nodePath.join(dir, "sub", "b.txt"));
    expect(await client.read(nodePath.join(dir, "sub", "b.txt"))).toBe("hello");

    await client.delete(nodePath.join(dir, "sub", "b.txt"));
    await expect(client.read(nodePath.join(dir, "sub", "b.txt"))).rejects.toThrow();
  });
});

describe("fs protocol watch forwarding", () => {
  it("delivers provider watch events to the renderer client by id", () => {
    // A controllable provider so the test owns when (and what) the watch fires —
    // exercises serveFs's event forwarding + createIpcFs's id routing deterministically.
    let fire: ((p: string, kind: ChangeKind) => void) | undefined;
    const stub: Parameters<typeof serveFs>[2] = {
      read: async () => "",
      readBinary: async () => new Uint8Array(),
      write: async () => {},
      rename: async () => {},
      delete: async () => {},
      createFile: async () => {},
      createDir: async () => {},
      list: async () => [],
      watch: (_p, cb) => {
        fire = cb;
        return () => {
          fire = undefined;
        };
      },
    };
    const client = connect(stub);

    const seen: Array<[string, ChangeKind]> = [];
    const stop = client.watch("/dir", (p, kind) => seen.push([p, kind]));

    fire!("/dir/new.txt", "created");
    expect(seen).toEqual([["/dir/new.txt", "created"]]);

    stop();
    expect(fire).toBeUndefined(); // unwatch reached the provider
  });
});
