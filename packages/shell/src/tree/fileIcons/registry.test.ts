import { describe, expect, test } from "vitest";
import { FileIconRegistry, registerFileIcons, resolveFileIcon } from "./registry";

const A = { code: 101, color: "#aa0000" };
const B = { code: 102, color: "#00bb00" };
const C = { code: 103, color: "#0000cc" };

describe("FileIconRegistry", () => {
  test("resolves a known extension from the Seti base", () => {
    const r = new FileIconRegistry();
    const ts = r.resolve("main.ts");
    expect(ts).not.toBeNull();
    expect(r.resolve("other.ts")).toEqual(ts);
  });

  test("exact filename beats an extension match", () => {
    const r = new FileIconRegistry();
    r.register({ fileNames: { "special.json": A } });
    expect(r.resolve("special.json")).toEqual(A);
    expect(r.resolve("plain.json")).not.toEqual(A);
  });

  test("longest matching extension wins", () => {
    const r = new FileIconRegistry();
    r.register({ extensions: { ts: A, "d.ts": B } });
    expect(r.resolve("types.d.ts")).toEqual(B);
    expect(r.resolve("main.ts")).toEqual(A);
  });

  test("an override beats the base glyph at the same extension", () => {
    const r = new FileIconRegistry();
    const base = r.resolve("a.ts");
    r.register({ extensions: { ts: A } });
    expect(r.resolve("a.ts")).toEqual(A);
    expect(A).not.toEqual(base);
  });

  test("a leading dot in a registration is normalized away", () => {
    const r = new FileIconRegistry();
    r.register({ extensions: { ".vlshader": A } });
    expect(r.resolve("ship.vlshader")).toEqual(A);
  });

  test("unknown files fall back to the default, which is overridable", () => {
    const r = new FileIconRegistry();
    expect(r.resolve("mystery.zzqqx")).not.toBeNull();
    r.register({ default: C });
    expect(r.resolve("mystery.zzqqx")).toEqual(C);
    expect(r.resolve("noextatall")).toEqual(C);
  });

  test("a Seti glyph reference resolves by id with an optional colour override", () => {
    const r = new FileIconRegistry();
    r.register({ extensions: { vres: { seti: "_godot", color: "#7ec699" } } });
    const spec = r.resolve("ship.vres");
    expect(spec).not.toBeNull();
    expect(spec!.color).toBe("#7ec699");
    expect(spec!.code).toBe(r.resolve("scene.gd")!.code); // _godot glyph shared with .gd
  });

  test("the global registry resolves through registerFileIcons / resolveFileIcon", () => {
    registerFileIcons({ extensions: { carapacetestext: A } });
    expect(resolveFileIcon("z.carapacetestext")).toEqual(A);
  });
});
