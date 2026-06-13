import { Vector2 } from "./Vector2";
import { Matrix2x2 } from "./Matrix2x2";
import { Rect2 } from "./Rect2";

const TAU = Math.PI * 2;

function lerpAngle(from: number, to: number, weight: number): number {
  const diff = (to - from) % TAU;
  const dist = ((2 * diff) % TAU) - diff;
  return from + dist * weight;
}

/**
 * Immutable 2D affine transform: a `Matrix2x2` linear part plus a `Vector2` origin. TS mirror
 * of `Primitives.Transform2D`. Operations return new instances.
 */
export class Transform2D {
  constructor(
    readonly linear: Matrix2x2 = Matrix2x2.identity,
    readonly origin: Vector2 = Vector2.zero,
  ) {}

  static readonly identity = new Transform2D(Matrix2x2.identity, Vector2.zero);
  static readonly flipX = new Transform2D(Matrix2x2.flipX, Vector2.zero);
  static readonly flipY = new Transform2D(Matrix2x2.flipY, Vector2.zero);

  /** From basis columns and origin. */
  static fromAxes(xAxis: Vector2, yAxis: Vector2, originPos: Vector2): Transform2D {
    return new Transform2D(new Matrix2x2(xAxis, yAxis), originPos);
  }

  /** From scalar matrix elements and translation. */
  static fromElements(xx: number, xy: number, yx: number, yy: number, ox: number, oy: number): Transform2D {
    return new Transform2D(new Matrix2x2(new Vector2(xx, xy), new Vector2(yx, yy)), new Vector2(ox, oy));
  }

  /** From a pure rotation (radians) and translation. */
  static fromRotation(rotation: number, origin: Vector2 = Vector2.zero): Transform2D {
    const sin = Math.sin(rotation);
    const cos = Math.cos(rotation);
    return new Transform2D(new Matrix2x2(new Vector2(cos, sin), new Vector2(-sin, cos)), origin);
  }

  /** From rotation, scale, skew (all radians), and translation. */
  static fromRotationScaleSkew(rotation: number, scale: Vector2, skew: number, origin: Vector2): Transform2D {
    const rotSin = Math.sin(rotation);
    const rotCos = Math.cos(rotation);
    const skewSin = Math.sin(rotation + skew);
    const skewCos = Math.cos(rotation + skew);
    const linear = new Matrix2x2(
      new Vector2(rotCos * scale.x, rotSin * scale.x),
      new Vector2(-skewSin * scale.y, skewCos * scale.y),
    );
    return new Transform2D(linear, origin);
  }

  /** First basis column (image of (1, 0)). */
  get x(): Vector2 {
    return this.linear.x;
  }
  /** Second basis column (image of (0, 1)). */
  get y(): Vector2 {
    return this.linear.y;
  }
  /** Rotation angle in radians extracted from basis X. */
  get rotation(): number {
    return Math.atan2(this.linear.x.y, this.linear.x.x);
  }
  /** Extracted non-uniform scale. Y sign tracks the determinant sign. */
  get scale(): Vector2 {
    const detSign = Math.sign(this.determinant());
    return new Vector2(this.linear.x.length(), detSign * this.linear.y.length());
  }
  /** Extracted skew angle in radians. */
  get skew(): number {
    const detSign = Math.sign(this.determinant());
    return Math.acos(this.linear.x.normalized().dot(this.linear.y.normalized().scale(detSign))) - Math.PI * 0.5;
  }

  determinant(): number {
    return this.linear.determinant();
  }
  /** Apply the linear part to a vector (ignores translation). */
  basisXform(v: Vector2): Vector2 {
    return this.linear.transform(v);
  }
  /** Apply the TRANSPOSE of the linear part — the inverse only when the basis is orthonormal. */
  basisXformInv(v: Vector2): Vector2 {
    return this.linear.transformTransposed(v);
  }
  /** Affine inverse (handles scale/skew). Throws when the determinant is zero. */
  affineInverse(): Transform2D {
    const inv = this.linear.inverse();
    return new Transform2D(inv, inv.transform(this.origin.neg()));
  }
  /** Inverse assuming the linear part is orthonormal (transpose is the inverse). */
  inverse(): Transform2D {
    const inv = this.linear.transposed();
    return new Transform2D(inv, inv.transform(this.origin.neg()));
  }
  /** Interpolate by decomposing rotation/scale/skew/translation. */
  interpolateWith(t: Transform2D, weight: number): Transform2D {
    return Transform2D.fromRotationScaleSkew(
      lerpAngle(this.rotation, t.rotation, weight),
      this.scale.lerp(t.scale, weight),
      lerpAngle(this.skew, t.skew, weight),
      this.origin.lerp(t.origin, weight),
    );
  }
  /** This transform with an orthonormalized linear part. */
  orthonormalized(): Transform2D {
    const x = this.linear.x.normalized();
    const y = this.linear.y.sub(x.scale(x.dot(this.linear.y))).normalized();
    return new Transform2D(new Matrix2x2(x, y), this.origin);
  }
  /** Rotated in world space. */
  rotated(angle: number): Transform2D {
    return Transform2D.fromRotation(angle, Vector2.zero).mul(this);
  }
  /** Rotated in local space. */
  rotatedLocal(angle: number): Transform2D {
    return this.mul(Transform2D.fromRotation(angle, Vector2.zero));
  }
  /** Scaled in world space. */
  scaled(scale: Vector2): Transform2D {
    return new Transform2D(new Matrix2x2(this.linear.x.mul(scale), this.linear.y.mul(scale)), this.origin.mul(scale));
  }
  /** Scaled in local space. */
  scaledLocal(scale: Vector2): Transform2D {
    return new Transform2D(this.linear.scaled(scale), this.origin);
  }
  /** Translated in world space. */
  translated(offset: Vector2): Transform2D {
    return new Transform2D(this.linear, this.origin.add(offset));
  }
  /** Translated in local space. */
  translatedLocal(offset: Vector2): Transform2D {
    return new Transform2D(this.linear, this.origin.add(this.linear.transform(offset)));
  }

  /** Compose two transforms. */
  mul(right: Transform2D): Transform2D {
    return new Transform2D(this.linear.mulMatrix(right.linear), this.linear.transform(right.origin).add(this.origin));
  }
  /** Transform a vector by the linear part and translation. */
  transform(v: Vector2): Vector2 {
    return this.linear.transform(v).add(this.origin);
  }
  /** Transform an axis-aligned rect and return the conservative AABB. */
  mulRect(rect: Rect2): Rect2 {
    const pos = this.transform(rect.position);
    const toX = this.linear.x.scale(rect.size.x);
    const toY = this.linear.y.scale(rect.size.y);
    return new Rect2(pos, Vector2.zero)
      .expand(pos.add(toX))
      .expand(pos.add(toY))
      .expand(pos.add(toX).add(toY));
  }

  equals(o: Transform2D): boolean {
    return this.linear.equals(o.linear) && this.origin.equals(o.origin);
  }
  isEqualApprox(o: Transform2D, epsilon = 1e-6): boolean {
    return this.linear.isEqualApprox(o.linear, epsilon) && this.origin.isEqualApprox(o.origin, epsilon);
  }
  toString(): string {
    return `[Linear: ${this.linear}, Origin: ${this.origin}]`;
  }
}
