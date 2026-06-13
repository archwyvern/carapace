import { APPROX_EPSILON } from "./internal";
import { Vector2 } from "./Vector2";
import { Rect2 } from "./Rect2";

const TAU = Math.PI * 2;

/**
 * Immutable 2D circle, defined by a `center` and `radius`. TS mirror of `Primitives.Circle`.
 */
export class Circle {
  constructor(
    readonly center: Vector2 = Vector2.zero,
    readonly radius = 0,
  ) {}

  get radiusSquared(): number {
    return this.radius * this.radius;
  }
  get diameter(): number {
    return this.radius * 2;
  }
  get area(): number {
    return Math.PI * this.radius * this.radius;
  }
  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  /** Whether a point lies inside or on the circle boundary. */
  containsPoint(point: Vector2): boolean {
    return point.sub(this.center).lengthSquared() <= this.radiusSquared;
  }
  /** Closest point on the boundary (returns a boundary point even when the point is the center). */
  closestPoint(point: Vector2): Vector2 {
    const delta = point.sub(this.center);
    const lenSq = delta.lengthSquared();
    if (lenSq <= APPROX_EPSILON) return this.center.add(new Vector2(this.radius, 0));
    return this.center.add(delta.div(Math.sqrt(lenSq)).scale(this.radius));
  }
  /** Shortest distance to the boundary; 0 when the point is inside. */
  distanceToPoint(point: Vector2): number {
    return Math.max(0, point.sub(this.center).length() - this.radius);
  }
  intersectsCircle(other: Circle): boolean {
    const radiiSum = this.radius + other.radius;
    return other.center.sub(this.center).lengthSquared() <= radiiSum * radiiSum;
  }
  intersectsRect(rect: Rect2): boolean {
    const rectEnd = rect.position.add(rect.size);
    const closestX = Math.max(rect.position.x, Math.min(this.center.x, rectEnd.x));
    const closestY = Math.max(rect.position.y, Math.min(this.center.y, rectEnd.y));
    const closest = new Vector2(closestX, closestY);
    return closest.sub(this.center).lengthSquared() <= this.radiusSquared;
  }
  /** Points evenly distributed around the circle (minimum 3 segments). */
  tessellate(segments: number): Vector2[] {
    if (segments < 3) segments = 3;
    const points: Vector2[] = [];
    const step = TAU / segments;
    for (let i = 0; i < segments; i++) {
      const angle = step * i;
      points.push(this.center.add(new Vector2(Math.cos(angle), Math.sin(angle)).scale(this.radius)));
    }
    return points;
  }
  /** Smallest circle enclosing both this and another. */
  merge(other: Circle): Circle {
    const delta = other.center.sub(this.center);
    const dist = delta.length();
    if (dist + other.radius <= this.radius) return this;
    if (dist + this.radius <= other.radius) return other;
    const newRadius = (dist + this.radius + other.radius) * 0.5;
    const newCenter =
      dist <= APPROX_EPSILON ? this.center : this.center.add(delta.div(dist).scale(newRadius - this.radius));
    return new Circle(newCenter, newRadius);
  }

  equals(o: Circle): boolean {
    return this.center.equals(o.center) && this.radius === o.radius;
  }
  isEqualApprox(o: Circle, epsilon = 1e-6): boolean {
    return this.center.isEqualApprox(o.center, epsilon) && Math.abs(this.radius - o.radius) < epsilon;
  }
  toString(): string {
    return `[Center: ${this.center}, Radius: ${this.radius}]`;
  }
}
