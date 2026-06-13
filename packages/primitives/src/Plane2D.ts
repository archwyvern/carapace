import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";

/**
 * Immutable infinite oriented line in 2D, defined by a `normal` direction and a scalar offset
 * `d` along that normal. TS mirror of `Primitives.Plane2D` (the 2D analog of `Plane3D`).
 */
export class Plane2D {
  constructor(
    readonly normal: Vector2 = Vector2.zero,
    readonly d = 0,
  ) {}

  /** From explicit normal components and distance. */
  static fromCoefficients(a: number, b: number, d: number): Plane2D {
    return new Plane2D(new Vector2(a, b), d);
  }
  /** From a normal and an in-plane point. */
  static fromNormalPoint(normal: Vector2, point: Vector2): Plane2D {
    return new Plane2D(normal, normal.dot(point));
  }

  get x(): number {
    return this.normal.x;
  }
  get y(): number {
    return this.normal.y;
  }

  /** Signed distance from the plane to a point. Positive on the normal side. */
  distanceTo(point: Vector2): number {
    return this.normal.dot(point) - this.d;
  }
  /** Point on the plane closest to the origin. */
  getCenter(): Vector2 {
    return this.normal.scale(this.d);
  }
  hasPoint(point: Vector2, tolerance = APPROX_EPSILON): boolean {
    return Math.abs(this.distanceTo(point)) <= tolerance;
  }
  isPointOver(point: Vector2): boolean {
    return this.distanceTo(point) > 0;
  }
  /** Project a point onto the plane. */
  project(point: Vector2): Vector2 {
    return point.sub(this.normal.scale(this.distanceTo(point)));
  }
  /** Negate orientation and distance. */
  neg(): Plane2D {
    return new Plane2D(this.normal.neg(), -this.d);
  }

  /** Intersection with a ray, or null when parallel/pointing away. */
  intersectsRay(from: Vector2, dir: Vector2): Vector2 | null {
    const den = this.normal.dot(dir);
    if (Math.abs(den) <= APPROX_EPSILON) return null;
    const t = (this.d - this.normal.dot(from)) / den;
    if (t < 0) return null;
    return from.add(dir.scale(t));
  }
  /** Intersection with a finite segment, or null when it does not cross. */
  intersectsSegment(begin: Vector2, end: Vector2): Vector2 | null {
    const dir = end.sub(begin);
    const den = this.normal.dot(dir);
    if (Math.abs(den) <= APPROX_EPSILON) return null;
    const t = (this.d - this.normal.dot(begin)) / den;
    if (t < 0 || t > 1) return null;
    return begin.add(dir.scale(t));
  }
  /** Intersection of two oriented lines, or null when parallel. */
  intersect(other: Plane2D): Vector2 | null {
    const det = this.normal.x * other.normal.y - this.normal.y * other.normal.x;
    if (Math.abs(det) <= APPROX_EPSILON) return null;
    const inv = 1 / det;
    return new Vector2(
      (other.normal.y * this.d - this.normal.y * other.d) * inv,
      (this.normal.x * other.d - other.normal.x * this.d) * inv,
    );
  }

  equals(o: Plane2D): boolean {
    return this.normal.equals(o.normal) && this.d === o.d;
  }
  isEqualApprox(o: Plane2D, epsilon = 1e-6): boolean {
    return this.normal.isEqualApprox(o.normal, epsilon) && Math.abs(this.d - o.d) < epsilon;
  }
  toString(): string {
    return `[N:${this.normal} D:${this.d}]`;
  }
}
