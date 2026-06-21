import { useCallback, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
import { ColorWheel } from "./ColorWheel";
import { ColorSlider } from "./ColorSlider";

type Mode = "rgb" | "hsv" | "linear";

export interface ColorPickerProps {
  value: number[];
  hasAlpha?: boolean;
  onChange: (value: number[]) => void;
}

/** Full HDR colour picker: wheel + RGB/HSV/Linear sliders + intensity/alpha + hex. */
export function ColorPicker({ value, hasAlpha, onChange }: ColorPickerProps) {
  const [mode, setMode] = useState<Mode>("rgb");

  const { color: srgbColor, intensity } = useMemo(() => encodeHdr(value), [value]);
  const sr = srgbColor[0] ?? 0;
  const sg = srgbColor[1] ?? 0;
  const sb = srgbColor[2] ?? 0;
  const [h, s, v] = useMemo(() => rgbToHsv(sr, sg, sb), [sr, sg, sb]);
  const alpha = value.length >= 4 ? (value[3] ?? 1) : 1;

  const emit = useCallback(
    (rgb: number[], newIntensity: number, newAlpha: number) => {
      const hdr = decodeHdr(rgb, newIntensity);
      const out = [hdr[0] ?? 0, hdr[1] ?? 0, hdr[2] ?? 0];
      onChange(hasAlpha ? [...out, newAlpha] : out);
    },
    [hasAlpha, onChange],
  );

  function handleWheelChange(newH: number, newS: number, newV: number) {
    const [r, g, b] = hsvToRgb(newH, newS, newV);
    emit([r, g, b], intensity, alpha);
  }

  function handleRgbChange(channel: number, val: number) {
    if (val > 255) {
      const full = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
      full[channel] = val / 255;
      const { color: newColor, intensity: newInt } = encodeHdr(full);
      emit(newColor, newInt, alpha);
    } else {
      const rgb = [sr, sg, sb];
      rgb[channel] = val / 255;
      emit(rgb, intensity, alpha);
    }
  }

  function handleHsvChange(channel: number, val: number) {
    const hsv: [number, number, number] = [h, s, v];
    hsv[channel] = val;
    const [r, g, b] = hsvToRgb(hsv[0], hsv[1], hsv[2]);
    emit([r, g, b], intensity, alpha);
  }

  function handleLinearChange(channel: number, val: number) {
    const rgb = [sr, sg, sb];
    rgb[channel] = linearToSrgb(val);
    emit(rgb, intensity, alpha);
  }

  function handleHexChange(hex: string) {
    const clean = hex.startsWith("#") ? hex : `#${hex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      const [r, g, b] = hexToRgb(clean);
      emit([r, g, b], intensity, alpha);
    }
  }

  const r255 = Math.round(sr * 255);
  const g255 = Math.round(sg * 255);
  const b255 = Math.round(sb * 255);
  const currentHex = rgbToHex(sr, sg, sb);

  const rGrad: [number, number, number][] = [[0, sg, sb], [1, sg, sb]];
  const gGrad: [number, number, number][] = [[sr, 0, sb], [sr, 1, sb]];
  const bGrad: [number, number, number][] = [[sr, sg, 0], [sr, sg, 1]];
  const hGrad: [number, number, number][] = Array.from({ length: 7 }, (_, i) => hsvToRgb(i * 60, s, v));
  const sGrad: [number, number, number][] = [hsvToRgb(h, 0, v), hsvToRgb(h, 100, v)];
  const vGrad: [number, number, number][] = [hsvToRgb(h, s, 0), hsvToRgb(h, s, 100)];
  const linR = srgbToLinear(sr);
  const linG = srgbToLinear(sg);
  const linB = srgbToLinear(sb);

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: "4px 0",
    fontSize: 12,
    textAlign: "center",
    cursor: "pointer",
    backgroundColor: active ? "var(--color-surface-raised)" : "transparent",
    color: active ? "var(--color-accent)" : "var(--color-fg-mid)",
    border: "none",
    borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
  });

  return (
    <div className="flex w-[280px] flex-col gap-2 border border-border bg-surface-raised p-2 text-xs">
      <ColorWheel hue={h} saturation={s} value={v} size={260} onChange={handleWheelChange} />

      <div className="flex items-center gap-1.5">
        <div className="h-5 flex-1 border border-border" style={{ backgroundColor: currentHex }} />
      </div>

      <div className="flex border-b border-border">
        <button type="button" style={tabStyle(mode === "rgb")} onClick={() => setMode("rgb")}>RGB</button>
        <button type="button" style={tabStyle(mode === "hsv")} onClick={() => setMode("hsv")}>HSV</button>
        <button type="button" style={tabStyle(mode === "linear")} onClick={() => setMode("linear")}>Linear</button>
      </div>

      {mode === "rgb" && (
        <>
          <ColorSlider label="R" value={r255} min={0} max={255} step={1} color="#c85050" gradient={rGrad} onChange={(val) => handleRgbChange(0, val)} />
          <ColorSlider label="G" value={g255} min={0} max={255} step={1} color="#6aaa4e" gradient={gGrad} onChange={(val) => handleRgbChange(1, val)} />
          <ColorSlider label="B" value={b255} min={0} max={255} step={1} color="#5080c8" gradient={bGrad} onChange={(val) => handleRgbChange(2, val)} />
        </>
      )}
      {mode === "hsv" && (
        <>
          <ColorSlider label="H" value={Math.round(h)} min={0} max={360} step={1} color="var(--color-fg-mid)" gradient={hGrad} onChange={(val) => handleHsvChange(0, val)} />
          <ColorSlider label="S" value={Math.round(s)} min={0} max={100} step={1} color="var(--color-fg-mid)" gradient={sGrad} onChange={(val) => handleHsvChange(1, val)} />
          <ColorSlider label="V" value={Math.round(v)} min={0} max={100} step={1} color="var(--color-fg-mid)" gradient={vGrad} onChange={(val) => handleHsvChange(2, val)} />
        </>
      )}
      {mode === "linear" && (
        <>
          <ColorSlider label="R" value={parseFloat(linR.toFixed(3))} min={0} max={1} step={0.001} color="#c85050" gradient={rGrad} onChange={(val) => handleLinearChange(0, val)} />
          <ColorSlider label="G" value={parseFloat(linG.toFixed(3))} min={0} max={1} step={0.001} color="#6aaa4e" gradient={gGrad} onChange={(val) => handleLinearChange(1, val)} />
          <ColorSlider label="B" value={parseFloat(linB.toFixed(3))} min={0} max={1} step={0.001} color="#5080c8" gradient={bGrad} onChange={(val) => handleLinearChange(2, val)} />
        </>
      )}

      <ColorSlider
        label="I"
        value={parseFloat(intensity.toFixed(2))}
        min={-10}
        max={10}
        step={0.01}
        color="var(--color-fg-mid)"
        gradient={[[0.2, 0.2, 0.2], [sr, sg, sb]]}
        onChange={(val) => emit([sr, sg, sb], val, alpha)}
      />

      {hasAlpha && (
        <ColorSlider
          label="A"
          value={Math.round(alpha * 255)}
          min={0}
          max={255}
          step={1}
          color="var(--color-fg-mid)"
          gradient={[[0, 0, 0], [sr, sg, sb]]}
          onChange={(val) => emit([sr, sg, sb], intensity, val / 255)}
        />
      )}

      <div className="flex items-center gap-1">
        <span className="w-7 text-xs text-fg-mid">Hex</span>
        <span className="text-xs text-fg-mid">#</span>
        <input
          type="text"
          value={currentHex.slice(1)}
          onChange={(e) => handleHexChange(e.target.value)}
          maxLength={6}
          className="h-[22px] flex-1 border border-border bg-surface px-1 font-mono text-xs text-fg outline-none"
        />
      </div>
    </div>
  );
}
