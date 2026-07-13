import { APPROX_EPSILON } from "./internal";
import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";

/**
 * Immutable 4x4 matrix for camera projection and homogeneous-space transforms. TS mirror of
 * `Primitives.Matrix4x4`. Stored as four column vectors. Projection factories use the Vulkan
 * depth `[0,1]` convention.
 */
export class Matrix4x4 {
  constructor(
    readonly x: Vector4 = Vector4.zero,
    readonly y: Vector4 = Vector4.zero,
    readonly z: Vector4 = Vector4.zero,
    readonly w: Vector4 = Vector4.zero,
  ) {}

  static readonly zero = new Matrix4x4(Vector4.zero, Vector4.zero, Vector4.zero, Vector4.zero);
  static readonly identity = new Matrix4x4(
    new Vector4(1, 0, 0, 0),
    new Vector4(0, 1, 0, 0),
    new Vector4(0, 0, 1, 0),
    new Vector4(0, 0, 0, 1),
  );

  /** Column by index (0..3). */
  getColumn(i: number): Vector4 {
    return i === 0 ? this.x : i === 1 ? this.y : i === 2 ? this.z : this.w;
  }

  // --- factory methods (Vulkan depth [0,1]) ---

  static createOrthogonal(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): Matrix4x4 {
    return new Matrix4x4(
      new Vector4(2 / (right - left), 0, 0, 0),
      new Vector4(0, 2 / (top - bottom), 0, 0),
      new Vector4(0, 0, 1 / (zNear - zFar), 0),
      new Vector4((left + right) / (left - right), (bottom + top) / (bottom - top), zNear / (zNear - zFar), 1),
    );
  }

  static createPerspective(fovRadians: number, aspect: number, zNear: number, zFar: number): Matrix4x4 {
    const yScale = 1 / Math.tan(fovRadians * 0.5);
    const xScale = yScale / aspect;
    return new Matrix4x4(
      new Vector4(xScale, 0, 0, 0),
      new Vector4(0, yScale, 0, 0),
      new Vector4(0, 0, zFar / (zNear - zFar), -1),
      new Vector4(0, 0, (zNear * zFar) / (zNear - zFar), 0),
    );
  }

  static createFrustum(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): Matrix4x4 {
    return new Matrix4x4(
      new Vector4((2 * zNear) / (right - left), 0, 0, 0),
      new Vector4(0, (2 * zNear) / (top - bottom), 0, 0),
      new Vector4((right + left) / (right - left), (top + bottom) / (top - bottom), zFar / (zNear - zFar), -1),
      new Vector4(0, 0, (zNear * zFar) / (zNear - zFar), 0),
    );
  }

  static createTranslation(x: number, y: number, z: number): Matrix4x4 {
    return new Matrix4x4(
      new Vector4(1, 0, 0, 0),
      new Vector4(0, 1, 0, 0),
      new Vector4(0, 0, 1, 0),
      new Vector4(x, y, z, 1),
    );
  }

  static createRotationZ(radians: number): Matrix4x4 {
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    return new Matrix4x4(
      new Vector4(cos, sin, 0, 0),
      new Vector4(-sin, cos, 0, 0),
      new Vector4(0, 0, 1, 0),
      new Vector4(0, 0, 0, 1),
    );
  }

  static createScale(x: number, y: number, z: number): Matrix4x4 {
    return new Matrix4x4(
      new Vector4(x, 0, 0, 0),
      new Vector4(0, y, 0, 0),
      new Vector4(0, 0, z, 0),
      new Vector4(0, 0, 0, 1),
    );
  }

  determinant(): number {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;
    return (
      x.w * y.z * z.y * w.x - x.z * y.w * z.y * w.x -
      x.w * y.y * z.z * w.x + x.y * y.w * z.z * w.x +
      x.z * y.y * z.w * w.x - x.y * y.z * z.w * w.x -
      x.w * y.z * z.x * w.y + x.z * y.w * z.x * w.y +
      x.w * y.x * z.z * w.y - x.x * y.w * z.z * w.y -
      x.z * y.x * z.w * w.y + x.x * y.z * z.w * w.y +
      x.w * y.y * z.x * w.z - x.y * y.w * z.x * w.z -
      x.w * y.x * z.y * w.z + x.x * y.w * z.y * w.z +
      x.y * y.x * z.w * w.z - x.x * y.y * z.w * w.z -
      x.z * y.y * z.x * w.w + x.y * y.z * z.x * w.w +
      x.z * y.x * z.y * w.w - x.x * y.z * z.y * w.w -
      x.y * y.x * z.z * w.w + x.x * y.y * z.z * w.w
    );
  }

  /** Inverse via full pivoting. Returns `Matrix4x4.zero` when singular. */
  inverse(): Matrix4x4 {
    // Flat column-major scratch: m[col * 4 + row].
    const m = [
      ...this.x.toArray(),
      ...this.y.toArray(),
      ...this.z.toArray(),
      ...this.w.toArray(),
    ];
    const at = (col: number, row: number): number => m[col * 4 + row];
    const set = (col: number, row: number, v: number): void => {
      m[col * 4 + row] = v;
    };

    const pvtI = [0, 0, 0, 0];
    const pvtJ = [0, 0, 0, 0];
    let determinant = 1;

    for (let k = 0; k < 4; k++) {
      let pvtVal = at(k, k);
      pvtI[k] = k;
      pvtJ[k] = k;

      for (let i = k; i < 4; i++) {
        for (let j = k; j < 4; j++) {
          if (Math.abs(at(i, j)) > Math.abs(pvtVal)) {
            pvtI[k] = i;
            pvtJ[k] = j;
            pvtVal = at(i, j);
          }
        }
      }

      determinant *= pvtVal;
      if (Math.abs(determinant) < APPROX_EPSILON) return Matrix4x4.zero;

      let i = pvtI[k];
      if (i !== k) {
        for (let j = 0; j < 4; j++) {
          const hold = -at(k, j);
          set(k, j, at(i, j));
          set(i, j, hold);
        }
      }

      let j = pvtJ[k];
      if (j !== k) {
        for (i = 0; i < 4; i++) {
          const hold = -at(i, k);
          set(i, k, at(i, j));
          set(i, j, hold);
        }
      }

      for (i = 0; i < 4; i++) {
        if (i !== k) set(i, k, at(i, k) / -pvtVal);
      }

      for (i = 0; i < 4; i++) {
        const hold = at(i, k);
        for (j = 0; j < 4; j++) {
          if (i !== k && j !== k) set(i, j, at(i, j) + hold * at(k, j));
        }
      }

      for (j = 0; j < 4; j++) {
        if (j !== k) set(k, j, at(k, j) / pvtVal);
      }

      set(k, k, 1 / pvtVal);
    }

    for (let k = 2; k >= 0; k--) {
      let i = pvtJ[k];
      if (i !== k) {
        for (let j = 0; j < 4; j++) {
          const hold = at(k, j);
          set(k, j, -at(i, j));
          set(i, j, hold);
        }
      }

      let j = pvtI[k];
      if (j !== k) {
        for (i = 0; i < 4; i++) {
          const hold = at(i, k);
          set(i, k, -at(i, j));
          set(i, j, hold);
        }
      }
    }

    return new Matrix4x4(
      new Vector4(m[0], m[1], m[2], m[3]),
      new Vector4(m[4], m[5], m[6], m[7]),
      new Vector4(m[8], m[9], m[10], m[11]),
      new Vector4(m[12], m[13], m[14], m[15]),
    );
  }

  /** Whether this is an orthographic (non-perspective) projection (`z.w == 0`). */
  isOrthogonal(): boolean {
    return this.z.w === 0;
  }
  /** Copy with the Y axis flipped. */
  flippedY(): Matrix4x4 {
    return new Matrix4x4(this.x, this.y.neg(), this.z, this.w);
  }

  /** Matrix product. */
  mulMatrix(right: Matrix4x4): Matrix4x4 {
    return new Matrix4x4(
      this.transform(right.x),
      this.transform(right.y),
      this.transform(right.z),
      this.transform(right.w),
    );
  }
  /** Multiply by a homogeneous vector. */
  transform(v: Vector4): Vector4 {
    return new Vector4(
      this.x.x * v.x + this.y.x * v.y + this.z.x * v.z + this.w.x * v.w,
      this.x.y * v.x + this.y.y * v.y + this.z.y * v.z + this.w.y * v.w,
      this.x.z * v.x + this.y.z * v.y + this.z.z * v.z + this.w.z * v.w,
      this.x.w * v.x + this.y.w * v.y + this.z.w * v.z + this.w.w * v.w,
    );
  }
  /** Transform a 3D point and perform the perspective divide. */
  transformPoint(v: Vector3): Vector3 {
    const ret = new Vector3(
      this.x.x * v.x + this.y.x * v.y + this.z.x * v.z + this.w.x,
      this.x.y * v.x + this.y.y * v.y + this.z.y * v.z + this.w.y,
      this.x.z * v.x + this.y.z * v.y + this.z.z * v.z + this.w.z,
    );
    return ret.div(this.x.w * v.x + this.y.w * v.y + this.z.w * v.z + this.w.w);
  }

  equals(o: Matrix4x4): boolean {
    return this.x.equals(o.x) && this.y.equals(o.y) && this.z.equals(o.z) && this.w.equals(o.w);
  }
  isEqualApprox(o: Matrix4x4, epsilon = 1e-6): boolean {
    return (
      this.x.isEqualApprox(o.x, epsilon) &&
      this.y.isEqualApprox(o.y, epsilon) &&
      this.z.isEqualApprox(o.z, epsilon) &&
      this.w.isEqualApprox(o.w, epsilon)
    );
  }
  toString(): string {
    return (
      `${this.x.x}, ${this.x.y}, ${this.x.z}, ${this.x.w}\n` +
      `${this.y.x}, ${this.y.y}, ${this.y.z}, ${this.y.w}\n` +
      `${this.z.x}, ${this.z.y}, ${this.z.z}, ${this.z.w}\n` +
      `${this.w.x}, ${this.w.y}, ${this.w.z}, ${this.w.w}\n`
    );
  }
}
