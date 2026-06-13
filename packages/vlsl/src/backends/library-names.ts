import { DataType, type DataTypeValue } from '../lang/types.js';

// Library function-name resolution (backend-agnostic). The canonical stdlib exposes these
// mangled names identically in every backend's lib bodies (noise.wgsl, noise.glsl, ...).

const VEC_SUFFIX = new Map<DataTypeValue, string>([
  [DataType.Float, '_f'],
  [DataType.Vec2, '_v2'],
  [DataType.Vec3, '_v3'],
  [DataType.Vec4, '_v4'],
]);

// Dimension suffix for noise name mangling (noise_simplex -> noise_simplex_2d).
function dimSuffix(pos: DataTypeValue): string {
  if (pos === DataType.Float) return '1d';
  if (pos === DataType.Vec2) return '2d';
  if (pos === DataType.Vec3) return '3d';
  if (pos === DataType.Vec4) return '4d';
  return '?';
}

export function getLibraryFunctionName(name: string, argTypes: DataTypeValue[]): string | null {
  // -- Math library --
  if (name === 'rotate') {
    return remapRotate(argTypes);
  }
  if (name === 'smin' || name === 'smax') {
    return remapSminSmax(name, argTypes);
  }
  if (name === 'ping_pong') {
    return remapPingPong(argTypes);
  }
  if (name === 'repeat') {
    return remapRepeat(argTypes);
  }
  if (name === 'slerp') {
    return remapSlerp(argTypes);
  }
  if (name === 'inverse_slerp') {
    return remapInverseSlerp(argTypes);
  }

  // -- Color library --
  if (name === 'linear_to_srgb') {
    if (argTypes[0] === DataType.Float) return 'linear_to_srgb_f';
    return null;
  }
  if (name === 'srgb_to_linear') {
    if (argTypes[0] === DataType.Float) return 'srgb_to_linear_f';
    return null;
  }

  // -- Blend library --
  if (name.startsWith('blend_')) {
    return remapBlend(name, argTypes);
  }

  // -- Random library --
  if (name === 'random_range') {
    return remapRandomRange(argTypes);
  }
  if (name === 'random_direction_2d' || name === 'random_direction_3d') {
    return remapRandomDirection(name, argTypes);
  }
  if (name === 'random_in_circle' || name === 'random_in_sphere') {
    return remapRandomSampling(name, argTypes);
  }

  // -- Noise library --
  // Names are base overloaded names (e.g. noise_simplex, not noise_simplex_2d).
  // The WGSL name includes a dimension suffix derived from the position arg type.
  if (name.startsWith('noise_') || name.startsWith('fractal_') || name.startsWith('warp_')) {
    return remapNoise(name, argTypes);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Math remapping
// ---------------------------------------------------------------------------

function remapRotate(argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  if (n === 1 && argTypes[0] === DataType.Float) return 'rotation_mat2';
  if (n === 2 && argTypes[0] === DataType.Vec2) return 'rotate_2d';
  if (n === 3 && argTypes[0] === DataType.Vec2) return 'rotate_2d_pivot';
  if (n === 2 && argTypes[0] === DataType.Vec3) return 'rotation_mat3';
  if (n === 3 && argTypes[0] === DataType.Vec3) return 'rotate_3d';
  if (n === 4 && argTypes[0] === DataType.Vec3) return 'rotate_3d_pivot';
  return null;
}

function remapSminSmax(name: string, argTypes: DataTypeValue[]): string | null {
  // (float, float, float) -> smin/smax (no remap)
  // (vecN, vecN, float) -> smin_vN/smax_vN
  const first = argTypes[0];
  if (first === DataType.Vec2) return name + '_v2';
  if (first === DataType.Vec3) return name + '_v3';
  if (first === DataType.Vec4) return name + '_v4';
  return null; // scalar passes through
}

function remapPingPong(argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  const first = argTypes[0];
  // (float, float) -> ping_pong (no remap)
  // (float) -> ping_pong_unit
  if (n === 1 && first === DataType.Float) return 'ping_pong_unit';
  // (vecN, float) -> ping_pong_vN
  if (n === 2 && first === DataType.Vec2) return 'ping_pong_v2';
  if (n === 2 && first === DataType.Vec3) return 'ping_pong_v3';
  if (n === 2 && first === DataType.Vec4) return 'ping_pong_v4';
  // (vecN) -> ping_pong_unit_vN
  if (n === 1 && first === DataType.Vec2) return 'ping_pong_unit_v2';
  if (n === 1 && first === DataType.Vec3) return 'ping_pong_unit_v3';
  if (n === 1 && first === DataType.Vec4) return 'ping_pong_unit_v4';
  return null; // (float, float) passes through
}

function remapRepeat(argTypes: DataTypeValue[]): string | null {
  const first = argTypes[0];
  const second = argTypes[1];
  // (float, float) -> repeat_f
  if (first === DataType.Float) return 'repeat_f';
  // (vecN, vecN) -> repeat_vN
  if (first === DataType.Vec2 && second === DataType.Vec2) return 'repeat_v2';
  if (first === DataType.Vec3 && second === DataType.Vec3) return 'repeat_v3';
  if (first === DataType.Vec4 && second === DataType.Vec4) return 'repeat_v4';
  // (vecN, float) -> repeat_vNs
  if (first === DataType.Vec2 && second === DataType.Float) return 'repeat_v2s';
  if (first === DataType.Vec3 && second === DataType.Float) return 'repeat_v3s';
  if (first === DataType.Vec4 && second === DataType.Float) return 'repeat_v4s';
  return null;
}

function remapSlerp(argTypes: DataTypeValue[]): string | null {
  if (argTypes[0] === DataType.Vec2) return 'slerp_v2';
  if (argTypes[0] === DataType.Vec3) return 'slerp_v3';
  if (argTypes[0] === DataType.Vec4) return 'slerp_v4';
  return null;
}

function remapInverseSlerp(argTypes: DataTypeValue[]): string | null {
  if (argTypes[0] === DataType.Vec2) return 'inverse_slerp_v2';
  if (argTypes[0] === DataType.Vec3) return 'inverse_slerp_v3';
  if (argTypes[0] === DataType.Vec4) return 'inverse_slerp_v4';
  return null;
}

// ---------------------------------------------------------------------------
// Blend remapping
// ---------------------------------------------------------------------------

function remapBlend(name: string, argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  // (float, float) -> _blend_xxx_f
  if (n === 2 && argTypes[0] === DataType.Float) return '_' + name + '_f';
  // (vec3, vec3) -> blend_xxx (no remap)
  if (n === 2 && argTypes[0] === DataType.Vec3) return null;
  // (vec3, vec3, float) -> blend_xxx_opacity
  if (n === 3) return name + '_opacity';
  return null;
}

// ---------------------------------------------------------------------------
// Random remapping
// ---------------------------------------------------------------------------

function remapRandomRange(argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  const first = argTypes[0];
  const suffix = VEC_SUFFIX.get(first) ?? '_f';
  // Seedless: 2 args -> random_range_X_auto
  if (n === 2) return 'random_range' + suffix + '_auto';
  // Int seed: 3 args and last arg is int -> random_range_X_i
  if (n === 3 && argTypes[2] === DataType.Int) return 'random_range' + suffix + '_i';
  // Float seed: 3 args -> random_range_X
  if (n === 3) return 'random_range' + suffix;
  return null;
}

function remapRandomDirection(name: string, argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  if (n === 0) return name + '_auto';
  const first = argTypes[0];
  if (first === DataType.Float) return name + '_f';
  if (first === DataType.Int) return name + '_i';
  if (first === DataType.Vec2) return name + '_v2';
  return null;
}

function remapRandomSampling(name: string, argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  if (n === 0) return name + '_auto';
  const first = argTypes[0];
  if (first === DataType.Float) return name + '_f';
  if (first === DataType.Int) return name + '_i';
  if (first === DataType.Vec2) return name + '_v2';
  return null;
}

// ---------------------------------------------------------------------------
// Noise remapping
// ---------------------------------------------------------------------------

// Noise functions are registered under base overloaded names (e.g. noise_simplex).
// The WGSL backend uses mangled names with dimension suffixes (e.g. noise_simplex_2d).
// This section determines the WGSL name from the base name + argument types.

const BASE_NOISE_NAMES = new Set<string>([
  'noise_simplex', 'noise_simplex_smooth', 'noise_perlin',
  'noise_value', 'noise_value_cubic',
]);

const FRACTAL_NC_NAMES = new Set<string>([
  'fractal_fbm_simplex', 'fractal_fbm_simplex_smooth', 'fractal_fbm_perlin',
  'fractal_fbm_value', 'fractal_fbm_value_cubic',
  'fractal_ridged_simplex', 'fractal_ridged_simplex_smooth', 'fractal_ridged_perlin',
  'fractal_ridged_value', 'fractal_ridged_value_cubic',
]);

const FRACTAL_CELL_NAMES = new Set<string>([
  'fractal_fbm_cellular', 'fractal_ridged_cellular',
]);

const PINGPONG_NC_NAMES = new Set<string>([
  'fractal_pingpong_simplex', 'fractal_pingpong_simplex_smooth', 'fractal_pingpong_perlin',
  'fractal_pingpong_value', 'fractal_pingpong_value_cubic',
]);

const PINGPONG_CELL_NAMES = new Set<string>([
  'fractal_pingpong_cellular',
]);

const WARP_BASE_NAMES = new Set<string>([
  'warp_simplex', 'warp_simplex_reduced', 'warp_grid',
]);

const WARP_FRAC_NAMES = new Set<string>([
  'warp_fractal_progressive_simplex', 'warp_fractal_progressive_simplex_reduced',
  'warp_fractal_progressive_grid',
  'warp_fractal_independent_simplex', 'warp_fractal_independent_simplex_reduced',
  'warp_fractal_independent_grid',
]);

function findPosType(argTypes: DataTypeValue[], seeded: boolean): DataTypeValue {
  if (seeded) {
    return argTypes[1]; // position is always the second arg for seeded calls
  }
  return argTypes[0]; // position is the first arg for seedless calls
}

function remapNoise(name: string, argTypes: DataTypeValue[]): string | null {
  if (BASE_NOISE_NAMES.has(name)) {
    return remapBaseNoise(name, argTypes);
  }
  if (name === 'noise_cellular') {
    return remapCellular(name, argTypes);
  }
  if (FRACTAL_NC_NAMES.has(name)) {
    return remapFractalNonCellular(name, argTypes);
  }
  if (FRACTAL_CELL_NAMES.has(name)) {
    return remapFractalCellular(name, argTypes);
  }
  if (PINGPONG_NC_NAMES.has(name)) {
    return remapPingPongNonCellularNoise(name, argTypes);
  }
  if (PINGPONG_CELL_NAMES.has(name)) {
    return remapPingPongCellularNoise(name, argTypes);
  }
  if (WARP_BASE_NAMES.has(name)) {
    return remapWarpBase(name, argTypes);
  }
  if (WARP_FRAC_NAMES.has(name)) {
    return remapWarpFractal(name, argTypes);
  }
  return null;
}

function remapBaseNoise(name: string, argTypes: DataTypeValue[]): string | null {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    if (dim === '3d' && n === 3 && argTypes[2] === DataType.Int) {
      // (int, vec3, int) -> noise_TYPE_3d_rot
      return name + '_3d_rot';
    }
    // (int, pos) -> wgslBase (the base seeded form)
    return wgslBase;
  }

  // Seedless variants
  if (dim === '3d' && n === 2 && argTypes[1] === DataType.Int) {
    // (vec3, int) -> noise_TYPE_3d_rot_seedless
    return name + '_3d_rot_seedless';
  }
  // (pos) -> wgslBase_default
  return wgslBase + '_default';
}

function remapCellular(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (dim === '2d') {
    if (seeded) {
      if (n === 5) return wgslBase; // (seed, pos, df, rt, jitter) -> base
      if (n === 4) return wgslBase + '_default'; // (seed, pos, df, rt)
    } else {
      if (n === 3) return wgslBase + '_default_3'; // (pos, df, rt)
      if (n === 4) return wgslBase + '_default_4'; // (pos, df, rt, jitter)
    }
  }

  if (dim === '3d') {
    if (seeded) {
      if (n === 5 && argTypes[4] === DataType.Float) return wgslBase; // (seed, pos, df, rt, jitter)
      if (n === 4) return wgslBase + '_default'; // (seed, pos, df, rt)
      if (n === 6) return wgslBase + '_rot'; // (seed, pos, df, rt, jitter, rotation)
      if (n === 5 && argTypes[4] === DataType.Int) return wgslBase + '_rot_default'; // (seed, pos, df, rt, rotation)
    } else {
      if (n === 3) return wgslBase + '_default_3'; // (pos, df, rt)
      if (n === 4 && argTypes[3] === DataType.Float) return wgslBase + '_default_4'; // (pos, df, rt, jitter)
      if (n === 4 && argTypes[3] === DataType.Int) return wgslBase + '_rot_default_seedless'; // (pos, df, rt, rotation)
      if (n === 5) return wgslBase + '_rot_seedless'; // (pos, df, rt, jitter, rotation)
    }
  }

  if (dim === '4d') {
    if (seeded) {
      if (n === 5) return wgslBase; // (seed, pos, df, rt, jitter)
      if (n === 4) return wgslBase + '_default'; // (seed, pos, df, rt)
    } else {
      if (n === 3) return wgslBase + '_default_3'; // (pos, df, rt)
      if (n === 4) return wgslBase + '_default_4'; // (pos, df, rt, jitter)
    }
  }

  return wgslBase;
}

// Fractal FBm/Ridged non-cellular:
// From the WGSL:
// fractal_fbm_simplex_2d(seed, pos, octaves, lac, gain, ws) -> 6 args = BASE
// fractal_fbm_simplex_2d_default(pos) -> 1 arg = seedless default
// fractal_fbm_simplex_2d_default_5(pos, octaves, lac, gain, ws) -> 5 args = seedless full
// fractal_fbm_simplex_2d_default_5_5(seed, pos, octaves, lac, gain) -> 5 args = seeded partial

function remapFractalNonCellular(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    if (n === 6) return wgslBase; // Seeded full -> base name
    if (n === 5) return wgslBase + '_default_5_5'; // Seeded partial
    // Seeded default (seed, pos) -> 2 args
    // No dedicated WGSL wrapper, but we still emit the base name
    // (the engine inserts defaults at the codegen level)
    return wgslBase;
  }

  // Seedless
  if (n === 1) return wgslBase + '_default'; // Seedless default
  if (n === 5) return wgslBase + '_default_5'; // Seedless full
  if (n === 4) return wgslBase; // Seedless partial -> no WGSL wrapper, pass through
  return wgslBase;
}

function remapFractalCellular(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    if (n === 8) return wgslBase; // Seeded full -> base name
    if (n === 7) return wgslBase + '_default_7_5'; // Seeded partial
    if (n === 4) return wgslBase; // Seeded default (seed, pos, df, rt)
    return wgslBase;
  }

  // Seedless
  if (n === 3) return wgslBase + '_default'; // Seedless default (pos, df, rt)
  if (n === 7) return wgslBase + '_default_7'; // Seedless full
  if (n === 6) return wgslBase; // Seedless partial
  return wgslBase;
}

function remapPingPongNonCellularNoise(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    if (n === 7) return wgslBase; // Seeded full -> base name
    if (n === 6) return wgslBase + '_default_6_5'; // Seeded partial
    if (n === 2) return wgslBase; // Seeded default
    return wgslBase;
  }

  // Seedless
  if (n === 1) return wgslBase + '_default'; // Seedless default
  if (n === 6) return wgslBase + '_default_6'; // Seedless full
  if (n === 5) return wgslBase; // Seedless partial
  return wgslBase;
}

function remapPingPongCellularNoise(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  const pos = findPosType(argTypes, seeded);
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    if (n === 9) return wgslBase; // Seeded full -> base name
    if (n === 8) return wgslBase + '_default_8_5'; // Seeded partial
    if (n === 4) return wgslBase; // Seeded default
    return wgslBase;
  }

  // Seedless
  if (n === 3) return wgslBase + '_default'; // Seedless default
  if (n === 8) return wgslBase + '_default_8'; // Seedless full
  if (n === 7) return wgslBase; // Seedless partial
  return wgslBase;
}

function remapWarpBase(name: string, argTypes: DataTypeValue[]): string {
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  // For warp, position is the last arg: seeded (seed, amp, freq, pos), seedless (amp, freq, pos)
  const pos = seeded ? argTypes[3] : argTypes[2];
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    // Seeded: (seed, amp, freq, pos) -> wgslBase
    return wgslBase;
  }
  // Seedless: (amp, freq, pos) -> wgslBase_default
  return wgslBase + '_default';
}

function remapWarpFractal(name: string, argTypes: DataTypeValue[]): string {
  const n = argTypes.length;
  const first = argTypes[0];
  const seeded = first === DataType.Int;
  // For warp fractal, position is at index 3 (seeded) or 2 (seedless)
  const pos = seeded ? argTypes[3] : argTypes[2];
  const dim = dimSuffix(pos);
  const wgslBase = name + '_' + dim;

  if (seeded) {
    // Seeded full: (seed, amp, freq, pos, octaves, lac, gain) -> 7 args -> wgslBase
    if (n === 7) return wgslBase;
    // Seeded default: (seed, amp, freq, pos) -> 4 args -> wgslBase_default_5
    if (n === 4) return wgslBase + '_default_5';
    return wgslBase;
  }

  // Seedless
  if (n === 3) return wgslBase + '_default'; // Seedless default
  if (n === 6) return wgslBase + '_default_7'; // Seedless full
  return wgslBase;
}
