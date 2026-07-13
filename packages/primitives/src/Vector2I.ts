import { clampScalar, toInt } from "./internal";
import { Vector2 } from "./Vector2";

/**
 * Immutable 2D integer vector. TS mirror of `Numerics.Vector2I`. Components are coerced to
 * integers (truncated toward zero, matching a C# `(int)` cast), so the integer invariant
 * always holds. Backed by `number` — exact across the int32 range and far beyond (to 2^53).
 * For sizes, pixel/grid coordinates, indices.
 */
export class Vector2I {
  readonly x: number;
  readonly y: number;

  constructor(x = 0, y = 0) {
    this.x = toInt(x);
    this.y = toInt(y);
  }

  static readonly zero = new Vector2I(0, 0);
  static readonly one = new Vector2I(1, 1);
  static readonly up = new Vector2I(0, -1);
  static readonly down = new Vector2I(0, 1);
  static readonly left = new Vector2I(-1, 0);
  static readonly right = new Vector2I(1, 0);

  static fromArray(a: readonly number[]): Vector2I {
    return new Vector2I(a[0] ?? 0, a[1] ?? 0);
  }

  // -- arithmetic (results re-truncated, so stay integral) --
  add(v: Vector2I): Vector2I {
    return new Vector2I(this.x + v.x, this.y + v.y);
  }
  sub(v: Vector2I): Vector2I {
    return new Vector2I(this.x - v.x, this.y - v.y);
  }
  scale(s: number): Vector2I {
    return new Vector2I(this.x * s, this.y * s);
  }
  mul(v: Vector2I): Vector2I {
    return new Vector2I(this.x * v.x, this.y * v.y);
  }
  /** Integer division — truncates toward zero, matching C# `int / int`. */
  div(s: number): Vector2I {
    return new Vector2I(this.x / s, this.y / s);
  }
  neg(): Vector2I {
    return new Vector2I(-this.x, -this.y);
  }

  // -- geometry (length is real-valued) --
  length(): number {
    return Math.hypot(this.x, this.y);
  }
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }
  aspect(): number {
    return this.x / this.y;
  }

  // -- component-wise --
  abs(): Vector2I {
    return new Vector2I(Math.abs(this.x), Math.abs(this.y));
  }
  sign(): Vector2I {
    return new Vector2I(Math.sign(this.x), Math.sign(this.y));
  }
  clamp(min: Vector2I, max: Vector2I): Vector2I {
    return new Vector2I(clampScalar(this.x, min.x, max.x), clampScalar(this.y, min.y, max.y));
  }
  min(v: Vector2I): Vector2I {
    return new Vector2I(Math.min(this.x, v.x), Math.min(this.y, v.y));
  }
  max(v: Vector2I): Vector2I {
    return new Vector2I(Math.max(this.x, v.x), Math.max(this.y, v.y));
  }

  // -- predicates / conversions --
  equals(v: Vector2I): boolean {
    return this.x === v.x && this.y === v.y;
  }
  withX(x: number): Vector2I {
    return new Vector2I(x, this.y);
  }
  withY(y: number): Vector2I {
    return new Vector2I(this.x, y);
  }
  /** Widen to a double-precision `Vector2`. */
  toVector2(): Vector2 {
    return new Vector2(this.x, this.y);
  }
  toArray(): [number, number] {
    return [this.x, this.y];
  }
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}
