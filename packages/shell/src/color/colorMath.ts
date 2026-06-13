// Colour conversions. RGB channels are 0-1; HSV is h:0-360, s:0-100, v:0-100.

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return [h, s, v];
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [r + m, g + m, b + m];
}

/** sRGB gamma to linear (single channel, 0-1). */
export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Linear to sRGB gamma (single channel). */
export function linearToSrgb(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** RGB (0-1, clamped) to "#rrggbb". */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  const hex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** "#rrggbb" to RGB (0-1 each). */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/** Split an HDR RGB value into a normalized sRGB colour (0-1) + an intensity multiplier. */
export function encodeHdr(rgb: number[]): { color: number[]; intensity: number } {
  const maxChannel = Math.max(rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0);
  const intensity = Math.max(0, maxChannel - 1);
  const divisor = 1 + intensity;
  const color = [(rgb[0] ?? 0) / divisor, (rgb[1] ?? 0) / divisor, (rgb[2] ?? 0) / divisor];
  if (rgb.length >= 4) color.push(rgb[3] ?? 1);
  return { color, intensity };
}

/** Combine a normalized sRGB colour + intensity into an HDR RGB value. */
export function decodeHdr(color: number[], intensity: number): number[] {
  const multiplier = 1 + intensity;
  const result = [(color[0] ?? 0) * multiplier, (color[1] ?? 0) * multiplier, (color[2] ?? 0) * multiplier];
  if (color.length >= 4) result.push(color[3] ?? 1);
  return result;
}
