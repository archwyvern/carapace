import { clampScalar } from "./internal";

/** Immutable 4D vector (double precision). TS mirror of `Numerics.Vector4`. */
export class Vector4 {
  constructor(
    readonly x = 0,
    readonly y = 0,
    readonly z = 0,
    readonly w = 0,
  ) {}

  static readonly zero = new Vector4(0, 0, 0, 0);
  static readonly one = new Vector4(1, 1, 1, 1);

  static fromArray(a: readonly number[]): Vector4 {
    return new Vector4(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0);
  }

  add(v: Vector4): Vector4 {
    return new Vector4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
  }
  sub(v: Vector4): Vector4 {
    return new Vector4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }
  scale(s: number): Vector4 {
    return new Vector4(this.x * s, this.y * s, this.z * s, this.w * s);
  }
  mul(v: Vector4): Vector4 {
    return new Vector4(this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w);
  }
  div(s: number): Vector4 {
    return new Vector4(this.x / s, this.y / s, this.z / s, this.w / s);
  }
  neg(): Vector4 {
    return new Vector4(-this.x, -this.y, -this.z, -this.w);
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z, this.w);
  }
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }
  normalized(): Vector4 {
    const l = this.length();
    return l === 0 ? Vector4.zero : new Vector4(this.x / l, this.y / l, this.z / l, this.w / l);
  }
  dot(v: Vector4): number {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
  }
  distanceTo(v: Vector4): number {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
  }
  lerp(to: Vector4, weight: number): Vector4 {
    return new Vector4(
      this.x + (to.x - this.x) * weight,
      this.y + (to.y - this.y) * weight,
      this.z + (to.z - this.z) * weight,
      this.w + (to.w - this.w) * weight,
    );
  }

  abs(): Vector4 {
    return new Vector4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
  }
  floor(): Vector4 {
    return new Vector4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
  }
  ceil(): Vector4 {
    return new Vector4(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z), Math.ceil(this.w));
  }
  round(): Vector4 {
    return new Vector4(Math.round(this.x), Math.round(this.y), Math.round(this.z), Math.round(this.w));
  }
  sign(): Vector4 {
    return new Vector4(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z), Math.sign(this.w));
  }
  clamp(min: Vector4, max: Vector4): Vector4 {
    return new Vector4(
      clampScalar(this.x, min.x, max.x),
      clampScalar(this.y, min.y, max.y),
      clampScalar(this.z, min.z, max.z),
      clampScalar(this.w, min.w, max.w),
    );
  }
  min(v: Vector4): Vector4 {
    return new Vector4(Math.min(this.x, v.x), Math.min(this.y, v.y), Math.min(this.z, v.z), Math.min(this.w, v.w));
  }
  max(v: Vector4): Vector4 {
    return new Vector4(Math.max(this.x, v.x), Math.max(this.y, v.y), Math.max(this.z, v.z), Math.max(this.w, v.w));
  }

  isFinite(): boolean {
    return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z) && Number.isFinite(this.w);
  }
  equals(v: Vector4): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }
  isEqualApprox(v: Vector4, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon &&
      Math.abs(this.w - v.w) < epsilon
    );
  }
  withX(x: number): Vector4 {
    return new Vector4(x, this.y, this.z, this.w);
  }
  withY(y: number): Vector4 {
    return new Vector4(this.x, y, this.z, this.w);
  }
  withZ(z: number): Vector4 {
    return new Vector4(this.x, this.y, z, this.w);
  }
  withW(w: number): Vector4 {
    return new Vector4(this.x, this.y, this.z, w);
  }
  /** Component by index (0=x, 1=y, 2=z, 3=w) — mirrors the C# `this[int]` indexer. */
  getComponent(i: number): number {
    return i === 0 ? this.x : i === 1 ? this.y : i === 2 ? this.z : this.w;
  }
  toArray(): [number, number, number, number] {
    return [this.x, this.y, this.z, this.w];
  }
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }
}
