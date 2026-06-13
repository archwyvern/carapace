import { createMemoryHost } from "./memoryHost";

test("write then read returns the written data", async () => {
  const host = createMemoryHost();
  await host.fs.write("/a.txt", "hello");
  expect(await host.fs.read("/a.txt")).toBe("hello");
});

test("rename moves content and removes the old path", async () => {
  const host = createMemoryHost();
  await host.fs.write("/a.txt", "x");
  await host.fs.rename("/a.txt", "/b.txt");
  expect(await host.fs.read("/b.txt")).toBe("x");
  await expect(host.fs.read("/a.txt")).rejects.toThrow();
});

test("watch fires on write and unsubscribe stops it", async () => {
  const host = createMemoryHost();
  const events: string[] = [];
  const unsub = host.fs.watch("/", (p, kind) => events.push(`${kind}:${p}`));
  await host.fs.write("/a.txt", "1");
  expect(events).toContain("created:/a.txt");
  unsub();
  await host.fs.write("/b.txt", "2");
  expect(events).not.toContain("created:/b.txt");
});

test("window.toggleMaximize flips isMaximized and notifies", async () => {
  const host = createMemoryHost();
  const seen: boolean[] = [];
  host.window.onMaximizeChanged((m) => seen.push(m));
  expect(await host.window.isMaximized()).toBe(false);
  await host.window.toggleMaximize();
  expect(await host.window.isMaximized()).toBe(true);
  expect(seen).toEqual([true]);
});

test("list returns immediate children with derived directories", async () => {
  const host = createMemoryHost({
    "/src/main.tsx": "",
    "/src/app.css": "",
    "/README.md": "",
  });
  const root = await host.fs.list("/");
  expect(root.map((e) => `${e.name}:${e.isDir}`).sort()).toEqual([
    "README.md:false",
    "src:true",
  ]);
  const src = await host.fs.list("/src");
  expect(src.map((e) => e.name).sort()).toEqual(["app.css", "main.tsx"]);
});
