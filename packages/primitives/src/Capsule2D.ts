import { APPROX_EPSILON, clampScalar } from "./internal";
import { Vector2 } from "./Vector2";

/**
 * Immutable 2D capsule (a segment with a radius — a stadium). TS mirror of
 * `Primitives.Capsule2D` (the 2D analog of `Capsule3D`).
 */
export class Capsule2D {
  constructor(
    readonly start: Vector2 = Vector2.zero,
    readonly end: Vector2 = Vector2.zero,
    readonly radius = 0,
  ) {}

  get segmentLength(): number {
    return this.end.sub(this.start).length();
  }
  /** Total end-to-end length including the hemispherical caps. */
  get totalLength(): number {
    return this.segmentLength + this.radius * 2;
  }

  /** Closest point on the axis segment to a given point. */
  closestPointOnAxis(point: Vector2): Vector2 {
    const axis = this.end.sub(this.start);
    const lenSq = axis.lengthSquared();
    if (lenSq <= APPROX_EPSILON) return this.start;
    const t = point.sub(this.start).dot(axis) / lenSq;
    if (t <= 0) return this.start;
    if (t >= 1) return this.end;
    return this.start.add(axis.scale(t));
  }
  /** Closest point on the capsule surface to a given point. */
  closestPoint(point: Vector2): Vector2 {
    const onAxis = this.closestPointOnAxis(point);
    const delta = point.sub(onAxis);
    const lenSq = delta.lengthSquared();
    if (lenSq <= APPROX_EPSILON) return onAxis.add(new Vector2(this.radius, 0));
    return onAxis.add(delta.scale(this.radius / Math.sqrt(lenSq)));
  }
  /** Shortest distance to the surface; 0 when the point is inside. */
  distanceToPoint(point: Vector2): number {
    return Math.max(0, Math.sqrt(this.axisDistanceSquared(point)) - this.radius);
  }
  containsPoint(point: Vector2): boolean {
    return this.axisDistanceSquared(point) <= this.radius * this.radius;
  }
  intersects(other: Capsule2D): boolean {
    const segDistSq = this.segmentDistanceSquared(other);
    const sumR = this.radius + other.radius;
    return segDistSq <= sumR * sumR;
  }

  private axisDistanceSquared(point: Vector2): number {
    return point.sub(this.closestPointOnAxis(point)).lengthSquared();
  }

  /** Squared distance between this capsule's axis segment and another's. */
  segmentDistanceSquared(other: Capsule2D): number {
    const p1 = this.start;
    const p2 = other.start;
    const d1 = this.end.sub(p1);
    const d2 = other.end.sub(p2);
    const r = p1.sub(p2);
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);

    let s: number;
    let t: number;
    if (a <= APPROX_EPSILON && e <= APPROX_EPSILON) {
      s = 0;
      t = 0;
    } else if (a <= APPROX_EPSILON) {
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
        s = denom !== 0 ? clampScalar((b * f - c * e) / denom, 0, 1) : 0;
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

    const closest1 = p1.add(d1.scale(s));
    const closest2 = p2.add(d2.scale(t));
    return closest1.sub(closest2).lengthSquared();
  }

  equals(o: Capsule2D): boolean {
    return this.start.equals(o.start) && this.end.equals(o.end) && this.radius === o.radius;
  }
  isEqualApprox(o: Capsule2D, epsilon = 1e-6): boolean {
    return this.start.isEqualApprox(o.start, epsilon) && this.end.isEqualApprox(o.end, epsilon) && Math.abs(this.radius - o.radius) < epsilon;
  }
  toString(): string {
    return `[Start:${this.start} End:${this.end} R:${this.radius}]`;
  }
}
