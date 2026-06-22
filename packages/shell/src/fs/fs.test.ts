// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as os from "node:os";
import * as fsp from "node:fs/promises";
import * as nodePath from "node:path";
import { createNodeFs } from "./node";
import { createIpcFs } from "./client";
import type { FsBridge, FsWatchEvent } from "./protocol";

describe("createNodeFs", () => {
  const fs = createNodeFs();
  let dir = "";
  beforeAll(async () => {
    dir = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "carapace-fs-"));
  });
  afterAll(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  it("creates, lists, reads, renames, and deletes", async () => {
    await fs.createDir(nodePath.join(dir, "sub"));
    await fs.createFile(nodePath.join(dir, "a.txt"), "hello");
    const list = await fs.list(dir);
    expect(list.map((e) => e.name).sort()).toEqual(["a.txt", "sub"]);
    expect(list.find((e) => e.name === "sub")!.isDir).toBe(true);
    expect(await fs.read(nodePath.join(dir, "a.txt"))).toBe("hello");
    await fs.rename(nodePath.join(dir, "a.txt"), nodePath.join(dir, "b.txt"));
    expect(await fs.read(nodePath.join(dir, "b.txt"))).toBe("hello");
    await fs.delete(nodePath.join(dir, "b.txt"));
    await expect(fs.read(nodePath.join(dir, "b.txt"))).rejects.toThrow();
  });

  it("writes and reads back raw bytes via createFile", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    await fs.createFile(nodePath.join(dir, "img.bin"), bytes);
    const round = await fsp.readFile(nodePath.join(dir, "img.bin"));
    expect(new Uint8Array(round)).toEqual(bytes);
  });
});

describe("createNodeFs with mounts (virtual paths)", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await fsp.mkdtemp(nodePath.join(os.tmpdir(), "carapace-mnt-"));
  });
  afterAll(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  it("translates a scheme to its mounted dir and re-virtualizes results", async () => {
    const fs = createNodeFs({ mounts: { core: dir } });
    await fs.createDir("core://sub");
    await fs.createFile("core://sub/a.txt", "hi");
    const list = await fs.list("core://sub");
    expect(list.map((e) => e.path)).toEqual(["core://sub/a.txt"]);
    expect(await fs.read("core://sub/a.txt")).toBe("hi");
    // ...and it really wrote under the mount dir:
    expect(await fsp.readFile(nodePath.join(dir, "sub/a.txt"), "utf-8")).toBe("hi");
  });
});

describe("createIpcFs", () => {
  it("forwards ops to the bridge and routes watch events by id", async () => {
    const calls: Array<[string, unknown[]]> = [];
    let emit: (e: FsWatchEvent) => void = () => {};
    const bridge: FsBridge = {
      invoke: async (op, args) => {
        calls.push([op, args]);
        return op === "read" ? "x" : op === "list" ? [] : undefined;
      },
      subscribe: (cb) => {
        emit = cb;
        return () => {};
      },
    };
    const fs = createIpcFs(bridge);

    expect(await fs.read("/a")).toBe("x");
    expect(calls).toContainEqual(["read", ["/a"]]);

    const seen: string[] = [];
    const stop = fs.watch("/dir", (p) => seen.push(p));
    emit({ watchId: 1, path: "/dir/new.txt", kind: "created" });
    expect(seen).toEqual(["/dir/new.txt"]);
    stop();
    emit({ watchId: 1, path: "/dir/after.txt", kind: "created" });
    expect(seen).toEqual(["/dir/new.txt"]); // unsubscribed — no further routing
    expect(calls.some(([op]) => op === "watch")).toBe(true);
    expect(calls.some(([op]) => op === "unwatch")).toBe(true);
  });
});
