import { clampScalar } from "./internal";
import { Color8 } from "./Color8";

/**
 * Immutable RGBA color with float components in 0..1 (alpha included). TS mirror of
 * `Archwyvern.Hardcoded.Primitives.ColorF`. The named-color palette lives in `Colors`.
 */
export class ColorF {
  constructor(
    readonly r = 1,
    readonly g = 1,
    readonly b = 1,
    readonly a = 1,
  ) {}

  static readonly white = new ColorF(1, 1, 1, 1);
  static readonly black = new ColorF(0, 0, 0, 1);
  static readonly transparent = new ColorF(0, 0, 0, 0);

  /** From a packed `0xRRGGBBAA` integer (the form used by the `Colors` palette). */
  static fromRgba32(rgba: number): ColorF {
    return new ColorF(
      ((rgba >>> 24) & 0xff) / 255,
      ((rgba >>> 16) & 0xff) / 255,
      ((rgba >>> 8) & 0xff) / 255,
      (rgba & 0xff) / 255,
    );
  }

  /** From `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` (with or without the leading `#`). */
  static fromHex(hex: string): ColorF {
    let s = hex.startsWith("#") ? hex.slice(1) : hex;
    if (s.length === 3 || s.length === 4) s = [...s].map((ch) => ch + ch).join("");
    const byte = (i: number) => parseInt(s.slice(i, i + 2), 16) / 255;
    return new ColorF(byte(0), byte(2), byte(4), s.length >= 8 ? byte(6) : 1);
  }

  static fromArray(a: readonly number[]): ColorF {
    return new ColorF(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 1);
  }

  /** Perceived (Rec. 709) luminance. */
  luminance(): number {
    return 0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b;
  }
  lerp(to: ColorF, weight: number): ColorF {
    return new ColorF(
      this.r + (to.r - this.r) * weight,
      this.g + (to.g - this.g) * weight,
      this.b + (to.b - this.b) * weight,
      this.a + (to.a - this.a) * weight,
    );
  }
  inverted(): ColorF {
    return new ColorF(1 - this.r, 1 - this.g, 1 - this.b, this.a);
  }
  darkened(amount: number): ColorF {
    const k = 1 - amount;
    return new ColorF(this.r * k, this.g * k, this.b * k, this.a);
  }
  lightened(amount: number): ColorF {
    return new ColorF(
      this.r + (1 - this.r) * amount,
      this.g + (1 - this.g) * amount,
      this.b + (1 - this.b) * amount,
      this.a,
    );
  }
  /** Alpha-composite `over` on top of this color (source-over). */
  blend(over: ColorF): ColorF {
    const sa = 1 - over.a;
    const a = this.a * sa + over.a;
    if (a === 0) return ColorF.transparent;
    return new ColorF(
      (this.r * this.a * sa + over.r * over.a) / a,
      (this.g * this.a * sa + over.g * over.a) / a,
      (this.b * this.a * sa + over.b * over.a) / a,
      a,
    );
  }
  clamped(): ColorF {
    return new ColorF(
      clampScalar(this.r, 0, 1),
      clampScalar(this.g, 0, 1),
      clampScalar(this.b, 0, 1),
      clampScalar(this.a, 0, 1),
    );
  }
  withAlpha(a: number): ColorF {
    return new ColorF(this.r, this.g, this.b, a);
  }
  srgbToLinear(): ColorF {
    const f = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return new ColorF(f(this.r), f(this.g), f(this.b), this.a);
  }
  linearToSrgb(): ColorF {
    const f = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    return new ColorF(f(this.r), f(this.g), f(this.b), this.a);
  }

  toColor8(): Color8 {
    return new Color8(
      Math.round(this.r * 255),
      Math.round(this.g * 255),
      Math.round(this.b * 255),
      Math.round(this.a * 255),
    );
  }
  toHex(includeAlpha = true): string {
    const h = (v: number) => Math.round(clampScalar(v, 0, 1) * 255).toString(16).padStart(2, "0");
    return `#${h(this.r)}${h(this.g)}${h(this.b)}${includeAlpha ? h(this.a) : ""}`;
  }

  equals(o: ColorF): boolean {
    return this.r === o.r && this.g === o.g && this.b === o.b && this.a === o.a;
  }
  isEqualApprox(o: ColorF, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.r - o.r) < epsilon &&
      Math.abs(this.g - o.g) < epsilon &&
      Math.abs(this.b - o.b) < epsilon &&
      Math.abs(this.a - o.a) < epsilon
    );
  }
  toArray(): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a];
  }
  toString(): string {
    return `(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }
}
