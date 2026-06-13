import { lerpScalar } from "./internal";
import { Vector3 } from "./Vector3";
import { EulerOrder } from "./EulerOrder";
import { Quaternion } from "./Quaternion";

const TAU = Math.PI * 2;

/**
 * Immutable 3x3 basis matrix (orientation/scale in 3D). TS mirror of `Primitives.Matrix3x3`
 * (Godot's Basis). Public `x`/`y`/`z` are the basis columns (images of the unit axes); rows are
 * stored internally, matching the C# layout so the algorithms are byte-identical.
 */
export class Matrix3x3 {
  // Stored as rows (Godot Basis convention), exactly like the C# struct.
  private readonly r0: Vector3;
  private readonly r1: Vector3;
  private readonly r2: Vector3;

  private constructor(r0: Vector3, r1: Vector3, r2: Vector3) {
    this.r0 = r0;
    this.r1 = r1;
    this.r2 = r2;
  }

  static readonly identity = Matrix3x3.fromElements(1, 0, 0, 0, 1, 0, 0, 0, 1);
  static readonly flipX = Matrix3x3.fromElements(-1, 0, 0, 0, 1, 0, 0, 0, 1);
  static readonly flipY = Matrix3x3.fromElements(1, 0, 0, 0, -1, 0, 0, 0, 1);
  static readonly flipZ = Matrix3x3.fromElements(1, 0, 0, 0, 1, 0, 0, 0, -1);

  /** From the three basis columns. */
  static fromColumns(column0: Vector3, column1: Vector3, column2: Vector3): Matrix3x3 {
    return new Matrix3x3(
      new Vector3(column0.x, column1.x, column2.x),
      new Vector3(column0.y, column1.y, column2.y),
      new Vector3(column0.z, column1.z, column2.z),
    );
  }

  /** From individual entries (`<col><row>`, column-major arguments grouped by row). */
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
  ): Matrix3x3 {
    return new Matrix3x3(new Vector3(xx, yx, zx), new Vector3(xy, yy, zy), new Vector3(xz, yz, zz));
  }

  /** From a quaternion rotation. */
  static fromQuaternion(q: Quaternion): Matrix3x3 {
    const s = 2 / q.lengthSquared();
    const xs = q.x * s;
    const ys = q.y * s;
    const zs = q.z * s;
    const wx = q.w * xs;
    const wy = q.w * ys;
    const wz = q.w * zs;
    const xx = q.x * xs;
    const xy = q.x * ys;
    const xz = q.x * zs;
    const yy = q.y * ys;
    const yz = q.y * zs;
    const zz = q.z * zs;
    return new Matrix3x3(
      new Vector3(1 - (yy + zz), xy - wz, xz + wy),
      new Vector3(xy + wz, 1 - (xx + zz), yz - wx),
      new Vector3(xz - wy, yz + wx, 1 - (xx + yy)),
    );
  }

  /** From axis-angle rotation (radians). */
  static fromAxisAngle(axis: Vector3, angle: number): Matrix3x3 {
    const axisSqX = axis.x * axis.x;
    const axisSqY = axis.y * axis.y;
    const axisSqZ = axis.z * axis.z;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const t = 1 - cos;

    let xyzt = axis.x * axis.y * t;
    let zyxs = axis.z * sin;
    const xyM = xyzt - zyxs;
    const xyP = xyzt + zyxs;

    xyzt = axis.x * axis.z * t;
    zyxs = axis.y * sin;
    const xzP = xyzt + zyxs;
    const xzM = xyzt - zyxs;

    xyzt = axis.y * axis.z * t;
    zyxs = axis.x * sin;
    const yzM = xyzt - zyxs;
    const yzP = xyzt + zyxs;

    return new Matrix3x3(
      new Vector3(axisSqX + cos * (1 - axisSqX), xyM, xzP),
      new Vector3(xyP, axisSqY + cos * (1 - axisSqY), yzM),
      new Vector3(xzM, yzP, axisSqZ + cos * (1 - axisSqZ)),
    );
  }

  /** Diagonal basis from scale. */
  static fromScale(scale: Vector3): Matrix3x3 {
    return Matrix3x3.fromElements(scale.x, 0, 0, 0, scale.y, 0, 0, 0, scale.z);
  }

  /** From Euler angles (radians) in the given order (default YXZ). */
  static fromEuler(euler: Vector3, order: EulerOrder = EulerOrder.Yxz): Matrix3x3 {
    let sin = Math.sin(euler.x);
    let cos = Math.cos(euler.x);
    const xmat = Matrix3x3.fromColumns(new Vector3(1, 0, 0), new Vector3(0, cos, sin), new Vector3(0, -sin, cos));

    sin = Math.sin(euler.y);
    cos = Math.cos(euler.y);
    const ymat = Matrix3x3.fromColumns(new Vector3(cos, 0, -sin), new Vector3(0, 1, 0), new Vector3(sin, 0, cos));

    sin = Math.sin(euler.z);
    cos = Math.cos(euler.z);
    const zmat = Matrix3x3.fromColumns(new Vector3(cos, sin, 0), new Vector3(-sin, cos, 0), new Vector3(0, 0, 1));

    switch (order) {
      case EulerOrder.Xyz:
        return xmat.mulMatrix(ymat).mulMatrix(zmat);
      case EulerOrder.Xzy:
        return xmat.mulMatrix(zmat).mulMatrix(ymat);
      case EulerOrder.Yxz:
        return ymat.mulMatrix(xmat).mulMatrix(zmat);
      case EulerOrder.Yzx:
        return ymat.mulMatrix(zmat).mulMatrix(xmat);
      case EulerOrder.Zxy:
        return zmat.mulMatrix(xmat).mulMatrix(ymat);
      case EulerOrder.Zyx:
        return zmat.mulMatrix(ymat).mulMatrix(xmat);
    }
  }

  /** Orthonormal basis that looks toward a direction. */
  static lookingAt(target: Vector3, up: Vector3, useModelFront = false): Matrix3x3 {
    let column2 = target.normalized();
    if (!useModelFront) column2 = column2.neg();
    const column0 = up.cross(column2).normalized();
    const column1 = column2.cross(column0);
    return Matrix3x3.fromColumns(column0, column1, column2);
  }

  /** Solve `[cx cy cz] * x = b` via Cramer's rule, zero vector when singular. */
  static solveColumns(cx: Vector3, cy: Vector3, cz: Vector3, b: Vector3): Vector3 {
    let det = cx.dot(cy.cross(cz));
    if (det !== 0) det = 1 / det;
    return new Vector3(det * b.dot(cy.cross(cz)), det * cx.dot(b.cross(cz)), det * cx.dot(cy.cross(b)));
  }

  // --- accessors ---
  get row0(): Vector3 {
    return this.r0;
  }
  get row1(): Vector3 {
    return this.r1;
  }
  get row2(): Vector3 {
    return this.r2;
  }
  get x(): Vector3 {
    return new Vector3(this.r0.x, this.r1.x, this.r2.x);
  }
  get y(): Vector3 {
    return new Vector3(this.r0.y, this.r1.y, this.r2.y);
  }
  get z(): Vector3 {
    return new Vector3(this.r0.z, this.r1.z, this.r2.z);
  }
  /** Column by index (0..2). */
  getColumn(i: number): Vector3 {
    return i === 0 ? this.x : i === 1 ? this.y : this.z;
  }
  /** Extracted scale (column lengths, sign tracking the determinant). */
  get scale(): Vector3 {
    const detSign = Math.sign(this.determinant());
    return new Vector3(this.x.length(), this.y.length(), this.z.length()).scale(detSign);
  }

  determinant(): number {
    const cofac00 = this.r1.y * this.r2.z - this.r1.z * this.r2.y;
    const cofac10 = this.r1.z * this.r2.x - this.r1.x * this.r2.z;
    const cofac20 = this.r1.x * this.r2.y - this.r1.y * this.r2.x;
    return this.r0.x * cofac00 + this.r0.y * cofac10 + this.r0.z * cofac20;
  }

  /** Inverse basis. Throws when the determinant is zero. */
  inverse(): Matrix3x3 {
    const cofac00 = this.r1.y * this.r2.z - this.r1.z * this.r2.y;
    const cofac10 = this.r1.z * this.r2.x - this.r1.x * this.r2.z;
    const cofac20 = this.r1.x * this.r2.y - this.r1.y * this.r2.x;
    const det = this.r0.x * cofac00 + this.r0.y * cofac10 + this.r0.z * cofac20;
    if (det === 0) throw new Error("Matrix determinant is zero and cannot be inverted.");
    const di = 1 / det;
    const cofac01 = this.r0.z * this.r2.y - this.r0.y * this.r2.z;
    const cofac02 = this.r0.y * this.r1.z - this.r0.z * this.r1.y;
    const cofac11 = this.r0.x * this.r2.z - this.r0.z * this.r2.x;
    const cofac12 = this.r0.z * this.r1.x - this.r0.x * this.r1.z;
    const cofac21 = this.r0.y * this.r2.x - this.r0.x * this.r2.y;
    const cofac22 = this.r0.x * this.r1.y - this.r0.y * this.r1.x;
    return Matrix3x3.fromElements(
      cofac00 * di,
      cofac01 * di,
      cofac02 * di,
      cofac10 * di,
      cofac11 * di,
      cofac12 * di,
      cofac20 * di,
      cofac21 * di,
      cofac22 * di,
    );
  }

  transposed(): Matrix3x3 {
    return Matrix3x3.fromColumns(this.r0, this.r1, this.r2);
  }
  isFinite(): boolean {
    return this.r0.isFinite() && this.r1.isFinite() && this.r2.isFinite();
  }
  /** Scale each row by the matching component. */
  scaled(scale: Vector3): Matrix3x3 {
    return new Matrix3x3(this.r0.scale(scale.x), this.r1.scale(scale.y), this.r2.scale(scale.z));
  }
  /** Component-wise local scaling of each row. */
  scaledLocal(scale: Vector3): Matrix3x3 {
    return new Matrix3x3(this.r0.mul(scale), this.r1.mul(scale), this.r2.mul(scale));
  }
  /** Rotate this basis around an axis. */
  rotated(axis: Vector3, angle: number): Matrix3x3 {
    return Matrix3x3.fromAxisAngle(axis, angle).mulMatrix(this);
  }
  /** Linearly interpolate each row toward another basis. */
  lerp(to: Matrix3x3, weight: number): Matrix3x3 {
    return new Matrix3x3(this.r0.lerp(to.r0, weight), this.r1.lerp(to.r1, weight), this.r2.lerp(to.r2, weight));
  }

  /** Orthonormalized version of this basis. */
  orthonormalized(): Matrix3x3 {
    let column0 = this.x;
    let column1 = this.y;
    let column2 = this.z;
    column0 = column0.normalized();
    column1 = column1.sub(column0.scale(column0.dot(column1))).normalized();
    column2 = column2.sub(column0.scale(column0.dot(column2))).sub(column1.scale(column1.dot(column2))).normalized();
    return Matrix3x3.fromColumns(column0, column1, column2);
  }

  /** Spherically interpolate rotation, linearly interpolate scale, toward a target basis. */
  slerp(target: Matrix3x3, weight: number): Matrix3x3 {
    const from = this.getQuaternion();
    const to = target.getQuaternion();
    let b = Matrix3x3.fromQuaternion(from.slerp(to, weight));
    b = new Matrix3x3(
      b.r0.scale(lerpScalar(this.r0.length(), target.r0.length(), weight)),
      b.r1.scale(lerpScalar(this.r1.length(), target.r1.length(), weight)),
      b.r2.scale(lerpScalar(this.r2.length(), target.r2.length(), weight)),
    );
    return b;
  }

  tdotx(w: Vector3): number {
    return this.r0.x * w.x + this.r1.x * w.y + this.r2.x * w.z;
  }
  tdoty(w: Vector3): number {
    return this.r0.y * w.x + this.r1.y * w.y + this.r2.y * w.z;
  }
  tdotz(w: Vector3): number {
    return this.r0.z * w.x + this.r1.z * w.y + this.r2.z * w.z;
  }

  /** Matrix product. */
  mulMatrix(right: Matrix3x3): Matrix3x3 {
    return Matrix3x3.fromElements(
      right.tdotx(this.r0),
      right.tdoty(this.r0),
      right.tdotz(this.r0),
      right.tdotx(this.r1),
      right.tdoty(this.r1),
      right.tdotz(this.r1),
      right.tdotx(this.r2),
      right.tdoty(this.r2),
      right.tdotz(this.r2),
    );
  }
  /** Transform a vector by this basis. */
  transform(v: Vector3): Vector3 {
    return new Vector3(this.r0.dot(v), this.r1.dot(v), this.r2.dot(v));
  }
  /** Transform a vector with the vector on the left (transpose multiply). */
  transformTransposed(v: Vector3): Vector3 {
    return new Vector3(
      this.r0.x * v.x + this.r1.x * v.y + this.r2.x * v.z,
      this.r0.y * v.x + this.r1.y * v.y + this.r2.y * v.z,
      this.r0.z * v.x + this.r1.z * v.y + this.r2.z * v.z,
    );
  }

  /** Convert to a quaternion without correcting reflections. */
  getQuaternion(): Quaternion {
    const trace = this.r0.x + this.r1.y + this.r2.z;
    if (trace > 0) {
      const s = Math.sqrt(trace + 1) * 2;
      const invS = 1 / s;
      return new Quaternion(
        (this.r2.y - this.r1.z) * invS,
        (this.r0.z - this.r2.x) * invS,
        (this.r1.x - this.r0.y) * invS,
        s * 0.25,
      );
    }
    if (this.r0.x > this.r1.y && this.r0.x > this.r2.z) {
      const s = Math.sqrt(this.r0.x - this.r1.y - this.r2.z + 1) * 2;
      const invS = 1 / s;
      return new Quaternion(
        s * 0.25,
        (this.r0.y + this.r1.x) * invS,
        (this.r0.z + this.r2.x) * invS,
        (this.r2.y - this.r1.z) * invS,
      );
    }
    if (this.r1.y > this.r2.z) {
      const s = Math.sqrt(-this.r0.x + this.r1.y - this.r2.z + 1) * 2;
      const invS = 1 / s;
      return new Quaternion(
        (this.r0.y + this.r1.x) * invS,
        s * 0.25,
        (this.r1.z + this.r2.y) * invS,
        (this.r0.z - this.r2.x) * invS,
      );
    }
    const s = Math.sqrt(-this.r0.x - this.r1.y + this.r2.z + 1) * 2;
    const invS = 1 / s;
    return new Quaternion(
      (this.r0.z + this.r2.x) * invS,
      (this.r1.z + this.r2.y) * invS,
      s * 0.25,
      (this.r1.x - this.r0.y) * invS,
    );
  }

  /** Extract a rotation quaternion after orthonormalization (removes reflection). */
  getRotationQuaternion(): Quaternion {
    let ortho = this.orthonormalized();
    if (ortho.determinant() < 0) ortho = ortho.scaled(Vector3.one.neg());
    return ortho.getQuaternion();
  }

  /** Extract Euler angles (radians) for the given order. */
  getEuler(order: EulerOrder = EulerOrder.Yxz): Vector3 {
    // Tighter gimbal-lock epsilon than CMP_EPSILON, matching Godot.
    const epsilon = 0.00000025;
    const r0 = this.r0;
    const r1 = this.r1;
    const r2 = this.r2;
    switch (order) {
      case EulerOrder.Xyz: {
        const sy = r0.z;
        if (sy < 1 - epsilon) {
          if (sy > -(1 - epsilon)) {
            if (r1.x === 0 && r0.y === 0 && r1.z === 0 && r2.y === 0 && r1.y === 1) {
              return new Vector3(0, Math.atan2(r0.z, r0.x), 0);
            }
            return new Vector3(Math.atan2(-r1.z, r2.z), Math.asin(sy), Math.atan2(-r0.y, r0.x));
          }
          return new Vector3(Math.atan2(r2.y, r1.y), -TAU / 4, 0);
        }
        return new Vector3(Math.atan2(r2.y, r1.y), TAU / 4, 0);
      }
      case EulerOrder.Xzy: {
        const sz = r0.y;
        if (sz < 1 - epsilon) {
          if (sz > -(1 - epsilon)) {
            return new Vector3(Math.atan2(r2.y, r1.y), Math.atan2(r0.z, r0.x), Math.asin(-sz));
          }
          return new Vector3(-Math.atan2(r1.z, r2.z), 0, TAU / 4);
        }
        return new Vector3(-Math.atan2(r1.z, r2.z), 0, -TAU / 4);
      }
      case EulerOrder.Yxz: {
        const m12 = r1.z;
        if (m12 < 1 - epsilon) {
          if (m12 > -(1 - epsilon)) {
            if (r1.x === 0 && r0.y === 0 && r0.z === 0 && r2.x === 0 && r0.x === 1) {
              return new Vector3(Math.atan2(-m12, r1.y), 0, 0);
            }
            return new Vector3(Math.asin(-m12), Math.atan2(r0.z, r2.z), Math.atan2(r1.x, r1.y));
          }
          return new Vector3(TAU / 4, Math.atan2(r0.y, r0.x), 0);
        }
        return new Vector3(-TAU / 4, -Math.atan2(r0.y, r0.x), 0);
      }
      case EulerOrder.Yzx: {
        const sz = r1.x;
        if (sz < 1 - epsilon) {
          if (sz > -(1 - epsilon)) {
            return new Vector3(Math.atan2(-r1.z, r1.y), Math.atan2(-r2.x, r0.x), Math.asin(sz));
          }
          return new Vector3(Math.atan2(r2.y, r2.z), 0, -TAU / 4);
        }
        return new Vector3(Math.atan2(r2.y, r2.z), 0, TAU / 4);
      }
      case EulerOrder.Zxy: {
        const sx = r2.y;
        if (sx < 1 - epsilon) {
          if (sx > -(1 - epsilon)) {
            return new Vector3(Math.asin(sx), Math.atan2(-r2.x, r2.z), Math.atan2(-r0.y, r1.y));
          }
          return new Vector3(-TAU / 4, Math.atan2(r0.z, r0.x), 0);
        }
        return new Vector3(TAU / 4, Math.atan2(r0.z, r0.x), 0);
      }
      case EulerOrder.Zyx: {
        const sy = r2.x;
        if (sy < 1 - epsilon) {
          if (sy > -(1 - epsilon)) {
            return new Vector3(Math.atan2(r2.y, r2.z), Math.asin(-sy), Math.atan2(r1.x, r0.x));
          }
          return new Vector3(0, TAU / 4, -Math.atan2(r0.y, r1.y));
        }
        return new Vector3(0, -TAU / 4, -Math.atan2(r0.y, r1.y));
      }
    }
  }

  equals(o: Matrix3x3): boolean {
    return this.r0.equals(o.r0) && this.r1.equals(o.r1) && this.r2.equals(o.r2);
  }
  isEqualApprox(o: Matrix3x3, epsilon = 1e-6): boolean {
    return this.r0.isEqualApprox(o.r0, epsilon) && this.r1.isEqualApprox(o.r1, epsilon) && this.r2.isEqualApprox(o.r2, epsilon);
  }
  toString(): string {
    return `[X: ${this.x}, Y: ${this.y}, Z: ${this.z}]`;
  }
}
