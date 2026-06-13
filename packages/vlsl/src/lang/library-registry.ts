import { DataType, type DataTypeValue } from './types.js';
import type { Overload } from './builtins.js';

// ---------------------------------------------------------------------------
// Overload helper
// ---------------------------------------------------------------------------

function ov(returnType: DataTypeValue, params: DataTypeValue[], stages: null = null, inoutParams: number[] | null = null): Overload {
  return { returnType, params, stages, inoutParams };
}

// ---------------------------------------------------------------------------
// Math library
// ---------------------------------------------------------------------------

function buildMathSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();

  function reg(name: string, overloads: Overload[]): void {
    if (map.has(name)) {
      map.get(name)!.push(...overloads);
    } else {
      map.set(name, [...overloads]);
    }
  }

  // -- Rotation 2D --
  reg('rotate', [
    ov(DataType.Vec2, [DataType.Vec2, DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Float, DataType.Vec2]),
    ov(DataType.Mat2, [DataType.Float]),
  ]);

  // -- Rotation 3D --
  reg('rotate', [
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float, DataType.Vec3]),
    ov(DataType.Mat3, [DataType.Vec3, DataType.Float]),
  ]);

  // -- Smooth min --
  reg('smin', [
    ov(DataType.Float, [DataType.Float, DataType.Float, DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Vec4, DataType.Float]),
  ]);

  // -- Smooth max --
  reg('smax', [
    ov(DataType.Float, [DataType.Float, DataType.Float, DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Vec4, DataType.Float]),
  ]);

  // -- Ping-pong --
  reg('ping_pong', [
    ov(DataType.Float, [DataType.Float, DataType.Float]),
    ov(DataType.Float, [DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2]),
    ov(DataType.Vec3, [DataType.Vec3]),
    ov(DataType.Vec4, [DataType.Vec4]),
  ]);

  // -- Repeat --
  reg('repeat', [
    ov(DataType.Float, [DataType.Float, DataType.Float]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Vec2]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Vec4]),
    ov(DataType.Vec2, [DataType.Vec2, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Float]),
  ]);

  // -- Slerp --
  reg('slerp', [
    ov(DataType.Vec2, [DataType.Vec2, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Vec4, DataType.Vec4, DataType.Float]),
  ]);

  // -- Inverse slerp --
  reg('inverse_slerp', [
    ov(DataType.Float, [DataType.Vec2, DataType.Vec2, DataType.Vec2]),
    ov(DataType.Float, [DataType.Vec3, DataType.Vec3, DataType.Vec3]),
    ov(DataType.Float, [DataType.Vec4, DataType.Vec4, DataType.Vec4]),
  ]);

  return map;
}

// ---------------------------------------------------------------------------
// Noise library
// ---------------------------------------------------------------------------

const ALL_POS: DataTypeValue[] = [DataType.Float, DataType.Vec2, DataType.Vec3, DataType.Vec4];
const CELL_POS: DataTypeValue[] = [DataType.Vec2, DataType.Vec3, DataType.Vec4];

function buildNoiseSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();

  function reg(name: string, overloads: Overload[]): void {
    if (map.has(name)) {
      map.get(name)!.push(...overloads);
    } else {
      map.set(name, [...overloads]);
    }
  }

  // -- Base noise (non-cellular) --
  const baseNames: string[] = [
    'noise_simplex', 'noise_simplex_smooth', 'noise_perlin',
    'noise_value', 'noise_value_cubic',
  ];
  for (const baseName of baseNames) {
    for (const pos of ALL_POS) {
      // Seeded: (int seed, posType pos)
      reg(baseName, [ov(DataType.Float, [DataType.Int, pos])]);
      // Seedless: (posType pos)
      reg(baseName, [ov(DataType.Float, [pos])]);
    }
    // 3D rotation overloads: seeded and seedless
    reg(baseName, [
      ov(DataType.Float, [DataType.Int, DataType.Vec3, DataType.Int]),
      ov(DataType.Float, [DataType.Vec3, DataType.Int]),
    ]);
  }

  // -- Cellular noise --
  addCellularNoise(reg);

  // -- Fractal FBm (non-cellular) --
  const fbmNames: string[] = [
    'fractal_fbm_simplex', 'fractal_fbm_simplex_smooth', 'fractal_fbm_perlin',
    'fractal_fbm_value', 'fractal_fbm_value_cubic',
  ];
  for (const name of fbmNames) addFractalNonCellular(reg, name);

  // -- Fractal FBm (cellular) --
  addFractalCellular(reg, 'fractal_fbm_cellular');

  // -- Fractal Ridged (non-cellular) --
  const ridgedNames: string[] = [
    'fractal_ridged_simplex', 'fractal_ridged_simplex_smooth', 'fractal_ridged_perlin',
    'fractal_ridged_value', 'fractal_ridged_value_cubic',
  ];
  for (const name of ridgedNames) addFractalNonCellular(reg, name);

  // -- Fractal Ridged (cellular) --
  addFractalCellular(reg, 'fractal_ridged_cellular');

  // -- Fractal PingPong (non-cellular) --
  const ppNames: string[] = [
    'fractal_pingpong_simplex', 'fractal_pingpong_simplex_smooth', 'fractal_pingpong_perlin',
    'fractal_pingpong_value', 'fractal_pingpong_value_cubic',
  ];
  for (const name of ppNames) addPingPongNonCellular(reg, name);

  // -- Fractal PingPong (cellular) --
  addPingPongCellular(reg, 'fractal_pingpong_cellular');

  // -- Warp base --
  const warpBaseNames: string[] = ['warp_simplex', 'warp_simplex_reduced', 'warp_grid'];
  for (const name of warpBaseNames) addWarpBase(reg, name);

  // -- Warp fractal --
  const warpFracNames: string[] = [
    'warp_fractal_progressive_simplex', 'warp_fractal_progressive_simplex_reduced',
    'warp_fractal_progressive_grid',
    'warp_fractal_independent_simplex', 'warp_fractal_independent_simplex_reduced',
    'warp_fractal_independent_grid',
  ];
  for (const name of warpFracNames) addWarpFractal(reg, name);

  return map;
}

function addCellularNoise(reg: (name: string, overloads: Overload[]) => void): void {
  const name = 'noise_cellular';

  // 2D seeded: (seed, pos, df, rt, jitter) and (seed, pos, df, rt)
  reg(name, [
    ov(DataType.Float, [DataType.Int, DataType.Vec2, DataType.Int, DataType.Int, DataType.Float]),
    ov(DataType.Float, [DataType.Int, DataType.Vec2, DataType.Int, DataType.Int]),
  ]);
  // 2D seedless: (pos, df, rt) and (pos, df, rt, jitter)
  reg(name, [
    ov(DataType.Float, [DataType.Vec2, DataType.Int, DataType.Int]),
    ov(DataType.Float, [DataType.Vec2, DataType.Int, DataType.Int, DataType.Float]),
  ]);

  // 3D seeded
  reg(name, [
    ov(DataType.Float, [DataType.Int, DataType.Vec3, DataType.Int, DataType.Int, DataType.Float]),
    ov(DataType.Float, [DataType.Int, DataType.Vec3, DataType.Int, DataType.Int]),
    ov(DataType.Float, [DataType.Int, DataType.Vec3, DataType.Int, DataType.Int, DataType.Float, DataType.Int]),
    ov(DataType.Float, [DataType.Int, DataType.Vec3, DataType.Int, DataType.Int, DataType.Int]),
  ]);
  // 3D seedless
  reg(name, [
    ov(DataType.Float, [DataType.Vec3, DataType.Int, DataType.Int]),
    ov(DataType.Float, [DataType.Vec3, DataType.Int, DataType.Int, DataType.Float]),
    ov(DataType.Float, [DataType.Vec3, DataType.Int, DataType.Int, DataType.Int]),
    ov(DataType.Float, [DataType.Vec3, DataType.Int, DataType.Int, DataType.Float, DataType.Int]),
  ]);

  // 4D seeded
  reg(name, [
    ov(DataType.Float, [DataType.Int, DataType.Vec4, DataType.Int, DataType.Int, DataType.Float]),
    ov(DataType.Float, [DataType.Int, DataType.Vec4, DataType.Int, DataType.Int]),
  ]);
  // 4D seedless
  reg(name, [
    ov(DataType.Float, [DataType.Vec4, DataType.Int, DataType.Int]),
    ov(DataType.Float, [DataType.Vec4, DataType.Int, DataType.Int, DataType.Float]),
  ]);
}

function addFractalNonCellular(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of ALL_POS) {
    reg(baseName, [
      // Seeded full: (seed, pos, octaves, lac, gain, ws)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded partial: (seed, pos, octaves, lac, gain)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Float, DataType.Float]),
      // Seeded default: (seed, pos)
      ov(DataType.Float, [DataType.Int, pos]),
      // Seedless full: (pos, octaves, lac, gain, ws)
      ov(DataType.Float, [pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless partial: (pos, octaves, lac, gain)
      ov(DataType.Float, [pos, DataType.Int, DataType.Float, DataType.Float]),
      // Seedless default: (pos)
      ov(DataType.Float, [pos]),
    ]);
  }
}

function addFractalCellular(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of CELL_POS) {
    reg(baseName, [
      // Seeded full: (seed, pos, df, rt, octaves, lac, gain, ws)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded partial: (seed, pos, df, rt, octaves, lac, gain)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float]),
      // Seeded default: (seed, pos, df, rt)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int]),
      // Seedless full: (pos, df, rt, octaves, lac, gain, ws)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless partial: (pos, df, rt, octaves, lac, gain)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float]),
      // Seedless default: (pos, df, rt)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int]),
    ]);
  }
}

function addPingPongNonCellular(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of ALL_POS) {
    reg(baseName, [
      // Seeded full: (seed, pos, octaves, lac, gain, strength, ws)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded partial: (seed, pos, octaves, lac, gain, strength)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded default: (seed, pos)
      ov(DataType.Float, [DataType.Int, pos]),
      // Seedless full: (pos, octaves, lac, gain, strength, ws)
      ov(DataType.Float, [pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless partial: (pos, octaves, lac, gain, strength)
      ov(DataType.Float, [pos, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless default: (pos)
      ov(DataType.Float, [pos]),
    ]);
  }
}

function addPingPongCellular(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of CELL_POS) {
    reg(baseName, [
      // Seeded full: (seed, pos, df, rt, octaves, lac, gain, strength, ws)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded partial: (seed, pos, df, rt, octaves, lac, gain, strength)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seeded default: (seed, pos, df, rt)
      ov(DataType.Float, [DataType.Int, pos, DataType.Int, DataType.Int]),
      // Seedless full: (pos, df, rt, octaves, lac, gain, strength, ws)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless partial: (pos, df, rt, octaves, lac, gain, strength)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int, DataType.Int, DataType.Float, DataType.Float, DataType.Float]),
      // Seedless default: (pos, df, rt)
      ov(DataType.Float, [pos, DataType.Int, DataType.Int]),
    ]);
  }
}

function addWarpBase(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of ALL_POS) {
    reg(baseName, [
      // Seeded: (seed, amp, freq, inout pos)
      ov(DataType.Void, [DataType.Int, DataType.Float, DataType.Float, pos], null, [3]),
      // Seedless: (amp, freq, inout pos)
      ov(DataType.Void, [DataType.Float, DataType.Float, pos], null, [2]),
    ]);
  }
}

function addWarpFractal(reg: (name: string, overloads: Overload[]) => void, baseName: string): void {
  for (const pos of ALL_POS) {
    reg(baseName, [
      // Seeded full: (seed, amp, freq, inout pos, octaves, lac, gain)
      ov(DataType.Void, [DataType.Int, DataType.Float, DataType.Float, pos, DataType.Int, DataType.Float, DataType.Float], null, [3]),
      // Seeded default: (seed, amp, freq, inout pos)
      ov(DataType.Void, [DataType.Int, DataType.Float, DataType.Float, pos], null, [3]),
      // Seedless full: (amp, freq, inout pos, octaves, lac, gain)
      ov(DataType.Void, [DataType.Float, DataType.Float, pos, DataType.Int, DataType.Float, DataType.Float], null, [2]),
      // Seedless default: (amp, freq, inout pos)
      ov(DataType.Void, [DataType.Float, DataType.Float, pos], null, [2]),
    ]);
  }
}

// ---------------------------------------------------------------------------
// Color library
// ---------------------------------------------------------------------------

function buildColorSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();

  function reg(name: string, overloads: Overload[]): void {
    map.set(name, overloads);
  }

  reg('rgb_to_hsv', [ov(DataType.Vec3, [DataType.Vec3])]);
  reg('hsv_to_rgb', [ov(DataType.Vec3, [DataType.Vec3])]);
  reg('rgb_to_hsl', [ov(DataType.Vec3, [DataType.Vec3])]);
  reg('hsl_to_rgb', [ov(DataType.Vec3, [DataType.Vec3])]);

  reg('linear_to_srgb', [
    ov(DataType.Float, [DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3]),
  ]);
  reg('srgb_to_linear', [
    ov(DataType.Float, [DataType.Float]),
    ov(DataType.Vec3, [DataType.Vec3]),
  ]);

  reg('luminance', [ov(DataType.Float, [DataType.Vec3])]);

  reg('adjust_brightness', [ov(DataType.Vec3, [DataType.Vec3, DataType.Float])]);
  reg('adjust_contrast', [ov(DataType.Vec3, [DataType.Vec3, DataType.Float])]);
  reg('adjust_saturation', [ov(DataType.Vec3, [DataType.Vec3, DataType.Float])]);
  reg('adjust_hue', [ov(DataType.Vec3, [DataType.Vec3, DataType.Float])]);

  reg('color_temperature', [ov(DataType.Vec3, [DataType.Float])]);
  reg('posterize', [ov(DataType.Vec3, [DataType.Vec3, DataType.Float])]);

  return map;
}

// ---------------------------------------------------------------------------
// Blend library
// ---------------------------------------------------------------------------

const BLEND_NAMES: string[] = [
  'blend_add', 'blend_average', 'blend_color_burn', 'blend_color_dodge',
  'blend_darken', 'blend_difference', 'blend_exclusion', 'blend_glow',
  'blend_hard_light', 'blend_hard_mix', 'blend_lighten', 'blend_linear_burn',
  'blend_linear_dodge', 'blend_linear_light', 'blend_multiply', 'blend_negation',
  'blend_normal', 'blend_overlay', 'blend_phoenix', 'blend_pin_light',
  'blend_reflect', 'blend_screen', 'blend_soft_light', 'blend_subtract',
  'blend_vivid_light',
];

function buildBlendSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();
  for (const name of BLEND_NAMES) {
    map.set(name, [
      ov(DataType.Float, [DataType.Float, DataType.Float]),
      ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3]),
      ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3, DataType.Float]),
    ]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Ease library
// ---------------------------------------------------------------------------

const EASE_NAMES: string[] = [
  'ease_linear',
  'ease_quad_in', 'ease_quad_out', 'ease_quad_in_out',
  'ease_cubic_in', 'ease_cubic_out', 'ease_cubic_in_out',
  'ease_quart_in', 'ease_quart_out', 'ease_quart_in_out',
  'ease_quint_in', 'ease_quint_out', 'ease_quint_in_out',
  'ease_sine_in', 'ease_sine_out', 'ease_sine_in_out',
  'ease_expo_in', 'ease_expo_out', 'ease_expo_in_out',
  'ease_circ_in', 'ease_circ_out', 'ease_circ_in_out',
  'ease_elastic_in', 'ease_elastic_out', 'ease_elastic_in_out',
  'ease_back_in', 'ease_back_out', 'ease_back_in_out',
  'ease_bounce_in', 'ease_bounce_out', 'ease_bounce_in_out',
];

function buildEaseSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();
  for (const name of EASE_NAMES) {
    map.set(name, [ov(DataType.Float, [DataType.Float])]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Random library
// ---------------------------------------------------------------------------

const HASH_INPUTS: DataTypeValue[] = [DataType.Float, DataType.Vec2, DataType.Vec3, DataType.Vec4];
const HASH_OUTPUTS: DataTypeValue[] = [DataType.Float, DataType.Vec2, DataType.Vec3, DataType.Vec4];

function dimOf(t: DataTypeValue): number {
  if (t === DataType.Float) return 1;
  if (t === DataType.Vec2) return 2;
  if (t === DataType.Vec3) return 3;
  if (t === DataType.Vec4) return 4;
  return 0;
}

function buildRandomSignatures(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();

  function reg(name: string, overloads: Overload[]): void {
    if (map.has(name)) {
      map.get(name)!.push(...overloads);
    } else {
      map.set(name, [...overloads]);
    }
  }

  // Hash functions: hash{inDim}{outDim}
  for (const input of HASH_INPUTS) {
    for (const output of HASH_OUTPUTS) {
      const name = `hash${dimOf(input)}${dimOf(output)}`;
      reg(name, [ov(output, [input])]);
    }
  }

  // random_range
  for (const outType of HASH_OUTPUTS) {
    reg('random_range', [
      ov(outType, [outType, outType, DataType.Float]),
      ov(outType, [outType, outType, DataType.Int]),
      ov(outType, [outType, outType]),
    ]);
  }

  // random_direction_2d
  reg('random_direction_2d', [
    ov(DataType.Vec2, [DataType.Float]),
    ov(DataType.Vec2, [DataType.Int]),
    ov(DataType.Vec2, [DataType.Vec2]),
    ov(DataType.Vec2, []),
  ]);

  // random_direction_3d
  reg('random_direction_3d', [
    ov(DataType.Vec3, [DataType.Float]),
    ov(DataType.Vec3, [DataType.Int]),
    ov(DataType.Vec3, [DataType.Vec2]),
    ov(DataType.Vec3, []),
  ]);

  // random_in_circle
  reg('random_in_circle', [
    ov(DataType.Vec2, [DataType.Float]),
    ov(DataType.Vec2, [DataType.Int]),
    ov(DataType.Vec2, [DataType.Vec2]),
    ov(DataType.Vec2, []),
  ]);

  // random_in_sphere
  reg('random_in_sphere', [
    ov(DataType.Vec3, [DataType.Float]),
    ov(DataType.Vec3, [DataType.Int]),
    ov(DataType.Vec3, [DataType.Vec2]),
    ov(DataType.Vec3, []),
  ]);

  return map;
}

// ---------------------------------------------------------------------------
// Registry cache
// ---------------------------------------------------------------------------

const _cache = new Map<string, Map<string, Overload[]>>();

function getOrBuild(name: string, builder: () => Map<string, Overload[]>): Map<string, Overload[]> {
  if (!_cache.has(name)) {
    _cache.set(name, builder());
  }
  return _cache.get(name)!;
}

const LIBRARY_BUILDERS: Record<string, () => Map<string, Overload[]>> = {
  math: buildMathSignatures,
  noise: buildNoiseSignatures,
  color: buildColorSignatures,
  blend: buildBlendSignatures,
  ease: buildEaseSignatures,
  random: buildRandomSignatures,
};

// ---------------------------------------------------------------------------
// Public API: getLibrarySignatures
// ---------------------------------------------------------------------------

export function getLibrarySignatures(name: string): Map<string, Overload[]> | null {
  const builder = LIBRARY_BUILDERS[name];
  if (!builder) return null;
  return getOrBuild(name, builder);
}


// Returns an array of argument indices that are inout for a library function call,
// or null if no inout params. Used by codegen to emit & at call sites.
export function getLibraryInoutParams(name: string, argTypes: DataTypeValue[]): number[] | null {
  // Only warp functions have inout params
  if (!name.startsWith('warp_')) return null;

  // Find the matching overload to get its inoutParams
  for (const libName of ['noise']) {
    const sigs = getLibrarySignatures(libName);
    if (!sigs || !sigs.has(name)) continue;
    const overloads = sigs.get(name)!;
    for (const ol of overloads) {
      if (ol.params.length !== argTypes.length) continue;
      let match = true;
      for (let i = 0; i < ol.params.length; i++) {
        if (ol.params[i] !== argTypes[i]) { match = false; break; }
      }
      if (match) return ol.inoutParams ?? null;
    }
  }
  return null;
}

