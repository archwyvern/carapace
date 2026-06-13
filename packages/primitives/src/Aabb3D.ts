import { Vector3 } from "./Vector3";
import { Plane3D } from "./Plane3D";

/**
 * Immutable 3D axis-aligned bounding box stored as `min`/`max` corners. TS mirror of
 * `Primitives.Aabb3D`. The `Transformed(Transform3D)` method is omitted (Transform3D is not
 * ported in this package).
 */
export class Aabb3D {
  constructor(
    readonly min: Vector3 = Vector3.zero,
    readonly max: Vector3 = Vector3.zero,
  ) {}

  static fromMinMax(min: Vector3, max: Vector3): Aabb3D {
    return new Aabb3D(min, max);
  }
  /** From a position (min corner) and a size. */
  static fromPositionSize(position: Vector3, size: Vector3): Aabb3D {
    return new Aabb3D(position, position.add(size));
  }

  get position(): Vector3 {
    return this.min;
  }
  get end(): Vector3 {
    return this.max;
  }
  get size(): Vector3 {
    return this.max.sub(this.min);
  }
  get extents(): Vector3 {
    return this.max.sub(this.min).scale(0.5);
  }
  get center(): Vector3 {
    return this.min.add(this.max).scale(0.5);
  }
  get volume(): number {
    const s = this.max.sub(this.min);
    return s.x * s.y * s.z;
  }

  abs(): Aabb3D {
    return Aabb3D.fromMinMax(this.min.min(this.max), this.min.max(this.max));
  }
  getCenter(): Vector3 {
    return this.center;
  }
  encloses(b: Aabb3D): boolean {
    return (
      this.min.x <= b.min.x && this.max.x >= b.max.x &&
      this.min.y <= b.min.y && this.max.y >= b.max.y &&
      this.min.z <= b.min.z && this.max.z >= b.max.z
    );
  }
  expand(point: Vector3): Aabb3D {
    return Aabb3D.fromMinMax(this.min.min(point), this.max.max(point));
  }
  /** One of the eight corners by index (0..7). */
  getEndpoint(idx: number): Vector3 {
    switch (idx) {
      case 0:
        return new Vector3(this.min.x, this.min.y, this.min.z);
      case 1:
        return new Vector3(this.min.x, this.min.y, this.max.z);
      case 2:
        return new Vector3(this.min.x, this.max.y, this.min.z);
      case 3:
        return new Vector3(this.min.x, this.max.y, this.max.z);
      case 4:
        return new Vector3(this.max.x, this.min.y, this.min.z);
      case 5:
        return new Vector3(this.max.x, this.min.y, this.max.z);
      case 6:
        return new Vector3(this.max.x, this.max.y, this.min.z);
      case 7:
        return new Vector3(this.max.x, this.max.y, this.max.z);
      default:
        throw new RangeError("idx out of range (0..7)");
    }
  }
  /** Unit axis along the longest extent. */
  getLongestAxis(): Vector3 {
    const s = this.max.sub(this.min);
    let axis = new Vector3(1, 0, 0);
    let maxSize = s.x;
    if (s.y > maxSize) {
      axis = new Vector3(0, 1, 0);
      maxSize = s.y;
    }
    if (s.z > maxSize) axis = new Vector3(0, 0, 1);
    return axis;
  }
  getLongestAxisIndex(): number {
    const s = this.max.sub(this.min);
    let axis = 0;
    let maxSize = s.x;
    if (s.y > maxSize) {
      axis = 1;
      maxSize = s.y;
    }
    if (s.z > maxSize) axis = 2;
    return axis;
  }
  getLongestAxisSize(): number {
    const s = this.max.sub(this.min);
    let maxSize = s.x;
    if (s.y > maxSize) maxSize = s.y;
    if (s.z > maxSize) maxSize = s.z;
    return maxSize;
  }
  /** Unit axis along the shortest extent. */
  getShortestAxis(): Vector3 {
    const s = this.max.sub(this.min);
    let axis = new Vector3(1, 0, 0);
    let minSize = s.x;
    if (s.y < minSize) {
      axis = new Vector3(0, 1, 0);
      minSize = s.y;
    }
    if (s.z < minSize) axis = new Vector3(0, 0, 1);
    return axis;
  }
  getShortestAxisIndex(): number {
    const s = this.max.sub(this.min);
    let axis = 0;
    let minSize = s.x;
    if (s.y < minSize) {
      axis = 1;
      minSize = s.y;
    }
    if (s.z < minSize) axis = 2;
    return axis;
  }
  getShortestAxisSize(): number {
    const s = this.max.sub(this.min);
    let minSize = s.x;
    if (s.y < minSize) minSize = s.y;
    if (s.z < minSize) minSize = s.z;
    return minSize;
  }
  /** Furthest corner along a direction (support point). */
  getSupport(dir: Vector3): Vector3 {
    return new Vector3(dir.x > 0 ? this.max.x : this.min.x, dir.y > 0 ? this.max.y : this.min.y, dir.z > 0 ? this.max.z : this.min.z);
  }
  grow(by: number): Aabb3D {
    const v = new Vector3(by, by, by);
    return Aabb3D.fromMinMax(this.min.sub(v), this.max.add(v));
  }
  hasPoint(point: Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }
  hasSurface(): boolean {
    return this.max.x > this.min.x || this.max.y > this.min.y || this.max.z > this.min.z;
  }
  hasVolume(): boolean {
    return this.max.x > this.min.x && this.max.y > this.min.y && this.max.z > this.min.z;
  }
  intersection(b: Aabb3D): Aabb3D {
    if (this.min.x > b.max.x || this.max.x < b.min.x) return new Aabb3D();
    if (this.min.y > b.max.y || this.max.y < b.min.y) return new Aabb3D();
    if (this.min.z > b.max.z || this.max.z < b.min.z) return new Aabb3D();
    return Aabb3D.fromMinMax(this.min.max(b.min), this.max.min(b.max));
  }
  intersects(b: Aabb3D): boolean {
    return (
      this.min.x < b.max.x && this.max.x > b.min.x &&
      this.min.y < b.max.y && this.max.y > b.min.y &&
      this.min.z < b.max.z && this.max.z > b.min.z
    );
  }
  /** Whether the box has corners on both sides of a plane. */
  intersectsPlane(plane: Plane3D): boolean {
    let over = false;
    let under = false;
    for (let i = 0; i < 8; i++) {
      if (plane.distanceTo(this.getEndpoint(i)) > 0) over = true;
      else under = true;
      if (over && under) return true;
    }
    return false;
  }
  /** Whether a finite segment intersects the box (slab method). */
  intersectsSegment(from: Vector3, to: Vector3): boolean {
    let min = 0;
    let max = 1;
    for (let i = 0; i < 3; i++) {
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
      if (cmin > min) min = cmin;
      if (cmax < max) max = cmax;
      if (max < min) return false;
    }
    return true;
  }
  isFinite(): boolean {
    return this.min.isFinite() && this.max.isFinite();
  }
  merge(b: Aabb3D): Aabb3D {
    return Aabb3D.fromMinMax(this.min.min(b.min), this.max.max(b.max));
  }
  /** Signed distance from the closest point of this box to a plane. */
  minProjection(plane: Plane3D): number {
    const h = this.extents;
    const extent = Math.abs(plane.normal.x) * h.x + Math.abs(plane.normal.y) * h.y + Math.abs(plane.normal.z) * h.z;
    return plane.distanceTo(this.center) - extent;
  }
  /** Signed distance from the farthest point of this box to a plane. */
  maxProjection(plane: Plane3D): number {
    const h = this.extents;
    const extent = Math.abs(plane.normal.x) * h.x + Math.abs(plane.normal.y) * h.y + Math.abs(plane.normal.z) * h.z;
    return plane.distanceTo(this.center) + extent;
  }

  equals(b: Aabb3D): boolean {
    return this.min.equals(b.min) && this.max.equals(b.max);
  }
  isEqualApprox(b: Aabb3D, epsilon = 1e-6): boolean {
    return this.min.isEqualApprox(b.min, epsilon) && this.max.isEqualApprox(b.max, epsilon);
  }
  toString(): string {
    return `[${this.min} → ${this.max}]`;
  }
}
