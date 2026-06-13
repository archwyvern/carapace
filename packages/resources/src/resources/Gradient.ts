import { Resource } from "../Resource";
import { ColorF } from "@carapace/primitives";

export interface GradientStop {
  offset: number;
  color: ColorF;
}

export class Gradient extends Resource {
  readonly interpolationMode = this.prop.enum("InterpolationMode", "Linear", ["Linear", "Constant", "Cubic"]);
  readonly offsets = this.prop.arrayNumber("Offsets", [0, 1]);
  readonly colors = this.prop.arrayColor("Colors", [new ColorF(0, 0, 0, 1), new ColorF(1, 1, 1, 1)]);

  groups() {
    return [
      { name: "Interpolation", fields: ["InterpolationMode"] },
      { name: "Raw Data", fields: ["Offsets", "Colors"] },
    ];
  }

  // -- Stop operations (work on offsets/colors arrays via their observables) --

  stops(): GradientStop[] {
    const offs = this.offsets.get();
    const cols = this.colors.get();
    const n = Math.min(offs.length, cols.length);
    const stops: GradientStop[] = [];
    for (let i = 0; i < n; i++) stops.push({ offset: offs[i], color: cols[i] });
    return stops;
  }

  setStops(stops: GradientStop[]): void {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    this.offsets.set(sorted.map(s => s.offset));
    this.colors.set(sorted.map(s => s.color));
  }

  addStop(offset: number): number {
    const clamped = clamp01(offset);
    const color = this.sample(clamped);
    const next = this.stops();
    next.push({ offset: clamped, color });
    next.sort((a, b) => a.offset - b.offset);
    this.setStops(next);
    return next.findIndex(s => s.offset === clamped && s.color.equals(color));
  }

  removeStop(index: number): void {
    const next = this.stops();
    if (next.length <= 2) return;
    if (index < 0 || index >= next.length) return;
    next.splice(index, 1);
    this.setStops(next);
  }

  setStopOffset(index: number, offset: number): number {
    const next = this.stops();
    if (index < 0 || index >= next.length) return index;
    next[index].offset = clamp01(offset);
    next.sort((a, b) => a.offset - b.offset);
    this.setStops(next);
    return next.findIndex(s => s.color === this.stops()[index]?.color);
  }

  setStopColor(index: number, color: ColorF): void {
    const next = this.stops();
    if (index < 0 || index >= next.length) return;
    next[index].color = color;
    this.setStops(next);
  }

  mirror(): void {
    const next = this.stops();
    for (const s of next) s.offset = 1 - s.offset;
    next.reverse();
    this.setStops(next);
  }

  hasAlpha(): boolean {
    for (const c of this.colors.get()) if (c.a < 1) return true;
    return false;
  }

  sample(offset: number): ColorF {
    const stops = this.stops();
    if (stops.length === 0) return ColorF.white;
    if (stops.length === 1) return stops[0].color;
    const t = clamp01(offset);
    if (t <= stops[0].offset) return stops[0].color;
    if (t >= stops[stops.length - 1].offset) return stops[stops.length - 1].color;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a.offset && t <= b.offset) {
        const d = b.offset - a.offset;
        if (d <= 0) return a.color;
        return a.color.lerp(b.color, (t - a.offset) / d);
      }
    }
    return stops[stops.length - 1].color;
  }

  toCssGradient(direction = "to right"): string {
    const stops = this.stops();
    if (stops.length === 0) return "linear-gradient(to right, white, white)";
    const parts = stops.map(s => {
      const c = s.color;
      return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${c.a}) ${s.offset * 100}%`;
    }).join(", ");
    return `linear-gradient(${direction}, ${parts})`;
  }
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}
