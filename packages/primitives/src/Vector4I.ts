import { clampScalar, toInt } from "./internal";
import { Vector4 } from "./Vector4";

/** Immutable 4D integer vector. TS mirror of `Numerics.Vector4I`. Components truncated toward zero. */
export class Vector4I {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;

  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = toInt(x);
    this.y = toInt(y);
    this.z = toInt(z);
    this.w = toInt(w);
  }

  static readonly zero = new Vector4I(0, 0, 0, 0);
  static readonly one = new Vector4I(1, 1, 1, 1);

  static fromArray(a: readonly number[]): Vector4I {
    return new Vector4I(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0);
  }

  add(v: Vector4I): Vector4I {
    return new Vector4I(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }
  sub(v: Vector4I): Vector4I {
    return new Vector4I(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }
  scale(s: number): Vector4I {
    return new Vector4I(this.x * s, this.y * s, this.z * s, this.w * s);
  }
  mul(v: Vector4I): Vector4I {
    return new Vector4I(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
  }
  /** Integer division — truncates toward zero. */
  div(s: number): Vector4I {
    return new Vector4I(this.x / s, this.y / s, this.z / s, this.w / s);
  }
  neg(): Vector4I {
    return new Vector4I(-this.x, -this.y, -this.z, -this.w);
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z, this.w);
  }
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  abs(): Vector4I {
    return new Vector4I(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
  }
  sign(): Vector4I {
    return new Vector4I(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z), Math.sign(this.w));
  }
  clamp(min: Vector4I, max: Vector4I): Vector4I {
    return new Vector4I(
      clampScalar(this.x, min.x, max.x),
      clampScalar(this.y, min.y, max.y),
      clampScalar(this.z, min.z, max.z),
      clampScalar(this.w, min.w, max.w),
    );
  }
  min(v: Vector4I): Vector4I {
    return new Vector4I(Math.min(this.x, v.x), Math.min(this.y, v.y), Math.min(this.z, v.z), Math.min(this.w, v.w));
  }
  max(v: Vector4I): Vector4I {
    return new Vector4I(Math.max(this.x, v.x), Math.max(this.y, v.y), Math.max(this.z, v.z), Math.max(this.w, v.w));
  }

  equals(v: Vector4I): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }
  withX(x: number): Vector4I {
    return new Vector4I(x, this.y, this.z, this.w);
  }
  withY(y: number): Vector4I {
    return new Vector4I(this.x, y, this.z, this.w);
  }
  withZ(z: number): Vector4I {
    return new Vector4I(this.x, this.y, z, this.w);
  }
  withW(w: number): Vector4I {
    return new Vector4I(this.x, this.y, this.z, w);
  }
  toVector4(): Vector4 {
    return new Vector4(this.x, this.y, this.z, this.w);
  }
  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }
}
