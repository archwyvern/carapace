import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";

/**
 * Immutable 2x2 linear-transform matrix (rotation/scale in 2D). TS mirror of
 * `Primitives.Matrix2x2`. Stored column-major: `x` is the image of (1, 0), `y` the image of
 * (0, 1). Operations return new instances.
 */
export class Matrix2x2 {
  constructor(
    readonly x: Vector2 = Vector2.zero,
    readonly y: Vector2 = Vector2.zero,
  ) {}

  static readonly identity = new Matrix2x2(new Vector2(1, 0), new Vector2(0, 1));
  static readonly flipX = new Matrix2x2(new Vector2(-1, 0), new Vector2(0, 1));
  static readonly flipY = new Matrix2x2(new Vector2(1, 0), new Vector2(0, -1));

  /** From individual elements in row-major argument order. */
  static fromElements(xx: number, xy: number, yx: number, yy: number): Matrix2x2 {
    return new Matrix2x2(new Vector2(xx, yx), new Vector2(xy, yy));
  }

  /** Rotation basis from an angle in radians (counter-clockwise). */
  static fromAngle(angle: number): Matrix2x2 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Matrix2x2(new Vector2(c, s), new Vector2(-s, c));
  }

  /** Diagonal basis from a per-axis scale. */
  static fromScale(scale: Vector2): Matrix2x2 {
    return new Matrix2x2(new Vector2(scale.x, 0), new Vector2(0, scale.y));
  }

  get column0(): Vector2 {
    return this.x;
  }
  get column1(): Vector2 {
    return this.y;
  }
  get row0(): Vector2 {
    return new Vector2(this.x.x, this.y.x);
  }
  get row1(): Vector2 {
    return new Vector2(this.x.y, this.y.y);
  }

  transposed(): Matrix2x2 {
    return new Matrix2x2(new Vector2(this.x.x, this.y.x), new Vector2(this.x.y, this.y.y));
  }
  determinant(): number {
    return this.x.x * this.y.y - this.y.x * this.x.y;
  }
  /** Inverse basis. Throws if singular. */
  inverse(): Matrix2x2 {
    const det = this.determinant();
    if (Math.abs(det) <= APPROX_EPSILON) throw new Error("Cannot invert a singular basis.");
    const inv = 1 / det;
    return new Matrix2x2(new Vector2(this.y.y * inv, -this.x.y * inv), new Vector2(-this.y.x * inv, this.x.x * inv));
  }
  /** Each column scaled by the matching component. */
  scaled(scale: Vector2): Matrix2x2 {
    return new Matrix2x2(this.x.scale(scale.x), this.y.scale(scale.y));
  }
  isFinite(): boolean {
    return this.x.isFinite() && this.y.isFinite();
  }

  /** Matrix product (column-major: result.col_j = this * other.col_j). */
  mulMatrix(other: Matrix2x2): Matrix2x2 {
    return new Matrix2x2(this.transform(other.x), this.transform(other.y));
  }
  /** Apply the linear transform to a vector. */
  transform(v: Vector2): Vector2 {
    return new Vector2(this.x.x * v.x + this.y.x * v.y, this.x.y * v.x + this.y.y * v.y);
  }
  /** Row-vector multiply (equivalent to `transposed().transform(v)`). */
  transformTransposed(v: Vector2): Vector2 {
    return new Vector2(v.x * this.x.x + v.y * this.x.y, v.x * this.y.x + v.y * this.y.y);
  }

  /** Inverse, or the zero matrix when singular (solver-style alternative to `inverse`). */
  inverseOrZero(): Matrix2x2 {
    const a = this.x.x;
    const b = this.y.x;
    const c = this.x.y;
    const d = this.y.y;
    let det = a * d - b * c;
    if (det !== 0) det = 1 / det;
    return new Matrix2x2(new Vector2(det * d, -det * c), new Vector2(-det * b, det * a));
  }
  /** Solve `this * x = b` via Cramer's rule, returning the zero vector when singular. */
  solve(b: Vector2): Vector2 {
    const a11 = this.x.x;
    const a12 = this.y.x;
    const a21 = this.x.y;
    const a22 = this.y.y;
    let det = a11 * a22 - a12 * a21;
    if (det !== 0) det = 1 / det;
    return new Vector2(det * (a22 * b.x - a12 * b.y), det * (a11 * b.y - a21 * b.x));
  }

  equals(o: Matrix2x2): boolean {
    return this.x.equals(o.x) && this.y.equals(o.y);
  }
  isEqualApprox(o: Matrix2x2, epsilon = 1e-6): boolean {
    return this.x.isEqualApprox(o.x, epsilon) && this.y.isEqualApprox(o.y, epsilon);
  }
  toString(): string {
    return `[X:${this.x} Y:${this.y}]`;
  }
}
