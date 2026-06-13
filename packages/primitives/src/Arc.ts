import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";

const TAU = Math.PI * 2;

function normalizeAngle(angle: number): number {
  let a = angle % TAU;
  if (a < 0) a += TAU;
  return a;
}

/**
 * Immutable 2D circular arc, defined by `center`, `radius`, `startAngle`, and `sweepAngle`
 * (radians; positive sweep is counter-clockwise). TS mirror of `Primitives.Arc`.
 */
export class Arc {
  constructor(
    readonly center: Vector2 = Vector2.zero,
    readonly radius = 0,
    readonly startAngle = 0,
    readonly sweepAngle = 0,
  ) {}

  get endAngle(): number {
    return this.startAngle + this.sweepAngle;
  }
  get length(): number {
    return Math.abs(this.sweepAngle) * this.radius;
  }
  get startPoint(): Vector2 {
    return this.center.add(new Vector2(Math.cos(this.startAngle), Math.sin(this.startAngle)).scale(this.radius));
  }
  get endPoint(): Vector2 {
    const end = this.startAngle + this.sweepAngle;
    return this.center.add(new Vector2(Math.cos(end), Math.sin(end)).scale(this.radius));
  }

  /** Point on the arc at parametric position `t` (0 = start, 1 = end). */
  getPoint(t: number): Vector2 {
    const angle = this.startAngle + this.sweepAngle * t;
    return this.center.add(new Vector2(Math.cos(angle), Math.sin(angle)).scale(this.radius));
  }
  /** Whether an angle (radians) falls within the arc's angular range. */
  containsAngle(angle: number): boolean {
    const normalized = normalizeAngle(angle - this.startAngle);
    if (this.sweepAngle >= 0) return normalized <= this.sweepAngle + APPROX_EPSILON;
    const negNormalized = normalized - TAU;
    return negNormalized >= this.sweepAngle - APPROX_EPSILON;
  }
  /** Closest point on the arc; clamps to the nearest endpoint when outside the range. */
  closestPoint(point: Vector2): Vector2 {
    const delta = point.sub(this.center);
    const angle = Math.atan2(delta.y, delta.x);
    if (this.containsAngle(angle)) {
      return this.center.add(new Vector2(Math.cos(angle), Math.sin(angle)).scale(this.radius));
    }
    const start = this.startPoint;
    const end = this.endPoint;
    return point.sub(start).lengthSquared() <= point.sub(end).lengthSquared() ? start : end;
  }
  /** Points along the arc, `segments + 1` of them (minimum 2 segments). */
  tessellate(segments: number): Vector2[] {
    if (segments < 2) segments = 2;
    const points: Vector2[] = [];
    const step = this.sweepAngle / segments;
    for (let i = 0; i <= segments; i++) {
      const angle = this.startAngle + step * i;
      points.push(this.center.add(new Vector2(Math.cos(angle), Math.sin(angle)).scale(this.radius)));
    }
    return points;
  }

  equals(o: Arc): boolean {
    return (
      this.center.equals(o.center) &&
      this.radius === o.radius &&
      this.startAngle === o.startAngle &&
      this.sweepAngle === o.sweepAngle
    );
  }
  isEqualApprox(o: Arc, epsilon = 1e-6): boolean {
    return (
      this.center.isEqualApprox(o.center, epsilon) &&
      Math.abs(this.radius - o.radius) < epsilon &&
      Math.abs(this.startAngle - o.startAngle) < epsilon &&
      Math.abs(this.sweepAngle - o.sweepAngle) < epsilon
    );
  }
  toString(): string {
    return `[Center: ${this.center}, Radius: ${this.radius}, Start: ${this.startAngle}, Sweep: ${this.sweepAngle}]`;
  }
}
