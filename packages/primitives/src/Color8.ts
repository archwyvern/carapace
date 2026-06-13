import { clampScalar, toInt } from "./internal";
import { ColorF } from "./ColorF";

/**
 * Immutable RGBA color with 8-bit integer components (0..255). TS mirror of
 * `Archwyvern.Hardcoded.Primitives.Color8`. Components are truncated + clamped to a byte.
 */
export class Color8 {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;

  constructor(r = 255, g = 255, b = 255, a = 255) {
    this.r = clampScalar(toInt(r), 0, 255);
    this.g = clampScalar(toInt(g), 0, 255);
    this.b = clampScalar(toInt(b), 0, 255);
    this.a = clampScalar(toInt(a), 0, 255);
  }

  static readonly white = new Color8(255, 255, 255, 255);
  static readonly black = new Color8(0, 0, 0, 255);
  static readonly transparent = new Color8(0, 0, 0, 0);

  static fromColorF(c: ColorF): Color8 {
    return new Color8(Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), Math.round(c.a * 255));
  }
  /** From a packed `0xRRGGBBAA` integer. */
  static fromRgba32(rgba: number): Color8 {
    return new Color8((rgba >>> 24) & 0xff, (rgba >>> 16) & 0xff, (rgba >>> 8) & 0xff, rgba & 0xff);
  }
  static fromHex(hex: string): Color8 {
    return ColorF.fromHex(hex).toColor8();
  }
  static fromArray(a: readonly number[]): Color8 {
    return new Color8(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 255);
  }

  toColorF(): ColorF {
    return new ColorF(this.r / 255, this.g / 255, this.b / 255, this.a / 255);
  }
  toHex(includeAlpha = true): string {
    const h = (v: number) => v.toString(16).padStart(2, "0");
    return `#${h(this.r)}${h(this.g)}${h(this.b)}${includeAlpha ? h(this.a) : ""}`;
  }
  withAlpha(a: number): Color8 {
    return new Color8(this.r, this.g, this.b, a);
  }
  equals(o: Color8): boolean {
    return this.r === o.r && this.g === o.g && this.b === o.b && this.a === o.a;
  }
  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }
  toString(): string {
    return `(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}
