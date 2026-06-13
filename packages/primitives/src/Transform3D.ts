import { Vector3 } from "./Vector3";
import { Matrix3x3 } from "./Matrix3x3";

/**
 * Immutable 3D affine transform: a `Matrix3x3` linear basis plus a `Vector3` origin. TS mirror
 * of `Primitives.Transform3D` — the standard "move + rotate + scale" container for placing things
 * in world space. Operations return new instances.
 */
export class Transform3D {
  constructor(
    readonly linear: Matrix3x3 = Matrix3x3.identity,
    readonly origin: Vector3 = Vector3.zero,
  ) {}

  static readonly identity = new Transform3D(Matrix3x3.identity, Vector3.zero);
  static readonly flipX = new Transform3D(Matrix3x3.fromElements(-1, 0, 0, 0, 1, 0, 0, 0, 1), Vector3.zero);
  static readonly flipY = new Transform3D(Matrix3x3.fromElements(1, 0, 0, 0, -1, 0, 0, 0, 1), Vector3.zero);
  static readonly flipZ = new Transform3D(Matrix3x3.fromElements(1, 0, 0, 0, 1, 0, 0, 0, -1), Vector3.zero);

  /** From basis columns and origin. */
  static fromAxes(column0: Vector3, column1: Vector3, column2: Vector3, originPos: Vector3): Transform3D {
    return new Transform3D(Matrix3x3.fromColumns(column0, column1, column2), originPos);
  }

  /** From scalar basis entries (`<col><row>`, column-major grouped by row) and translation. */
  static fromElements(
    xx: number,
    yx: number,
    zx: number,
    xy: number,
    yy: number,
    zy: number,
    xz: number,
    yz: number,
    zz: number,
    ox: number,
    oy: number,
    oz: number,
  ): Transform3D {
    return new Transform3D(Matrix3x3.fromElements(xx, yx, zx, xy, yy, zy, xz, yz, zz), new Vector3(ox, oy, oz));
  }

  /** First basis column (image of (1, 0, 0)). */
  get x(): Vector3 {
    return this.linear.x;
  }
  /** Second basis column (image of (0, 1, 0)). */
  get y(): Vector3 {
    return this.linear.y;
  }
  /** Third basis column (image of (0, 0, 1)). */
  get z(): Vector3 {
    return this.linear.z;
  }
  /** Extracted non-uniform scale. */
  get scale(): Vector3 {
    return this.linear.scale;
  }

  determinant(): number {
    return this.linear.determinant();
  }
  isFinite(): boolean {
    return this.linear.isFinite() && this.origin.isFinite();
  }

  /** Apply the linear part to a vector (ignores translation). */
  basisXform(v: Vector3): Vector3 {
    return this.linear.transform(v);
  }
  /** Apply the TRANSPOSE of the linear part — the inverse only when the basis is orthonormal. */
  basisXformInv(v: Vector3): Vector3 {
    return this.linear.transformTransposed(v);
  }

  /** Affine inverse (handles scale). Throws when the basis is singular. */
  affineInverse(): Transform3D {
    const inv = this.linear.inverse();
    return new Transform3D(inv, inv.transform(this.origin.neg()));
  }
  /** Inverse assuming the basis is orthonormal (transpose is the inverse). */
  inverse(): Transform3D {
    const inv = this.linear.transposed();
    return new Transform3D(inv, inv.transform(this.origin.neg()));
  }

  /** Interpolate: quaternion-slerp the rotation, lerp the scale and origin. */
  interpolateWith(t: Transform3D, weight: number): Transform3D {
    const rotation = this.linear
      .getRotationQuaternion()
      .slerp(t.linear.getRotationQuaternion(), weight)
      .normalized();
    const scale = this.linear.scale.lerp(t.linear.scale, weight);
    // set_quaternion_scale: Basis(q) * diagonal(scale)
    const basis = Matrix3x3.fromQuaternion(rotation).mulMatrix(Matrix3x3.fromScale(scale));
    return new Transform3D(basis, this.origin.lerp(t.origin, weight));
  }

  /** This transform with an orthonormalized basis. */
  orthonormalized(): Transform3D {
    return new Transform3D(this.linear.orthonormalized(), this.origin);
  }
  /** Reoriented to look at `target` (keeps the origin). +Z forward when `useModelFront`, else -Z. */
  lookingAt(target: Vector3, up: Vector3 = Vector3.up, useModelFront = false): Transform3D {
    return new Transform3D(Matrix3x3.lookingAt(target.sub(this.origin), up, useModelFront), this.origin);
  }
  /** Rotated in world space about `axis` by `angle` radians. */
  rotated(axis: Vector3, angle: number): Transform3D {
    return new Transform3D(Matrix3x3.fromAxisAngle(axis, angle), Vector3.zero).mul(this);
  }
  /** Rotated in local space. */
  rotatedLocal(axis: Vector3, angle: number): Transform3D {
    return new Transform3D(this.linear.mulMatrix(Matrix3x3.fromAxisAngle(axis, angle)), this.origin);
  }
  /** Scaled in world space. */
  scaled(scale: Vector3): Transform3D {
    return new Transform3D(this.linear.scaled(scale), this.origin.mul(scale));
  }
  /** Scaled in local space. */
  scaledLocal(scale: Vector3): Transform3D {
    return new Transform3D(this.linear.mulMatrix(Matrix3x3.fromScale(scale)), this.origin);
  }
  /** Translated in world space. */
  translated(offset: Vector3): Transform3D {
    return new Transform3D(this.linear, this.origin.add(offset));
  }
  /** Translated in local space. */
  translatedLocal(offset: Vector3): Transform3D {
    return new Transform3D(
      this.linear,
      new Vector3(
        this.origin.x + this.linear.row0.dot(offset),
        this.origin.y + this.linear.row1.dot(offset),
        this.origin.z + this.linear.row2.dot(offset),
      ),
    );
  }

  /** Compose two transforms. */
  mul(right: Transform3D): Transform3D {
    return new Transform3D(this.linear.mulMatrix(right.linear), this.transform(right.origin));
  }
  /** Transform a point by the basis and translation. */
  transform(v: Vector3): Vector3 {
    return new Vector3(
      this.linear.row0.dot(v) + this.origin.x,
      this.linear.row1.dot(v) + this.origin.y,
      this.linear.row2.dot(v) + this.origin.z,
    );
  }

  equals(o: Transform3D): boolean {
    return this.linear.equals(o.linear) && this.origin.equals(o.origin);
  }
  isEqualApprox(o: Transform3D, epsilon = 1e-6): boolean {
    return this.linear.isEqualApprox(o.linear, epsilon) && this.origin.isEqualApprox(o.origin, epsilon);
  }
  toString(): string {
    return `[X: ${this.linear.x}, Y: ${this.linear.y}, Z: ${this.linear.z}, O: ${this.origin}]`;
  }
}
