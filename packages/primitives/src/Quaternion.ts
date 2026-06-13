import { APPROX_EPSILON, clampScalar } from "./internal";
import { Vector3 } from "./Vector3";
import { EulerOrder } from "./EulerOrder";
import { Matrix3x3 } from "./Matrix3x3";

/**
 * Immutable quaternion for 3D orientation and smooth rotation interpolation. TS mirror of
 * `Primitives.Quaternion`. Avoids gimbal lock; the preferred rotation format for animation.
 */
export class Quaternion {
  constructor(
    readonly x = 0,
    readonly y = 0,
    readonly z = 0,
    readonly w = 1,
  ) {}

  static readonly identity = new Quaternion(0, 0, 0, 1);

  static fromArray(a: readonly number[]): Quaternion {
    return new Quaternion(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 1);
  }

  /** From a basis matrix (with reflection correction). */
  static fromMatrix(basis: Matrix3x3): Quaternion {
    return basis.getQuaternion();
  }

  /** From axis-angle. A zero axis yields the zero quaternion (matching C#). */
  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const d = axis.length();
    if (d === 0) return new Quaternion(0, 0, 0, 0);
    const half = angle * 0.5;
    const s = Math.sin(half) / d;
    return new Quaternion(axis.x * s, axis.y * s, axis.z * s, Math.cos(half));
  }

  /** The rotation carrying direction `arcFrom` onto `arcTo`. */
  static fromArc(arcFrom: Vector3, arcTo: Vector3): Quaternion {
    const almostOne = 0.99999975;
    const n0 = arcFrom.normalized();
    const n1 = arcTo.normalized();
    const d = n0.dot(n1);
    if (Math.abs(d) > almostOne) {
      if (d >= 0) return new Quaternion(0, 0, 0, 1);
      const axis = n0.getAnyPerpendicular();
      return new Quaternion(axis.x, axis.y, axis.z, 0);
    }
    const c = n0.cross(n1);
    const s = Math.sqrt((1 + d) * 2);
    const rs = 1 / s;
    return new Quaternion(c.x * rs, c.y * rs, c.z * rs, s * 0.5).normalized();
  }

  /** From Euler angles (radians) in YXZ order. */
  static fromEuler(eulerYXZ: Vector3): Quaternion {
    const halfA1 = eulerYXZ.y * 0.5;
    const halfA2 = eulerYXZ.x * 0.5;
    const halfA3 = eulerYXZ.z * 0.5;
    const sinA1 = Math.sin(halfA1);
    const cosA1 = Math.cos(halfA1);
    const sinA2 = Math.sin(halfA2);
    const cosA2 = Math.cos(halfA2);
    const sinA3 = Math.sin(halfA3);
    const cosA3 = Math.cos(halfA3);
    return new Quaternion(
      sinA1 * cosA2 * sinA3 + cosA1 * sinA2 * cosA3,
      sinA1 * cosA2 * cosA3 - cosA1 * sinA2 * sinA3,
      cosA1 * cosA2 * sinA3 - sinA1 * sinA2 * cosA3,
      sinA1 * sinA2 * sinA3 + cosA1 * cosA2 * cosA3,
    );
  }

  /** Component by index (0=x, 1=y, 2=z, 3=w). */
  getComponent(i: number): number {
    return i === 0 ? this.x : i === 1 ? this.y : i === 2 ? this.z : this.w;
  }

  dot(b: Quaternion): number {
    return this.x * b.x + this.y * b.y + this.z * b.z + this.w * b.w;
  }
  lengthSquared(): number {
    return this.dot(this);
  }
  length(): number {
    return Math.sqrt(this.lengthSquared());
  }
  normalized(): Quaternion {
    return this.div(this.length());
  }
  isNormalized(): boolean {
    return Math.abs(this.lengthSquared() - 1) < APPROX_EPSILON;
  }
  isFinite(): boolean {
    return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z) && Number.isFinite(this.w);
  }
  /** Inverse (conjugate for a unit quaternion). */
  inverse(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, this.w);
  }
  /** Angular distance to another quaternion, in radians. */
  angleTo(to: Quaternion): number {
    const d = this.dot(to);
    return Math.acos(clampScalar(d * d * 2 - 1, -1, 1));
  }
  /** Rotation angle, in radians. */
  getAngle(): number {
    return 2 * Math.acos(this.w);
  }
  /** Rotation axis. */
  getAxis(): Vector3 {
    if (Math.abs(this.w) > 1 - APPROX_EPSILON) return new Vector3(this.x, this.y, this.z);
    const r = 1 / Math.sqrt(1 - this.w * this.w);
    return new Vector3(this.x * r, this.y * r, this.z * r);
  }
  /** Euler angles (radians) in the given order (default YXZ). */
  getEuler(order: EulerOrder = EulerOrder.Yxz): Vector3 {
    return Matrix3x3.fromQuaternion(this).getEuler(order);
  }
  /** Quaternion exponential (logarithmic-map workflows). */
  exp(): Quaternion {
    let v = new Vector3(this.x, this.y, this.z);
    const theta = v.length();
    v = v.normalized();
    if (theta < APPROX_EPSILON || !v.isNormalized()) return new Quaternion(0, 0, 0, 1);
    return Quaternion.fromAxisAngle(v, theta);
  }
  /** Quaternion logarithm (logarithmic-map workflows). */
  log(): Quaternion {
    const v = this.getAxis().scale(this.getAngle());
    return new Quaternion(v.x, v.y, v.z, 0);
  }

  /** Quaternion product. */
  mul(right: Quaternion): Quaternion {
    return new Quaternion(
      this.w * right.x + this.x * right.w + this.y * right.z - this.z * right.y,
      this.w * right.y + this.y * right.w + this.z * right.x - this.x * right.z,
      this.w * right.z + this.z * right.w + this.x * right.y - this.y * right.x,
      this.w * right.w - this.x * right.x - this.y * right.y - this.z * right.z,
    );
  }
  /** Rotate a vector by this quaternion. */
  rotate(v: Vector3): Vector3 {
    const u = new Vector3(this.x, this.y, this.z);
    const uv = u.cross(v);
    return v.add(uv.scale(this.w).add(u.cross(uv)).scale(2));
  }
  /** Rotate a vector by the inverse of this quaternion. */
  rotateInv(v: Vector3): Vector3 {
    return this.inverse().rotate(v);
  }
  add(b: Quaternion): Quaternion {
    return new Quaternion(this.x + b.x, this.y + b.y, this.z + b.z, this.w + b.w);
  }
  sub(b: Quaternion): Quaternion {
    return new Quaternion(this.x - b.x, this.y - b.y, this.z - b.z, this.w - b.w);
  }
  neg(): Quaternion {
    return new Quaternion(-this.x, -this.y, -this.z, -this.w);
  }
  scale(s: number): Quaternion {
    return new Quaternion(this.x * s, this.y * s, this.z * s, this.w * s);
  }
  div(s: number): Quaternion {
    return this.scale(1 / s);
  }

  /** Spherical interpolation along the shorter arc. */
  slerp(to: Quaternion, weight: number): Quaternion {
    let cosom = this.dot(to);
    let to1: Quaternion;
    if (cosom < 0) {
      cosom = -cosom;
      to1 = to.neg();
    } else {
      to1 = to;
    }
    let scale0: number;
    let scale1: number;
    if (1 - cosom > APPROX_EPSILON) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      scale0 = Math.sin((1 - weight) * omega) / sinom;
      scale1 = Math.sin(weight * omega) / sinom;
    } else {
      scale0 = 1 - weight;
      scale1 = weight;
    }
    return new Quaternion(
      scale0 * this.x + scale1 * to1.x,
      scale0 * this.y + scale1 * to1.y,
      scale0 * this.z + scale1 * to1.z,
      scale0 * this.w + scale1 * to1.w,
    );
  }

  /** Spherical interpolation without shortest-path sign correction. */
  slerpni(to: Quaternion, weight: number): Quaternion {
    const dot = this.dot(to);
    if (Math.abs(dot) > 0.9999) return this;
    const theta = Math.acos(dot);
    const sinT = 1 / Math.sin(theta);
    const newFactor = Math.sin(weight * theta) * sinT;
    const invFactor = Math.sin((1 - weight) * theta) * sinT;
    return new Quaternion(
      invFactor * this.x + newFactor * to.x,
      invFactor * this.y + newFactor * to.y,
      invFactor * this.z + newFactor * to.z,
      invFactor * this.w + newFactor * to.w,
    );
  }

  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
  equals(o: Quaternion): boolean {
    return this.x === o.x && this.y === o.y && this.z === o.z && this.w === o.w;
  }
  isEqualApprox(o: Quaternion, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.x - o.x) < epsilon &&
      Math.abs(this.y - o.y) < epsilon &&
      Math.abs(this.z - o.z) < epsilon &&
      Math.abs(this.w - o.w) < epsilon
    );
  }
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }
}
