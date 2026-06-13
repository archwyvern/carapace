import { Vector2 } from "./Vector2";

/**
 * Immutable axis-aligned rectangle (double precision), as `position` + `size`. TS mirror of
 * `Numerics.Rect2`. `hasPoint` / `intersects` treat the far edge as exclusive (Godot semantics).
 */
export class Rect2 {
  constructor(
    readonly position: Vector2 = Vector2.zero,
    readonly size: Vector2 = Vector2.zero,
  ) {}

  static fromXYWH(x: number, y: number, width: number, height: number): Rect2 {
    return new Rect2(new Vector2(x, y), new Vector2(width, height));
  }

  get x(): number {
    return this.position.x;
  }
  get y(): number {
    return this.position.y;
  }
  get width(): number {
    return this.size.x;
  }
  get height(): number {
    return this.size.y;
  }
  /** Far corner (`position + size`). */
  get end(): Vector2 {
    return this.position.add(this.size);
  }
  get center(): Vector2 {
    return this.position.add(this.size.scale(0.5));
  }
  get area(): number {
    return this.size.x * this.size.y;
  }

  hasArea(): boolean {
    return this.size.x > 0 && this.size.y > 0;
  }
  hasPoint(p: Vector2): boolean {
    return p.x >= this.position.x && p.y >= this.position.y && p.x < this.x + this.width && p.y < this.y + this.height;
  }
  intersects(b: Rect2, includeBorders = false): boolean {
    if (includeBorders) {
      return (
        this.x <= b.x + b.width && this.x + this.width >= b.x && this.y <= b.y + b.height && this.y + this.height >= b.y
      );
    }
    return this.x < b.x + b.width && this.x + this.width > b.x && this.y < b.y + b.height && this.y + this.height > b.y;
  }
  /** Overlap of the two rects, or an empty rect at this position if they don't intersect. */
  intersection(b: Rect2): Rect2 {
    if (!this.intersects(b)) return new Rect2(this.position, Vector2.zero);
    const pos = this.position.max(b.position);
    return new Rect2(pos, this.end.min(b.end).sub(pos));
  }
  /** Smallest rect enclosing both. */
  merge(b: Rect2): Rect2 {
    const pos = this.position.min(b.position);
    return new Rect2(pos, this.end.max(b.end).sub(pos));
  }
  /** Grow to include a point. */
  expand(to: Vector2): Rect2 {
    const begin = this.position.min(to);
    return new Rect2(begin, this.end.max(to).sub(begin));
  }
  grow(by: number): Rect2 {
    return new Rect2(this.position.sub(new Vector2(by, by)), this.size.add(new Vector2(by * 2, by * 2)));
  }
  encloses(b: Rect2): boolean {
    return b.x >= this.x && b.y >= this.y && b.x + b.width <= this.x + this.width && b.y + b.height <= this.y + this.height;
  }
  /** Normalise so size is non-negative (mirrors `position` across negative axes). */
  abs(): Rect2 {
    return new Rect2(new Vector2(this.x + Math.min(this.width, 0), this.y + Math.min(this.height, 0)), this.size.abs());
  }

  equals(b: Rect2): boolean {
    return this.position.equals(b.position) && this.size.equals(b.size);
  }
  toString(): string {
    return `[${this.position.toString()}, ${this.size.toString()}]`;
  }
}
