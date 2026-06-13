import { describe, it, expect } from "vitest";
import { Vector2 } from "./Vector2";
import { Vector2I } from "./Vector2I";

describe("Vector2", () => {
  it("does arithmetic immutably", () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);
    expect(a.add(b)).toEqual(new Vector2(4, 6));
    expect(b.sub(a)).toEqual(new Vector2(2, 2));
    expect(a.scale(2)).toEqual(new Vector2(2, 4));
    expect(a.mul(b)).toEqual(new Vector2(3, 8));
    expect(a.neg()).toEqual(new Vector2(-1, -2));
    expect(a).toEqual(new Vector2(1, 2)); // unchanged
  });

  it("computes length, dot, cross, distance", () => {
    expect(new Vector2(3, 4).length()).toBe(5);
    expect(new Vector2(3, 4).lengthSquared()).toBe(25);
    expect(new Vector2(1, 0).dot(new Vector2(0, 1))).toBe(0);
    expect(new Vector2(1, 0).cross(new Vector2(0, 1))).toBe(1);
    expect(new Vector2(0, 0).distanceTo(new Vector2(3, 4))).toBe(5);
  });

  it("normalizes (and guards the zero vector)", () => {
    expect(new Vector2(0, 5).normalized()).toEqual(new Vector2(0, 1));
    expect(new Vector2(0, 0).normalized()).toEqual(Vector2.zero);
    expect(new Vector2(3, 4).normalized().isNormalized()).toBe(true);
  });

  it("angle + rotated", () => {
    expect(new Vector2(1, 0).angle()).toBeCloseTo(0);
    expect(Vector2.right.rotated(Math.PI / 2).isEqualApprox(new Vector2(0, 1))).toBe(true);
  });

  it("lerp, clamp, abs, round-trips arrays", () => {
    expect(new Vector2(0, 0).lerp(new Vector2(10, 20), 0.5)).toEqual(new Vector2(5, 10));
    expect(new Vector2(-5, 5).clamp(new Vector2(0, 0), new Vector2(3, 3))).toEqual(new Vector2(0, 3));
    expect(new Vector2(-2, 3).abs()).toEqual(new Vector2(2, 3));
    expect(Vector2.fromArray([7, 8]).toArray()).toEqual([7, 8]);
  });

  it("equals + approx", () => {
    expect(new Vector2(1, 2).equals(new Vector2(1, 2))).toBe(true);
    expect(new Vector2(1, 2).isEqualApprox(new Vector2(1 + 1e-9, 2))).toBe(true);
    expect(new Vector2(1, 2).toString()).toBe("(1, 2)");
  });
});

describe("Vector2I", () => {
  it("truncates components toward zero on construction", () => {
    expect(new Vector2I(3.9, -2.9)).toEqual(new Vector2I(3, -2));
    expect(Vector2I.fromArray([1.5, 2.5]).toArray()).toEqual([1, 2]);
  });

  it("stays integral through arithmetic, with integer division", () => {
    expect(new Vector2I(7, 5).div(2)).toEqual(new Vector2I(3, 2));
    expect(new Vector2I(-7, 5).div(2)).toEqual(new Vector2I(-3, 2)); // toward zero
    expect(new Vector2I(2, 3).add(new Vector2I(1, 1))).toEqual(new Vector2I(3, 4));
  });

  it("length is real, widening yields a Vector2", () => {
    expect(new Vector2I(3, 4).length()).toBe(5);
    expect(new Vector2I(3, 4).toVector2()).toEqual(new Vector2(3, 4));
  });
});
