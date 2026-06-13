import { clampScalar, toInt } from "./internal";
import { Vector3 } from "./Vector3";

/** Immutable 3D integer vector. TS mirror of `Numerics.Vector3I`. Components truncated toward zero. */
export class Vector3I {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = toInt(x);
    this.y = toInt(y);
    this.z = toInt(z);
  }

  static readonly zero = new Vector3I(0, 0, 0);
  static readonly one = new Vector3I(1, 1, 1);
  static readonly up = new Vector3I(0, 1, 0);
  static readonly down = new Vector3I(0, -1, 0);
  static readonly left = new Vector3I(-1, 0, 0);
  static readonly right = new Vector3I(1, 0, 0);
  static readonly forward = new Vector3I(0, 0, -1);
  static readonly back = new Vector3I(0, 0, 1);

  static fromArray(a: readonly number[]): Vector3I {
    return new Vector3I(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0);
  }

  add(v: Vector3I): Vector3I {
    return new Vector3I(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  sub(v: Vector3I): Vector3I {
    return new Vector3I(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  scale(s: number): Vector3I {
    return new Vector3I(this.x * s, this.y * s, this.z * s);
  }
  mul(v: Vector3I): Vector3I {
    return new Vector3I(this.x * v.x, this.y * v.y, this.z * v.z);
  }
  /** Integer division — truncates toward zero. */
  div(s: number): Vector3I {
    return new Vector3I(this.x / s, this.y / s, this.z / s);
  }
  neg(): Vector3I {
    return new Vector3I(-this.x, -this.y, -this.z);
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  abs(): Vector3I {
    return new Vector3I(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
  }
  sign(): Vector3I {
    return new Vector3I(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z));
  }
  clamp(min: Vector3I, max: Vector3I): Vector3I {
    return new Vector3I(clampScalar(this.x, min.x, max.x), clampScalar(this.y, min.y, max.y), clampScalar(this.z, min.z, max.z));
  }
  min(v: Vector3I): Vector3I {
    return new Vector3I(Math.min(this.x, v.x), Math.min(this.y, v.y), Math.min(this.z, v.z));
  }
  max(v: Vector3I): Vector3I {
    return new Vector3I(Math.max(this.x, v.x), Math.max(this.y, v.y), Math.max(this.z, v.z));
  }

  equals(v: Vector3I): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }
  withX(x: number): Vector3I {
    return new Vector3I(x, this.y, this.z);
  }
  withY(y: number): Vector3I {
    return new Vector3I(this.x, y, this.z);
  }
  withZ(z: number): Vector3I {
    return new Vector3I(this.x, this.y, z);
  }
  toVector3(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}
