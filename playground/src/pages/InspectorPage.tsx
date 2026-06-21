import { useState } from "react";
import type { ReactNode } from "react";
import { Inspector } from "@carapace/shell";
import type { InspectorField, InspectorSectionInfo } from "@carapace/shell";

/*
 * The inspector showcase, rebuilt from the REAL properties the three carapace consumers edit:
 *   · Sprite2D       — a skyrat entity (Texture/Modulate, transform, lighting), grouped by class.
 *   · NoiseTexture2D — a drydock resource: scalars + a nested FastNoiseLite + a ColorRamp gradient.
 *   · Plateau        — a lambert shape: transform, ring params, grid-snap, normal directions.
 *   · ShaderMaterial — a drydock material: shader uniforms + blend/light mode.
 *   · Thruster       — a skyrat component: transform + gated Bloom / Light sections.
 * Field names, kinds, options, and example values mirror each app's actual inspector.
 */

/* ------------------------------------------------------------------ helpers */

const eq = (a: unknown, b: unknown): boolean =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((x, i) => x === b[i])
    : a === b;

function useTracked<T>(initial: T) {
  const [value, set] = useState<T>(initial);
  return { value, set, modified: !eq(value, initial), reset: () => set(initial) };
}

function Dock({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex w-72 shrink-0 flex-col border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-2.5 py-1.5">
        <div className="text-sm font-bold text-fg">{title}</div>
        <div className="text-xs text-fg-mid">{subtitle}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

const rgb = (c: number[]) => `rgb(${c.slice(0, 3).map((x) => Math.round(x * 255)).join(",")})`;

/* ------------------------------------------------ 1. Sprite2D (skyrat entity) */

function SpriteEntityColumn() {
  const texture = useTracked("hull_main");
  const modulate = useTracked([1, 1, 1, 1]);
  const flipH = useTracked(false);
  const flipV = useTracked(false);
  const position = useTracked([128, -64]);
  const rotation = useTracked(45);
  const scale = useTracked([1, 1]);
  const visible = useTracked(true);
  const blend = useTracked(1);
  const light = useTracked(true);
  const lightEnergy = useTracked(0.8);
  const lightRadius = useTracked(64);

  const fields: InspectorField[] = [
    { kind: "string", key: "texture", label: "Texture", category: "Sprite2D", value: texture.value, onChange: texture.set },
    { kind: "color", key: "modulate", label: "Modulate", category: "Sprite2D", hasAlpha: true, value: modulate.value, onChange: modulate.set, modified: modulate.modified, onReset: modulate.reset },
    { kind: "bool", key: "flipH", label: "Flip H", category: "Sprite2D", value: flipH.value, onChange: flipH.set },
    { kind: "bool", key: "flipV", label: "Flip V", category: "Sprite2D", value: flipV.value, onChange: flipV.set },
    { kind: "vec", key: "position", label: "Position", category: "Node2D", size: 2, value: position.value, onChange: position.set, modified: position.modified, onReset: position.reset },
    { kind: "number", key: "rotation", label: "Rotation", category: "Node2D", value: rotation.value, onChange: rotation.set },
    { kind: "vec", key: "scale", label: "Scale", category: "Node2D", size: 2, value: scale.value, onChange: scale.set },
    { kind: "bool", key: "visible", label: "Visible", category: "CanvasItem", value: visible.value, onChange: visible.set },
    { kind: "enum", key: "blend", label: "Blend Mode", category: "CanvasItem", options: ["Mix", "Add", "Sub", "Mul"], value: blend.value, onChange: blend.set },
    { kind: "bool", key: "light", label: "Light", category: "CanvasItem", value: light.value, onChange: light.set },
    { kind: "number", key: "lenergy", label: "Light Energy", category: "CanvasItem", min: 0, max: 4, hidden: !light.value, value: lightEnergy.value, onChange: lightEnergy.set },
    { kind: "number", key: "lradius", label: "Light Radius", category: "CanvasItem", integer: true, hidden: !light.value, value: lightRadius.value, onChange: lightRadius.set },
  ];

  return (
    <Dock title="Sprite2D" subtitle="skyrat entity · class hierarchy">
      <Inspector fields={fields} categories={["Sprite2D", "Node2D", "CanvasItem"]} />
    </Dock>
  );
}

/* ------------------------------------------ 2. NoiseTexture2D (drydock resource) */

type Stop = { offset: number; color: number[] };

function NoiseTextureColumn() {
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [seamless, setSeamless] = useState(false);
  const [asNormal, setAsNormal] = useState(false);
  const [bump, setBump] = useState(8);

  const [noise, setNoise] = useState<{ type: number; seed: number; freq: number; fractal: number; oct: number; lac: number; gain: number } | null>({
    type: 0, seed: 1337, freq: 0.01, fractal: 1, oct: 5, lac: 2, gain: 0.5,
  });
  const patchNoise = (p: Partial<NonNullable<typeof noise>>) => setNoise((n) => (n ? { ...n, ...p } : n));

  const [interp, setInterp] = useState(0);
  const [stops, setStops] = useState<Stop[]>([
    { offset: 0, color: [0.05, 0.07, 0.12] },
    { offset: 0.5, color: [0.84, 0.42, 0.2] },
    { offset: 1, color: [1, 0.9, 0.65] },
  ]);
  const patchStop = (i: number, c: number[]) => setStops((s) => s.map((st, j) => (j === i ? { ...st, color: c } : st)));
  const gradientCss = `linear-gradient(90deg, ${stops.map((s) => `${rgb(s.color)} ${Math.round(s.offset * 100)}%`).join(", ")})`;

  const noFractal = !noise || noise.fractal === 0;

  const noiseField: InspectorField = {
    kind: "object", key: "noise", label: "Noise", typeName: noise ? "FastNoiseLite" : undefined,
    icon: <span className="text-info">◌</span>,
    onCreate: () => setNoise({ type: 0, seed: 1337, freq: 0.01, fractal: 1, oct: 5, lac: 2, gain: 0.5 }),
    onClear: () => setNoise(null),
    fields: noise
      ? [
          { kind: "enum", key: "ntype", label: "Noise Type", options: ["Simplex", "Perlin", "Cellular", "Value"], value: noise.type, onChange: (v) => patchNoise({ type: v }) },
          { kind: "number", key: "seed", label: "Seed", integer: true, value: noise.seed, onChange: (v) => patchNoise({ seed: v }) },
          { kind: "number", key: "freq", label: "Frequency", min: 0, value: noise.freq, onChange: (v) => patchNoise({ freq: v }) },
          { kind: "enum", key: "ftype", label: "Fractal Type", options: ["None", "FBM", "Ridged", "PingPong"], value: noise.fractal, onChange: (v) => patchNoise({ fractal: v }) },
          { kind: "number", key: "oct", label: "Octaves", integer: true, min: 1, max: 10, hidden: noFractal, value: noise.oct, onChange: (v) => patchNoise({ oct: v }) },
          { kind: "number", key: "lac", label: "Lacunarity", hidden: noFractal, value: noise.lac, onChange: (v) => patchNoise({ lac: v }) },
          { kind: "number", key: "gain", label: "Gain", min: 0, max: 1, hidden: noFractal, value: noise.gain, onChange: (v) => patchNoise({ gain: v }) },
        ]
      : null,
  };

  const rampField: InspectorField = {
    kind: "object", key: "ramp", label: "Color Ramp", typeName: "Gradient",
    icon: <span className="text-warning">▦</span>,
    customRender: <div className="h-4 w-full rounded-control border border-border" style={{ background: gradientCss }} />,
    fields: [
      { kind: "enum", key: "interp", label: "Interpolation", options: ["Linear", "Constant", "Cubic"], value: interp, onChange: setInterp },
      {
        kind: "array", key: "stops", label: "Colors",
        onAdd: () => setStops((s) => [...s, { offset: 1, color: [1, 1, 1] }]),
        onRemove: (i) => setStops((s) => s.filter((_, j) => j !== i)),
        items: stops.map((s, i) => ({
          kind: "color" as const, key: `stop${i}`, label: `${Math.round(s.offset * 100)}%`,
          value: s.color, onChange: (c) => patchStop(i, c),
        })),
      },
    ],
  };

  const fields: InspectorField[] = [
    { kind: "number", key: "w", label: "Width", integer: true, min: 1, max: 4096, value: width, onChange: setWidth },
    { kind: "number", key: "h", label: "Height", integer: true, min: 1, max: 4096, value: height, onChange: setHeight },
    { kind: "bool", key: "seamless", label: "Seamless", value: seamless, onChange: setSeamless },
    { kind: "bool", key: "asnormal", label: "As Normal Map", value: asNormal, onChange: setAsNormal },
    { kind: "number", key: "bump", label: "Bump Strength", min: 0, max: 32, hidden: !asNormal, value: bump, onChange: setBump },
    noiseField,
    rampField,
  ];

  return (
    <Dock title="NoiseTexture2D" subtitle="drydock resource · nested noise + ramp">
      <Inspector fields={fields} />
    </Dock>
  );
}

/* ------------------------------------------------------ 3. Plateau (lambert shape) */

function PlateauColumn() {
  const position = useTracked([256, 192, 12]);
  const rotation = useTracked(0);
  const scale = useTracked([1, 1, 1.2]);
  const outer = useTracked(4);
  const inner = useTracked(4);
  const profile = useTracked(2);
  const gridSnap = useTracked(true);
  const red = useTracked(0);
  const green = useTracked(0);

  const sections: InspectorSectionInfo[] = [{ name: "Transform" }, { name: "Parameters" }, { name: "Normal Directions" }];

  const fields: InspectorField[] = [
    { kind: "bool", key: "snap", label: "Grid Snap (½px)", value: gridSnap.value, onChange: gridSnap.set },
    { kind: "vec", key: "pos", label: "Position", group: "Transform", size: 3, value: position.value, onChange: position.set },
    { kind: "number", key: "rot", label: "Rotation", group: "Transform", value: rotation.value, onChange: rotation.set },
    { kind: "vec", key: "scale", label: "Scale", group: "Transform", size: 3, value: scale.value, onChange: scale.set, modified: scale.modified, onReset: scale.reset },
    { kind: "number", key: "outer", label: "Outer Vertices", group: "Parameters", integer: true, min: 3, max: 16, value: outer.value, onChange: outer.set },
    { kind: "number", key: "inner", label: "Inner Vertices", group: "Parameters", integer: true, min: 1, max: 16, value: inner.value, onChange: inner.set },
    { kind: "enum", key: "profile", label: "Profile", group: "Parameters", options: ["Linear", "Smooth", "Round", "Cove"], value: profile.value, onChange: profile.set },
    { kind: "enum", key: "red", label: "Red", group: "Normal Directions", options: ["Right", "Left"], value: red.value, onChange: red.set },
    { kind: "enum", key: "green", label: "Green", group: "Normal Directions", options: ["Up", "Down"], value: green.value, onChange: green.set },
  ];

  return (
    <Dock title="Plateau" subtitle="lambert shape · transform + params">
      <Inspector fields={fields} sections={sections} />
    </Dock>
  );
}

/* -------------------------------------------------- 4. ShaderMaterial (drydock) */

function ShaderMaterialColumn() {
  const shader = useTracked("hull_emissive");
  const albedo = useTracked([0.84, 0.64, 0.35]);
  const metallic = useTracked(0.8);
  const roughness = useTracked(0.35);
  const emission = useTracked(2.4);
  const tiling = useTracked([4, 2]);
  const blend = useTracked(1);
  const lightMode = useTracked(0);

  const sections: InspectorSectionInfo[] = [{ name: "Shader Parameters" }, { name: "Material" }];

  const fields: InspectorField[] = [
    { kind: "string", key: "shader", label: "Shader", value: shader.value, onChange: shader.set },
    { kind: "color", key: "albedo", label: "Albedo", group: "Shader Parameters", value: albedo.value, onChange: albedo.set, modified: albedo.modified, onReset: albedo.reset },
    { kind: "number", key: "metallic", label: "Metallic", group: "Shader Parameters", min: 0, max: 1, value: metallic.value, onChange: metallic.set },
    { kind: "number", key: "rough", label: "Roughness", group: "Shader Parameters", min: 0, max: 1, value: roughness.value, onChange: roughness.set },
    { kind: "number", key: "emission", label: "Emission", group: "Shader Parameters", min: 0, max: 4, value: emission.value, onChange: emission.set },
    { kind: "vec", key: "tiling", label: "UV Tiling", group: "Shader Parameters", size: 2, value: tiling.value, onChange: tiling.set },
    { kind: "enum", key: "blend", label: "Blend Mode", group: "Material", options: ["Mix", "Add", "Sub", "Mul", "Premult"], value: blend.value, onChange: blend.set },
    { kind: "enum", key: "lmode", label: "Light Mode", group: "Material", options: ["Normal", "Unshaded", "Light Only"], value: lightMode.value, onChange: lightMode.set },
  ];

  return (
    <Dock title="ShaderMaterial" subtitle="drydock · shader uniforms">
      <Inspector fields={fields} sections={sections} />
    </Dock>
  );
}

/* ----------------------------------------------- 5. Thruster (skyrat component) */

function ThrusterColumn() {
  const position = useTracked([0, 0]);
  const rotation = useTracked(0);
  const length = useTracked(150);
  const width = useTracked(30);
  const exhaustOffset = useTracked([25, 0]);
  const bloom = useTracked(true);
  const bloomRadius = useTracked(50);
  const light = useTracked(true);
  const lightRadius = useTracked(100);
  const lightEnergy = useTracked(0.8);
  const [tags, setTags] = useState(["engine", "ion"]);

  const sections: InspectorSectionInfo[] = [
    { name: "Exhaust" },
    { name: "Bloom", enabledBy: "bloom" },
    { name: "Light", enabledBy: "light" },
  ];

  const fields: InspectorField[] = [
    { kind: "vec", key: "pos", label: "Position", size: 2, value: position.value, onChange: position.set },
    { kind: "number", key: "rot", label: "Rotation", value: rotation.value, onChange: rotation.set },
    { kind: "number", key: "length", label: "Length", group: "Exhaust", value: length.value, onChange: length.set },
    { kind: "number", key: "width", label: "Width", group: "Exhaust", value: width.value, onChange: width.set },
    { kind: "vec", key: "exoff", label: "Exhaust Offset", group: "Exhaust", size: 2, value: exhaustOffset.value, onChange: exhaustOffset.set },
    { kind: "bool", key: "bloom", label: "Bloom", group: "Bloom", value: bloom.value, onChange: bloom.set },
    { kind: "number", key: "bradius", label: "Radius", group: "Bloom", value: bloomRadius.value, onChange: bloomRadius.set },
    { kind: "bool", key: "light", label: "Light", group: "Light", value: light.value, onChange: light.set },
    { kind: "number", key: "lradius", label: "Radius", group: "Light", value: lightRadius.value, onChange: lightRadius.set },
    { kind: "number", key: "lenergy", label: "Energy", group: "Light", min: 0, max: 4, value: lightEnergy.value, onChange: lightEnergy.set },
    {
      kind: "array", key: "tags", label: "Tags",
      onAdd: () => setTags((t) => [...t, "tag"]),
      onRemove: (i) => setTags((t) => t.filter((_, j) => j !== i)),
      items: tags.map((t, i) => ({
        kind: "string" as const, key: `tag${i}`, label: `${i}`,
        value: t, onChange: (v) => setTags((arr) => arr.map((x, j) => (j === i ? v : x))),
      })),
    },
  ];

  return (
    <Dock title="Thruster" subtitle="skyrat component · gated sections">
      <Inspector fields={fields} sections={sections} />
    </Dock>
  );
}

/* ------------------------------------------------------------------- page */

export function InspectorPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-widest text-accent">Carapace · Inspector</div>
        <h1 className="text-base font-bold text-fg">Inspector showcase</h1>
        <p className="mt-0.5 text-sm text-fg-mid">
          Five real inspectors, with the actual properties lambert, drydock, and skyrat edit — a
          skyrat entity, a drydock NoiseTexture2D + Gradient, a lambert Plateau, a ShaderMaterial,
          and a Thruster component. Drag a number to scrub (Shift = 0.1, Ctrl = 1.0); hover a
          modified row for the revert.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-4">
        <SpriteEntityColumn />
        <NoiseTextureColumn />
        <PlateauColumn />
        <ShaderMaterialColumn />
        <ThrusterColumn />
      </div>
    </div>
  );
}
