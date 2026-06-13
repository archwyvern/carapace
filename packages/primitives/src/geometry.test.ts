import { describe, it, expect } from "vitest";
import { Vector2 } from "./Vector2";
import { Vector3 } from "./Vector3";
import { Matrix2x2 } from "./Matrix2x2";
import { Matrix3x3 } from "./Matrix3x3";
import { Matrix4x4 } from "./Matrix4x4";
import { Rotation2D } from "./Rotation2D";
import { Transform2D } from "./Transform2D";
import { Quaternion } from "./Quaternion";
import { EulerOrder } from "./EulerOrder";
import { Aabb2D } from "./Aabb2D";
import { Aabb3D } from "./Aabb3D";
import { Plane2D } from "./Plane2D";
import { Plane3D } from "./Plane3D";
import { Circle } from "./Circle";
import { Arc } from "./Arc";
import { Segment2D } from "./Segment2D";
import { Capsule2D } from "./Capsule2D";
import { Capsule3D } from "./Capsule3D";
import { Rect2 } from "./Rect2";

describe("Matrix2x2", () => {
  it("rotation basis maps axes and composes", () => {
    const r = Matrix2x2.fromAngle(Math.PI / 2);
    expect(r.transform(Vector2.right).isEqualApprox(new Vector2(0, 1))).toBe(true);
    expect(r.mulMatrix(r.transposed()).isEqualApprox(Matrix2x2.identity)).toBe(true);
  });
  it("inverse and determinant", () => {
    const m = Matrix2x2.fromElements(2, 0, 0, 4);
    expect(m.determinant()).toBe(8);
    expect(m.inverse().isEqualApprox(Matrix2x2.fromElements(0.5, 0, 0, 0.25))).toBe(true);
    expect(m.inverseOrZero().isEqualApprox(m.inverse())).toBe(true);
  });
  it("solve recovers x for m*x=b", () => {
    const m = Matrix2x2.fromElements(2, 1, 1, 3);
    const x = new Vector2(3, -2);
    const b = m.transform(x);
    expect(m.solve(b).isEqualApprox(x)).toBe(true);
  });
});

describe("Rotation2D", () => {
  it("round-trips angle and applies to vectors", () => {
    const r = Rotation2D.fromAngle(Math.PI / 3);
    expect(r.angle()).toBeCloseTo(Math.PI / 3);
    expect(r.isNormalized()).toBe(true);
    expect(r.rotate(Vector2.right).isEqualApprox(Vector2.fromAngle(Math.PI / 3))).toBe(true);
  });
  it("compose then inverse is identity-ish", () => {
    const a = Rotation2D.fromAngle(0.7);
    const b = Rotation2D.fromAngle(-0.7);
    expect(a.mul(b).isEqualApprox(Rotation2D.identity)).toBe(true);
    expect(a.rotateInv(a.rotate(Vector2.right)).isEqualApprox(Vector2.right)).toBe(true);
  });
  it("slerp endpoints", () => {
    const a = Rotation2D.fromAngle(0);
    const b = Rotation2D.fromAngle(1);
    expect(Rotation2D.slerp(a, b, 0).isEqualApprox(a)).toBe(true);
    expect(Rotation2D.slerp(a, b, 1).isEqualApprox(b)).toBe(true);
    expect(Rotation2D.slerp(a, b, 0.5).angle()).toBeCloseTo(0.5);
  });
});

describe("Transform2D", () => {
  it("composes translation + rotation", () => {
    const t = Transform2D.fromRotation(Math.PI / 2, new Vector2(10, 0));
    expect(t.transform(new Vector2(1, 0)).isEqualApprox(new Vector2(10, 1))).toBe(true);
  });
  it("affine inverse undoes the transform", () => {
    const t = Transform2D.fromRotationScaleSkew(0.5, new Vector2(2, 3), 0.1, new Vector2(4, -1));
    const p = new Vector2(7, 9);
    expect(t.affineInverse().transform(t.transform(p)).isEqualApprox(p)).toBe(true);
  });
  it("extracts rotation/scale", () => {
    const t = Transform2D.fromRotationScaleSkew(0.4, new Vector2(2, 5), 0, Vector2.zero);
    expect(t.rotation).toBeCloseTo(0.4);
    expect(t.scale.isEqualApprox(new Vector2(2, 5))).toBe(true);
  });
  it("transforms a rect to a conservative AABB", () => {
    const t = Transform2D.fromRotation(Math.PI / 2, Vector2.zero);
    const r = t.mulRect(Rect2.fromXYWH(0, 0, 2, 4));
    expect(r.size.isEqualApprox(new Vector2(4, 2))).toBe(true);
  });
});

describe("Quaternion", () => {
  it("axis-angle rotates a vector", () => {
    const q = Quaternion.fromAxisAngle(Vector3.up, Math.PI / 2);
    expect(q.isNormalized()).toBe(true);
    expect(q.rotate(Vector3.right).isEqualApprox(Vector3.forward)).toBe(true);
  });
  it("round-trips through Matrix3x3", () => {
    const q = Quaternion.fromAxisAngle(new Vector3(1, 2, 3).normalized(), 1.1);
    const back = Matrix3x3.fromQuaternion(q).getQuaternion();
    expect(back.isEqualApprox(q) || back.neg().isEqualApprox(q)).toBe(true);
  });
  it("euler round-trip (YXZ)", () => {
    const euler = new Vector3(0.3, -0.6, 0.2);
    const q = Quaternion.fromEuler(euler);
    expect(q.getEuler(EulerOrder.Yxz).isEqualApprox(euler, 1e-5)).toBe(true);
  });
  it("slerp endpoints + inverse", () => {
    const a = Quaternion.fromAxisAngle(Vector3.up, 0);
    const b = Quaternion.fromAxisAngle(Vector3.up, 1);
    expect(a.slerp(b, 0).isEqualApprox(a)).toBe(true);
    expect(a.slerp(b, 1).isEqualApprox(b)).toBe(true);
    expect(b.rotateInv(b.rotate(Vector3.right)).isEqualApprox(Vector3.right)).toBe(true);
  });
});

describe("Matrix3x3", () => {
  it("columns are the basis axes; identity is neutral", () => {
    expect(Matrix3x3.identity.x.equals(Vector3.right)).toBe(true);
    expect(Matrix3x3.identity.transform(new Vector3(1, 2, 3)).equals(new Vector3(1, 2, 3))).toBe(true);
  });
  it("rotation basis is orthonormal and invertible", () => {
    const m = Matrix3x3.fromAxisAngle(Vector3.up, 0.8);
    expect(m.determinant()).toBeCloseTo(1);
    expect(m.inverse().mulMatrix(m).isEqualApprox(Matrix3x3.identity)).toBe(true);
    expect(m.transposed().isEqualApprox(m.inverse())).toBe(true);
  });
});

describe("Matrix4x4", () => {
  it("identity transform and inverse", () => {
    expect(Matrix4x4.identity.transformPoint(new Vector3(1, 2, 3)).equals(new Vector3(1, 2, 3))).toBe(true);
    const m = Matrix4x4.createTranslation(2, 3, 4).mulMatrix(Matrix4x4.createScale(2, 2, 2));
    expect(m.inverse().mulMatrix(m).isEqualApprox(Matrix4x4.identity)).toBe(true);
  });
  it("perspective is non-orthogonal, ortho is", () => {
    expect(Matrix4x4.createPerspective(1, 1.5, 0.1, 100).isOrthogonal()).toBe(false);
    expect(Matrix4x4.createOrthogonal(-1, 1, -1, 1, 0.1, 100).isOrthogonal()).toBe(true);
  });
  it("singular matrix inverts to zero", () => {
    expect(Matrix4x4.createScale(0, 0, 0).inverse().equals(Matrix4x4.zero)).toBe(true);
  });
});

describe("Aabb2D / Aabb3D", () => {
  it("2D point containment, merge, segment", () => {
    const box = Aabb2D.fromXYWH(0, 0, 10, 10);
    expect(box.hasPoint(new Vector2(5, 5))).toBe(true);
    expect(box.intersectsSegment(new Vector2(-5, 5), new Vector2(5, 5))).toBe(true);
    expect(box.merge(Aabb2D.fromXYWH(10, 10, 5, 5)).equals(Aabb2D.fromMinMax(Vector2.zero, new Vector2(15, 15)))).toBe(true);
    expect(box.toRect2().equals(Rect2.fromXYWH(0, 0, 10, 10))).toBe(true);
  });
  it("3D volume, longest axis, plane projection", () => {
    const box = Aabb3D.fromPositionSize(Vector3.zero, new Vector3(1, 4, 2));
    expect(box.volume).toBe(8);
    expect(box.getLongestAxisIndex()).toBe(1);
    expect(box.intersectsPlane(new Plane3D(Vector3.up, 2))).toBe(true);
  });
});

describe("Plane2D / Plane3D", () => {
  it("2D distance, projection, line intersection", () => {
    const p = new Plane2D(new Vector2(1, 0), 5);
    expect(p.distanceTo(new Vector2(8, 0))).toBe(3);
    expect(p.project(new Vector2(8, 2)).isEqualApprox(new Vector2(5, 2))).toBe(true);
    const hit = new Plane2D(new Vector2(1, 0), 0).intersect(new Plane2D(new Vector2(0, 1), 0));
    expect(hit?.isEqualApprox(Vector2.zero)).toBe(true);
  });
  it("3D three-plane intersection + ray", () => {
    const hit = Plane3D.planeYZ.intersect3(Plane3D.planeXZ, Plane3D.planeXY);
    expect(hit?.isEqualApprox(Vector3.zero)).toBe(true);
    const ray = new Plane3D(Vector3.up, 0).intersectsRay(new Vector3(0, 5, 0), Vector3.down);
    expect(ray?.isEqualApprox(Vector3.zero)).toBe(true);
  });
});

describe("Circle / Arc", () => {
  it("circle containment, closest point, area", () => {
    const c = new Circle(Vector2.zero, 5);
    expect(c.area).toBeCloseTo(Math.PI * 25);
    expect(c.containsPoint(new Vector2(3, 4))).toBe(true);
    expect(c.closestPoint(new Vector2(10, 0)).isEqualApprox(new Vector2(5, 0))).toBe(true);
    expect(c.tessellate(8)).toHaveLength(8);
  });
  it("arc endpoints, angle range, tessellate count", () => {
    const arc = new Arc(Vector2.zero, 2, 0, Math.PI / 2);
    expect(arc.startPoint.isEqualApprox(new Vector2(2, 0))).toBe(true);
    expect(arc.endPoint.isEqualApprox(new Vector2(0, 2))).toBe(true);
    expect(arc.containsAngle(Math.PI / 4)).toBe(true);
    expect(arc.containsAngle(Math.PI)).toBe(false);
    expect(arc.tessellate(4)).toHaveLength(5);
  });
});

describe("Segment2D / Capsule2D / Capsule3D", () => {
  it("segment closest point + distance", () => {
    const s = new Segment2D(Vector2.zero, new Vector2(10, 0));
    expect(s.closestPoint(new Vector2(5, 5)).isEqualApprox(new Vector2(5, 0))).toBe(true);
    expect(s.distanceToPoint(new Vector2(5, 3))).toBe(3);
    expect(s.length).toBe(10);
  });
  it("capsule2D containment + intersection", () => {
    const cap = new Capsule2D(Vector2.zero, new Vector2(10, 0), 2);
    expect(cap.containsPoint(new Vector2(5, 1))).toBe(true);
    expect(cap.containsPoint(new Vector2(5, 3))).toBe(false);
    expect(cap.intersects(new Capsule2D(new Vector2(5, 3), new Vector2(5, 10), 2))).toBe(true);
  });
  it("capsule3D distance + aabb", () => {
    const cap = new Capsule3D(Vector3.zero, new Vector3(0, 10, 0), 1);
    expect(cap.distanceToPoint(new Vector3(3, 5, 0))).toBeCloseTo(2);
    expect(cap.getAabb().min.isEqualApprox(new Vector3(-1, -1, -1))).toBe(true);
    expect(cap.getAabb().max.isEqualApprox(new Vector3(1, 11, 1))).toBe(true);
  });
});
