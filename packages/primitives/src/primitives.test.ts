import { describe, it, expect } from "vitest";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";
import { Vector3I } from "./Vector3I";
import { Vector4 } from "./Vector4";
import { ColorF } from "./ColorF";
import { Color8 } from "./Color8";
import { Colors, namedColors } from "./Colors";
import { Rect2 } from "./Rect2";
import { Rect2I } from "./Rect2I";

describe("Vector3", () => {
  it("cross, dot, length", () => {
    expect(Vector3.right.cross(Vector3.up)).toEqual(new Vector3(0, 0, 1));
    expect(new Vector3(1, 2, 2).length()).toBe(3);
    expect(Vector3.up.dot(Vector3.right)).toBe(0);
  });
  it("Vector3I truncates and widens", () => {
    expect(new Vector3I(1.9, -1.9, 2.5)).toEqual(new Vector3I(1, -1, 2));
    expect(new Vector3I(3, 4, 0).toVector3()).toEqual(new Vector3(3, 4, 0));
  });
});

describe("Vector4", () => {
  it("arithmetic + length", () => {
    expect(new Vector4(1, 1, 1, 1).add(new Vector4(1, 2, 3, 4))).toEqual(new Vector4(2, 3, 4, 5));
    expect(new Vector4(1, 0, 0, 0).length()).toBe(1);
  });
});

describe("ColorF", () => {
  it("unpacks 0xRRGGBBAA in the right byte order", () => {
    const c = ColorF.fromRgba32(0x663399ff); // rebecca purple, opaque
    expect(c.r).toBeCloseTo(0x66 / 255);
    expect(c.g).toBeCloseTo(0x33 / 255);
    expect(c.b).toBeCloseTo(0x99 / 255);
    expect(c.a).toBe(1);
  });
  it("hex round-trips and converts to Color8", () => {
    expect(ColorF.fromHex("#663399").toHex(false)).toBe("#663399");
    expect(ColorF.fromRgba32(0x663399ff).toColor8()).toEqual(new Color8(102, 51, 153, 255));
  });
  it("lerp + luminance", () => {
    expect(ColorF.black.lerp(ColorF.white, 0.5)).toEqual(new ColorF(0.5, 0.5, 0.5, 1));
    expect(ColorF.white.luminance()).toBeCloseTo(1);
  });
});

describe("Color8", () => {
  it("clamps + truncates to a byte and round-trips through ColorF", () => {
    expect(new Color8(300, -5, 12.9, 255)).toEqual(new Color8(255, 0, 12, 255));
    expect(new Color8(255, 0, 0, 255).toColorF().toColor8()).toEqual(new Color8(255, 0, 0, 255));
  });
});

describe("Colors palette", () => {
  it("has all 142 named colors with exact values", () => {
    expect(Object.keys(Colors)).toHaveLength(142);
    expect(Colors.rebeccaPurple.toHex()).toBe("#663399ff");
    expect(Colors.white.toHex()).toBe("#ffffffff");
    expect(Colors.transparent.a).toBe(0);
  });
  it("supports case-insensitive name lookup", () => {
    expect(namedColors.get("rebeccapurple")).toBe(Colors.rebeccaPurple);
  });
});

describe("Rect2", () => {
  it("point containment (far edge exclusive)", () => {
    const r = Rect2.fromXYWH(0, 0, 10, 10);
    expect(r.hasPoint(new Vector2(5, 5))).toBe(true);
    expect(r.hasPoint(new Vector2(10, 10))).toBe(false);
  });
  it("intersection, merge, area", () => {
    const a = Rect2.fromXYWH(0, 0, 10, 10);
    const b = Rect2.fromXYWH(5, 5, 10, 10);
    expect(a.intersects(b)).toBe(true);
    expect(a.intersection(b).equals(Rect2.fromXYWH(5, 5, 5, 5))).toBe(true);
    expect(a.merge(b).equals(Rect2.fromXYWH(0, 0, 15, 15))).toBe(true);
    expect(a.area).toBe(100);
  });
  it("Rect2I integer rect widens", () => {
    expect(Rect2I.fromXYWH(0, 0, 4, 4).toRect2().equals(Rect2.fromXYWH(0, 0, 4, 4))).toBe(true);
  });
});
