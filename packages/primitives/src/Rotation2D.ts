import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";
import { Matrix2x2 } from "./Matrix2x2";

/**
 * Immutable 2D rotation stored as a unit complex number (`c` = cosine, `s` = sine). TS mirror
 * of `Primitives.Rotation2D` — the 2D analog of `Quaternion`. Composes and slerps without trig.
 */
export class Rotation2D {
  constructor(
    readonly c = 1,
    readonly s = 0,
  ) {}

  static readonly identity = new Rotation2D(1, 0);

  /** Build from an angle in radians (counter-clockwise). */
  static fromAngle(angle: number): Rotation2D {
    return new Rotation2D(Math.cos(angle), Math.sin(angle));
  }

  /** The rotation carrying unit vector `from` onto unit vector `to`. */
  static betweenUnitVectors(from: Vector2, to: Vector2): Rotation2D {
    return new Rotation2D(from.dot(to), from.cross(to)).normalized();
  }

  /** Linear interpolation followed by renormalization. */
  static nlerp(from: Rotation2D, to: Rotation2D, weight: number): Rotation2D {
    const c = from.c + (to.c - from.c) * weight;
    const s = from.s + (to.s - from.s) * weight;
    return new Rotation2D(c, s).normalized();
  }

  /** Spherical interpolation along the shorter arc. */
  static slerp(from: Rotation2D, to: Rotation2D, weight: number): Rotation2D {
    let dot = from.c * to.c + from.s * to.s;
    const toC = dot < 0 ? -to.c : to.c;
    const toS = dot < 0 ? -to.s : to.s;
    dot = Math.abs(dot);
    if (dot > 0.9995) return Rotation2D.nlerp(from, new Rotation2D(toC, toS), weight);
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const a = Math.sin((1 - weight) * theta) / sinTheta;
    const b = Math.sin(weight * theta) / sinTheta;
    return new Rotation2D(a * from.c + b * toC, a * from.s + b * toS);
  }

  /** Recover the angle in radians. */
  angle(): number {
    return Math.atan2(this.s, this.c);
  }
  lengthSquared(): number {
    return this.c * this.c + this.s * this.s;
  }
  isNormalized(tolerance = APPROX_EPSILON): boolean {
    return Math.abs(this.lengthSquared() - 1) <= tolerance;
  }
  /** Unit-length copy. Throws if zero. */
  normalized(): Rotation2D {
    const len = Math.sqrt(this.lengthSquared());
    if (len <= APPROX_EPSILON) throw new Error("Cannot normalize a zero rotation.");
    const inv = 1 / len;
    return new Rotation2D(this.c * inv, this.s * inv);
  }
  /** Inverse rotation (conjugate for a unit rotation). */
  inverse(): Rotation2D {
    return new Rotation2D(this.c, -this.s);
  }
  /** First basis column (image of (1, 0)). */
  toColumnX(): Vector2 {
    return new Vector2(this.c, this.s);
  }
  /** Second basis column (image of (0, 1)). */
  toColumnY(): Vector2 {
    return new Vector2(-this.s, this.c);
  }
  /** Promote to an equivalent 2x2 rotation matrix. */
  toMatrix(): Matrix2x2 {
    return new Matrix2x2(this.toColumnX(), this.toColumnY());
  }

  /** Compose two rotations (complex multiplication). */
  mul(b: Rotation2D): Rotation2D {
    return new Rotation2D(this.c * b.c - this.s * b.s, this.s * b.c + this.c * b.s);
  }
  /** Apply the rotation to a vector. */
  rotate(v: Vector2): Vector2 {
    return new Vector2(this.c * v.x - this.s * v.y, this.s * v.x + this.c * v.y);
  }
  /** Apply the inverse rotation to a vector. */
  rotateInv(v: Vector2): Vector2 {
    return new Vector2(this.c * v.x + this.s * v.y, -this.s * v.x + this.c * v.y);
  }
  /** Transpose multiply: `inv(this) * b`, fused (no intermediate inverse). */
  invMul(b: Rotation2D): Rotation2D {
    return new Rotation2D(this.c * b.c + this.s * b.s, this.c * b.s - this.s * b.c);
  }
  /** Relative angle from this rotation to `b`, in [-PI, PI]. */
  relativeAngle(b: Rotation2D): number {
    const s = this.c * b.s - this.s * b.c;
    const c = this.c * b.c + this.s * b.s;
    return Math.atan2(s, c);
  }
  /** Cosine of the relative angle between this rotation and `b`. */
  relativeCos(b: Rotation2D): number {
    return this.c * b.c + this.s * b.s;
  }
  /** Advance by an angular displacement (radians) and renormalize (exponential-map step). */
  integrateRotation(deltaAngle: number): Rotation2D {
    const c2 = this.c - deltaAngle * this.s;
    const s2 = this.s + deltaAngle * this.c;
    const mag = Math.sqrt(s2 * s2 + c2 * c2);
    const invMag = mag > 0 ? 1 / mag : 0;
    return new Rotation2D(c2 * invMag, s2 * invMag);
  }
  /** Angular velocity rotating this onto `to` over a step; `invH` is the inverse time step. */
  angularVelocityTo(to: Rotation2D, invH: number): number {
    return invH * (to.s * this.c - to.c * this.s);
  }
  isValid(): boolean {
    return Number.isFinite(this.c) && Number.isFinite(this.s) && this.isNormalized();
  }

  equals(o: Rotation2D): boolean {
    return this.c === o.c && this.s === o.s;
  }
  isEqualApprox(o: Rotation2D, epsilon = 1e-6): boolean {
    return Math.abs(this.c - o.c) < epsilon && Math.abs(this.s - o.s) < epsilon;
  }
  toString(): string {
    return `[C:${this.c} S:${this.s}]`;
  }
}
