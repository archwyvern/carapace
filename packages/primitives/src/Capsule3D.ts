import { APPROX_EPSILON, clampScalar } from "./internal";
import { Vector3 } from "./Vector3";
import { Aabb3D } from "./Aabb3D";

/**
 * Immutable 3D capsule (a segment with a radius — a pill). TS mirror of `Primitives.Capsule3D`.
 * Common for character collision: slides smoothly over edges and corners.
 */
export class Capsule3D {
  constructor(
    readonly start: Vector3 = Vector3.zero,
    readonly end: Vector3 = Vector3.zero,
    readonly radius = 0,
  ) {}

  get segmentLength(): number {
    return this.end.sub(this.start).length();
  }
  /** Total end-to-end length including the hemispherical caps. */
  get totalLength(): number {
    return this.segmentLength + this.radius * 2;
  }

  /** Closest point on the capsule surface to a given point. */
  closestPoint(point: Vector3): Vector3 {
    const onAxis = this.closestPointOnAxis(point);
    const delta = point.sub(onAxis);
    const lenSq = delta.lengthSquared();
    if (lenSq <= APPROX_EPSILON) return onAxis.add(new Vector3(this.radius, 0, 0));
    return onAxis.add(delta.scale(this.radius / Math.sqrt(lenSq)));
  }
  /** Shortest distance to the surface; 0 when the point is inside. */
  distanceToPoint(point: Vector3): number {
    return Math.max(0, Math.sqrt(this.axisDistanceSquared(point)) - this.radius);
  }
  containsPoint(point: Vector3): boolean {
    return this.axisDistanceSquared(point) <= this.radius * this.radius;
  }
  intersects(other: Capsule3D): boolean {
    const radiusSum = this.radius + other.radius;
    const distSq = Capsule3D.segmentToSegmentDistanceSquared(this.start, this.end, other.start, other.end);
    return distSq <= radiusSum * radiusSum;
  }
  /** Axis-aligned bounding box fully containing this capsule. */
  getAabb(): Aabb3D {
    const r = new Vector3(this.radius, this.radius, this.radius);
    const min = this.start.min(this.end).sub(r);
    const max = this.start.max(this.end).add(r);
    return Aabb3D.fromMinMax(min, max);
  }

  private closestPointOnAxis(point: Vector3): Vector3 {
    const ab = this.end.sub(this.start);
    const abLenSq = ab.lengthSquared();
    if (abLenSq <= APPROX_EPSILON) return this.start;
    const t = clampScalar(point.sub(this.start).dot(ab) / abLenSq, 0, 1);
    return this.start.add(ab.scale(t));
  }

  private axisDistanceSquared(point: Vector3): number {
    return point.sub(this.closestPointOnAxis(point)).lengthSquared();
  }

  private static segmentToSegmentDistanceSquared(a1: Vector3, b1: Vector3, a2: Vector3, b2: Vector3): number {
    const d1 = b1.sub(a1);
    const d2 = b2.sub(a2);
    const r = a1.sub(a2);
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);

    let s: number;
    let t: number;
    if (a <= APPROX_EPSILON && e <= APPROX_EPSILON) return r.lengthSquared();

    if (a <= APPROX_EPSILON) {
      s = 0;
      t = clampScalar(f / e, 0, 1);
    } else {
      const c = d1.dot(r);
      if (e <= APPROX_EPSILON) {
        t = 0;
        s = clampScalar(-c / a, 0, 1);
      } else {
        const b = d1.dot(d2);
        const denom = a * e - b * b;
        s = denom <= APPROX_EPSILON ? 0 : clampScalar((b * f - c * e) / denom, 0, 1);
        t = (b * s + f) / e;
        if (t < 0) {
          t = 0;
          s = clampScalar(-c / a, 0, 1);
        } else if (t > 1) {
          t = 1;
          s = clampScalar((b - c) / a, 0, 1);
        }
      }
    }

    const p0 = a1.add(d1.scale(s));
    const p1 = a2.add(d2.scale(t));
    return p0.sub(p1).lengthSquared();
  }

  equals(o: Capsule3D): boolean {
    return this.start.equals(o.start) && this.end.equals(o.end) && this.radius === o.radius;
  }
  isEqualApprox(o: Capsule3D, epsilon = 1e-6): boolean {
    return this.start.isEqualApprox(o.start, epsilon) && this.end.isEqualApprox(o.end, epsilon) && Math.abs(this.radius - o.radius) < epsilon;
  }
  toString(): string {
    return `[S: ${this.start}, E: ${this.end}, R: ${this.radius}]`;
  }
}
