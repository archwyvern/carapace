import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";

/**
 * Immutable 2D line segment between two points. TS mirror of `Primitives.Segment2D`.
 */
export class Segment2D {
  constructor(
    readonly point1: Vector2 = Vector2.zero,
    readonly point2: Vector2 = Vector2.zero,
  ) {}

  /** Vector from `point1` to `point2`. */
  get direction(): Vector2 {
    return this.point2.sub(this.point1);
  }
  get length(): number {
    return this.point2.sub(this.point1).length();
  }
  get lengthSquared(): number {
    return this.point2.sub(this.point1).lengthSquared();
  }
  get midpoint(): Vector2 {
    return this.point1.add(this.point2).scale(0.5);
  }

  /** Closest point on the segment to a given point. */
  closestPoint(point: Vector2): Vector2 {
    const dir = this.point2.sub(this.point1);
    const lenSq = dir.lengthSquared();
    if (lenSq <= APPROX_EPSILON) return this.point1;
    const t = point.sub(this.point1).dot(dir) / lenSq;
    if (t <= 0) return this.point1;
    if (t >= 1) return this.point2;
    return this.point1.add(dir.scale(t));
  }
  distanceToPoint(point: Vector2): number {
    return point.sub(this.closestPoint(point)).length();
  }
  distanceSquaredToPoint(point: Vector2): number {
    return point.sub(this.closestPoint(point)).lengthSquared();
  }
  /** This segment with endpoints swapped. */
  reversed(): Segment2D {
    return new Segment2D(this.point2, this.point1);
  }

  equals(o: Segment2D): boolean {
    return this.point1.equals(o.point1) && this.point2.equals(o.point2);
  }
  isEqualApprox(o: Segment2D, epsilon = 1e-6): boolean {
    return this.point1.isEqualApprox(o.point1, epsilon) && this.point2.isEqualApprox(o.point2, epsilon);
  }
  toString(): string {
    return `[${this.point1} → ${this.point2}]`;
  }
}
