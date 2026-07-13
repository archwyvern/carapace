import { APPROX_EPSILON } from "./internal";
import { Vector3 } from "./Vector3";

/**
 * Immutable infinite flat surface in 3D, defined by a unit-ish `normal` and a distance term `d`.
 * TS mirror of `Primitives.Plane3D`. Used for clipping, distance checks, and reflections.
 */
export class Plane3D {
  constructor(
    readonly normal: Vector3 = Vector3.zero,
    readonly d = 0,
  ) {}

  static readonly planeYZ = new Plane3D(new Vector3(1, 0, 0), 0);
  static readonly planeXZ = new Plane3D(new Vector3(0, 1, 0), 0);
  static readonly planeXY = new Plane3D(new Vector3(0, 0, 1), 0);

  /** From raw coefficients `(a, b, c, d)`. */
  static fromCoefficients(a: number, b: number, c: number, d: number): Plane3D {
    return new Plane3D(new Vector3(a, b, c), d);
  }
  /** From a normal and a point on the plane. */
  static fromNormalPoint(normal: Vector3, point: Vector3): Plane3D {
    return new Plane3D(normal, normal.dot(point));
  }
  /** From three non-collinear points. */
  static fromPoints(v1: Vector3, v2: Vector3, v3: Vector3): Plane3D {
    const normal = v1.sub(v3).cross(v1.sub(v2)).normalized();
    return new Plane3D(normal, normal.dot(v1));
  }

  get x(): number {
    return this.normal.x;
  }
  get y(): number {
    return this.normal.y;
  }
  get z(): number {
    return this.normal.z;
  }

  /** Signed distance from the plane to a point. Positive on the normal side. */
  distanceTo(point: Vector3): number {
    return this.normal.dot(point) - this.d;
  }
  /** Point on the plane closest to the origin. */
  getCenter(): Vector3 {
    return this.normal.scale(this.d);
  }
  hasPoint(point: Vector3, tolerance = APPROX_EPSILON): boolean {
    return Math.abs(this.normal.dot(point) - this.d) <= tolerance;
  }
  isPointOver(point: Vector3): boolean {
    return this.normal.dot(point) > this.d;
  }
  /** Project a point onto the plane. */
  project(point: Vector3): Vector3 {
    return point.sub(this.normal.scale(this.distanceTo(point)));
  }
  isFinite(): boolean {
    return this.normal.isFinite() && Number.isFinite(this.d);
  }
  /** Normalized plane (unit-length normal). */
  normalized(): Plane3D {
    const len = this.normal.length();
    if (len === 0) return new Plane3D(Vector3.zero, 0);
    return new Plane3D(this.normal.div(len), this.d / len);
  }
  /** Negate orientation and distance. */
  neg(): Plane3D {
    return new Plane3D(this.normal.neg(), -this.d);
  }

  /** Intersection point of three planes, or null when they don't meet at a unique point. */
  intersect3(b: Plane3D, c: Plane3D): Vector3 | null {
    const denom = this.normal.cross(b.normal).dot(c.normal);
    if (Math.abs(denom) < APPROX_EPSILON) return null;
    const result = b.normal
      .cross(c.normal)
      .scale(this.d)
      .add(c.normal.cross(this.normal).scale(b.d))
      .add(this.normal.cross(b.normal).scale(c.d));
    return result.div(denom);
  }
  /** Intersection with a ray, or null when parallel or pointing away. */
  intersectsRay(from: Vector3, dir: Vector3): Vector3 | null {
    const den = this.normal.dot(dir);
    if (Math.abs(den) < APPROX_EPSILON) return null;
    const t = (this.d - this.normal.dot(from)) / den;
    if (t < -APPROX_EPSILON) return null;
    return from.add(dir.scale(t));
  }
  /** Intersection with a segment, or null when parallel or out of bounds. */
  intersectsSegment(begin: Vector3, end: Vector3): Vector3 | null {
    const segment = begin.sub(end);
    const den = this.normal.dot(segment);
    if (Math.abs(den) < APPROX_EPSILON) return null;
    const dist = (this.normal.dot(begin) - this.d) / den;
    if (dist < -APPROX_EPSILON || dist > 1 + APPROX_EPSILON) return null;
    return begin.sub(segment.scale(dist));
  }

  equals(o: Plane3D): boolean {
    return this.normal.equals(o.normal) && this.d === o.d;
  }
  isEqualApprox(o: Plane3D, epsilon = 1e-6): boolean {
    return this.normal.isEqualApprox(o.normal, epsilon) && Math.abs(this.d - o.d) < epsilon;
  }
  toString(): string {
    return `${this.normal}, ${this.d}`;
  }
}
