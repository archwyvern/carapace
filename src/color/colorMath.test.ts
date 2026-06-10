import {
  decodeHdr,
  encodeHdr,
  hexToRgb,
  hsvToRgb,
  linearToSrgb,
  rgbToHex,
  rgbToHsv,
  srgbToLinear,
} from "./colorMath";

test("rgbToHex / hexToRgb round-trip", () => {
  expect(rgbToHex(1, 0, 0)).toBe("#ff0000");
  expect(hexToRgb("#00ff00")).toEqual([0, 1, 0]);
});

test("rgbToHsv / hsvToRgb on a primary", () => {
  expect(rgbToHsv(1, 0, 0)).toEqual([0, 100, 100]);
  expect(hsvToRgb(0, 100, 100)).toEqual([1, 0, 0]);
});

test("srgb <-> linear round-trips", () => {
  expect(linearToSrgb(srgbToLinear(0.5))).toBeCloseTo(0.5, 6);
});

test("hdr encode/decode round-trips", () => {
  const hdr = [2, 1, 0.5];
  const { color, intensity } = encodeHdr(hdr);
  expect(intensity).toBe(1);
  expect(decodeHdr(color, intensity)).toEqual(hdr);
});
