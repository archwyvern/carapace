import { Vector2 } from "./Vector2";
import { Rect2 } from "./Rect2";

/**
 * Immutable 2D axis-aligned bounding box stored as `min`/`max` corners. TS mirror of
 * `Primitives.Aabb2D` (the physics/spatial counterpart to `Rect2`'s position+size UI rect).
 */
export class Aabb2D {
  constructor(
    readonly min: Vector2 = Vector2.zero,
    readonly max: Vector2 = Vector2.zero,
  ) {}

  /** From explicit min and max corners. */
  static fromMinMax(min: Vector2, max: Vector2): Aabb2D {
    return new Aabb2D(min, max);
  }
  /** From a position (min corner) and a size. */
  static fromPositionSize(position: Vector2, size: Vector2): Aabb2D {
    return new Aabb2D(position, position.add(size));
  }
  /** From scalar position and size. */
  static fromXYWH(x: number, y: number, width: number, height: number): Aabb2D {
    return new Aabb2D(new Vector2(x, y), new Vector2(x + width, y + height));
  }
  /** Convert from a `Rect2` (UI pos+size). */
  static fromRect2(rect: Rect2): Aabb2D {
    return Aabb2D.fromPositionSize(rect.position, rect.size);
  }

  get size(): Vector2 {
    return this.max.sub(this.min);
  }
  get extents(): Vector2 {
    return this.max.sub(this.min).scale(0.5);
  }
  get center(): Vector2 {
    return this.min.add(this.max).scale(0.5);
  }
  get area(): number {
    const s = this.max.sub(this.min);
    return s.x * s.y;
  }
  /** Perimeter (`2*(w+h)`) — the 2D surface-area-heuristic metric. */
  get perimeter(): number {
    const s = this.max.sub(this.min);
    return 2 * (s.x + s.y);
  }

  /** Corners reordered so all extents are non-negative. */
  abs(): Aabb2D {
    return Aabb2D.fromMinMax(this.min.min(this.max), this.min.max(this.max));
  }
  encloses(b: Aabb2D): boolean {
    return this.min.x <= b.min.x && this.max.x >= b.max.x && this.min.y <= b.min.y && this.max.y >= b.max.y;
  }
  /** Expanded to include a point. */
  expand(point: Vector2): Aabb2D {
    return Aabb2D.fromMinMax(this.min.min(point), this.max.max(point));
  }
  /** One of the four corners by index (0..3). */
  getEndpoint(idx: number): Vector2 {
    switch (idx) {
      case 0:
        return new Vector2(this.min.x, this.min.y);
      case 1:
        return new Vector2(this.max.x, this.min.y);
      case 2:
        return new Vector2(this.min.x, this.max.y);
      case 3:
        return new Vector2(this.max.x, this.max.y);
      default:
        throw new RangeError("idx out of range (0..3)");
    }
  }
  /** Grown uniformly outward. */
  grow(by: number): Aabb2D {
    const v = new Vector2(by, by);
    return Aabb2D.fromMinMax(this.min.sub(v), this.max.add(v));
  }
  hasPoint(p: Vector2): boolean {
    return p.x >= this.min.x && p.x <= this.max.x && p.y >= this.min.y && p.y <= this.max.y;
  }
  hasSurface(): boolean {
    return this.max.x > this.min.x || this.max.y > this.min.y;
  }
  hasArea(): boolean {
    return this.max.x > this.min.x && this.max.y > this.min.y;
  }
  /** Intersection with another box. Returns an empty box when disjoint. */
  intersection(b: Aabb2D): Aabb2D {
    if (this.min.x > b.max.x || this.max.x < b.min.x) return new Aabb2D();
    if (this.min.y > b.max.y || this.max.y < b.min.y) return new Aabb2D();
    return Aabb2D.fromMinMax(this.min.max(b.min), this.max.min(b.max));
  }
  intersects(b: Aabb2D): boolean {
    return this.min.x < b.max.x && this.max.x > b.min.x && this.min.y < b.max.y && this.max.y > b.min.y;
  }
  /** Whether a finite segment intersects the box (slab method). */
  intersectsSegment(from: Vector2, to: Vector2): boolean {
    let tMin = 0;
    let tMax = 1;
    for (let i = 0; i < 2; i++) {
      const segFrom = from.getComponent(i);
      const segTo = to.getComponent(i);
      const boxBegin = this.min.getComponent(i);
      const boxEnd = this.max.getComponent(i);
      let cmin: number;
      let cmax: number;
      if (segFrom < segTo) {
        if (segFrom > boxEnd || segTo < boxBegin) return false;
        const length = segTo - segFrom;
        cmin = segFrom < boxBegin ? (boxBegin - segFrom) / length : 0;
        cmax = segTo > boxEnd ? (boxEnd - segFrom) / length : 1;
      } else {
        if (segTo > boxEnd || segFrom < boxBegin) return false;
        const length = segTo - segFrom;
        cmin = segFrom > boxEnd ? (boxEnd - segFrom) / length : 0;
        cmax = segTo < boxBegin ? (boxBegin - segFrom) / length : 1;
      }
      if (cmin > tMin) tMin = cmin;
      if (cmax < tMax) tMax = cmax;
      if (tMax < tMin) return false;
    }
    return true;
  }
  isFinite(): boolean {
    return this.min.isFinite() && this.max.isFinite();
  }
  /** Smallest box containing this and another. */
  merge(b: Aabb2D): Aabb2D {
    return Aabb2D.fromMinMax(this.min.min(b.min), this.max.max(b.max));
  }
  /** Convert to a `Rect2` (UI pos+size). */
  toRect2(): Rect2 {
    return new Rect2(this.min, this.max.sub(this.min));
  }

  equals(b: Aabb2D): boolean {
    return this.min.equals(b.min) && this.max.equals(b.max);
  }
  isEqualApprox(b: Aabb2D, epsilon = 1e-6): boolean {
    return this.min.isEqualApprox(b.min, epsilon) && this.max.isEqualApprox(b.max, epsilon);
  }
  toString(): string {
    return `[${this.min} → ${this.max}]`;
  }
}
