import { describe, expect, it } from "vitest";
import { Transform3D } from "./Transform3D";
import { Matrix3x3 } from "./Matrix3x3";
import { Vector3 } from "./Vector3";

describe("Transform3D", () => {
  it("transforms a point by basis + origin", () => {
    const t = new Transform3D(Matrix3x3.fromScale(new Vector3(2, 2, 2)), new Vector3(1, 0, -3));
    expect(t.transform(new Vector3(1, 1, 1)).isEqualApprox(new Vector3(3, 2, -1))).toBe(true);
  });

  it("inverse round-trips an orthonormal transform", () => {
    const t = new Transform3D(Matrix3x3.fromAxisAngle(Vector3.up, Math.PI / 3), new Vector3(4, -2, 5));
    const p = new Vector3(2, 7, -1);
    expect(t.inverse().transform(t.transform(p)).isEqualApprox(p)).toBe(true);
  });

  it("affineInverse round-trips a scaled transform", () => {
    const t = new Transform3D(Matrix3x3.fromScale(new Vector3(2, 3, 0.5)), new Vector3(1, 2, 3));
    const p = new Vector3(-3, 4, 6);
    expect(t.affineInverse().transform(t.transform(p)).isEqualApprox(p)).toBe(true);
  });

  it("composes translations", () => {
    const a = Transform3D.identity.translated(new Vector3(1, 0, 0));
    const b = Transform3D.identity.translated(new Vector3(0, 2, 0));
    expect(a.mul(b).origin.isEqualApprox(new Vector3(1, 2, 0))).toBe(true);
  });

  it("interpolates endpoints back to themselves", () => {
    const a = new Transform3D(Matrix3x3.fromAxisAngle(Vector3.up, 0.4), new Vector3(1, 2, 3));
    const b = new Transform3D(Matrix3x3.fromAxisAngle(Vector3.right, 1.1), new Vector3(-2, 0, 4));
    expect(a.interpolateWith(b, 0).isEqualApprox(a, 1e-5)).toBe(true);
    expect(a.interpolateWith(b, 1).isEqualApprox(b, 1e-5)).toBe(true);
  });
});
