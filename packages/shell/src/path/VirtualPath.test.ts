import { describe, it, expect } from "vitest";
import { VirtualPath } from "./VirtualPath";

describe("VirtualPath parsing", () => {
  it("splits scheme and relative path", () => {
    const p = VirtualPath.from("core://data/armour.png");
    expect(p.scheme).toBe("core");
    expect(p.relativePath).toBe("data/armour.png");
    expect(p.name).toBe("armour.png");
    expect(p.extension).toBe(".png");
  });

  it("normalizes backslashes and trailing slashes", () => {
    expect(VirtualPath.from("core://data\\img\\").path).toBe("core://data/img");
  });

  it("requires a scheme", () => {
    expect(() => VirtualPath.from("data/x.png")).toThrow();
    expect(VirtualPath.tryFrom("data/x.png")).toBeNull();
  });

  it("collapses . and .. and rejects escapes", () => {
    expect(VirtualPath.from("core://a/b/../c").path).toBe("core://a/c");
    expect(() => VirtualPath.from("core://../escape")).toThrow();
  });

  it("parses a sub-resource fragment", () => {
    const p = VirtualPath.from("core://mat.vres#sub");
    expect(p.relativePath).toBe("mat.vres");
    expect(p.fragment).toBe("sub");
    expect(p.name).toBe("mat.vres");
  });
});

describe("VirtualPath join / parent (the scheme-root edge cases)", () => {
  it("combines at the scheme root without a double slash", () => {
    expect(VirtualPath.from("core://").combine("foo").path).toBe("core://foo");
    expect(VirtualPath.from("core://src").combine("foo").path).toBe("core://src/foo");
  });

  it("walks up to the scheme root", () => {
    expect(VirtualPath.from("core://src/a.ts").parent.path).toBe("core://src");
    expect(VirtualPath.from("core://a.ts").parent.path).toBe("core://"); // direct child of root → root
    expect(VirtualPath.from("core://").parent.path).toBe("core://");      // already at root
  });

  it("resolves relative paths web-style", () => {
    const base = VirtualPath.from("core://docs/index.html");
    expect(base.resolveRelative("style.css").path).toBe("core://docs/style.css");
    expect(base.resolveRelative("/root.css").path).toBe("core://root.css");
    expect(base.resolveRelative("other://x").path).toBe("other://x");
  });
});

describe("VirtualPath filename tags", () => {
  it("extracts and edits tags", () => {
    const p = VirtualPath.from("core://tex/armour.n.rough.png");
    expect(p.tags).toEqual([".n", ".rough"]);
    expect(p.fileNameWithoutTagsOrExtension).toBe("armour");
    expect(p.hasTag(".n")).toBe(true);
    expect(p.withoutTag(".n").path).toBe("core://tex/armour.rough.png");
    expect(p.withoutTags().path).toBe("core://tex/armour.png");
    expect(VirtualPath.from("core://tex/armour.png").withTag(".n").path).toBe("core://tex/armour.n.png");
    expect(p.changeExtension(".jpg").path).toBe("core://tex/armour.n.rough.jpg");
  });

  it("compares case-insensitively", () => {
    expect(VirtualPath.from("core://A.png").equals(VirtualPath.from("core://a.png"))).toBe(true);
  });
});
