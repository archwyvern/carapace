import { Vector2I } from "./Vector2I";
import { Rect2 } from "./Rect2";

/** Immutable integer axis-aligned rectangle. TS mirror of `Numerics.Rect2I`. */
export class Rect2I {
  constructor(
    readonly position: Vector2I = Vector2I.zero,
    readonly size: Vector2I = Vector2I.zero,
  ) {}

  static fromXYWH(x: number, y: number, width: number, height: number): Rect2I {
    return new Rect2I(new Vector2I(x, y), new Vector2I(width, height));
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
  get end(): Vector2I {
    return this.position.add(this.size);
  }
  get area(): number {
    return this.size.x * this.size.y;
  }

  hasArea(): boolean {
    return this.size.x > 0 && this.size.y > 0;
  }
  hasPoint(p: Vector2I): boolean {
    return p.x >= this.position.x && p.y >= this.position.y && p.x < this.x + this.width && p.y < this.y + this.height;
  }
  intersects(b: Rect2I): boolean {
    return this.x < b.x + b.width && this.x + this.width > b.x && this.y < b.y + b.height && this.y + this.height > b.y;
  }
  intersection(b: Rect2I): Rect2I {
    if (!this.intersects(b)) return new Rect2I(this.position, Vector2I.zero);
    const pos = this.position.max(b.position);
    return new Rect2I(pos, this.end.min(b.end).sub(pos));
  }
  merge(b: Rect2I): Rect2I {
    const pos = this.position.min(b.position);
    return new Rect2I(pos, this.end.max(b.end).sub(pos));
  }
  encloses(b: Rect2I): boolean {
    return b.x >= this.x && b.y >= this.y && b.x + b.width <= this.x + this.width && b.y + b.height <= this.y + this.height;
  }

  equals(b: Rect2I): boolean {
    return this.position.equals(b.position) && this.size.equals(b.size);
  }
  toRect2(): Rect2 {
    return new Rect2(this.position.toVector2(), this.size.toVector2());
  }
  toString(): string {
    return `[${this.position.toString()}, ${this.size.toString()}]`;
  }
}
