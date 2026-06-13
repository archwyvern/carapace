import { DataType, type DataTypeValue } from './types.js';

export const ShaderStage = Object.freeze({
  Vertex: 'Vertex',
  Fragment: 'Fragment',
  Light: 'Light',
  ParticleStart: 'ParticleStart',
  ParticleProcess: 'ParticleProcess',
} as const);

export type ShaderStageValue = typeof ShaderStage[keyof typeof ShaderStage];

export interface Overload {
  returnType: DataTypeValue;
  params: DataTypeValue[];
  stages: ShaderStageValue[] | null;
  inoutParams?: number[] | null;
}

export interface BuiltinVariable {
  type: DataTypeValue;
  access: string;
}

// ---------------------------------------------------------------------------
// Variable tables
// ---------------------------------------------------------------------------

type VarRow = [string, DataTypeValue, string];

const GLOBAL_CONSTANTS: VarRow[] = [
  ['TIME',    DataType.Float, 'read'],
  ['PI',      DataType.Float, 'read'],
  ['TAU',     DataType.Float, 'read'],
  ['E',       DataType.Float, 'read'],
  ['EPSILON', DataType.Float, 'read'],
];

const CANVAS_ITEM_VERTEX: VarRow[] = [
  ['VERTEX',             DataType.Vec2,  'readwrite'],
  ['UV',                 DataType.Vec2,  'readwrite'],
  ['COLOR',              DataType.Vec4,  'readwrite'],
  ['POINT_SIZE',         DataType.Float, 'readwrite'],
  ['MODEL_MATRIX',       DataType.Mat4,  'read'],
  ['CANVAS_MATRIX',      DataType.Mat4,  'read'],
  ['SCREEN_MATRIX',      DataType.Mat4,  'read'],
  ['INSTANCE_CUSTOM',    DataType.Vec4,  'read'],
  ['INSTANCE_ID',        DataType.Int,   'read'],
  ['VERTEX_ID',          DataType.Int,   'read'],
  ['AT_LIGHT_PASS',      DataType.Bool,  'read'],
  ['TEXTURE_PIXEL_SIZE', DataType.Vec2,  'read'],
  ['CUSTOM0',            DataType.Vec4,  'read'],
  ['CUSTOM1',            DataType.Vec4,  'read'],
];

const CANVAS_ITEM_FRAGMENT: VarRow[] = [
  ['COLOR',                        DataType.Vec4,       'readwrite'],
  ['NORMAL',                       DataType.Vec3,       'readwrite'],
  ['NORMAL_MAP',                   DataType.Vec3,       'readwrite'],
  ['NORMAL_MAP_DEPTH',             DataType.Float,      'readwrite'],
  ['EMISSION',                     DataType.Vec3,       'readwrite'],
  ['BLEND_FACTOR',                 DataType.Vec4,       'readwrite'],
  ['VERTEX',                       DataType.Vec2,       'readwrite'],
  ['SHADOW_VERTEX',                DataType.Vec2,       'readwrite'],
  ['LIGHT_VERTEX',                 DataType.Vec3,       'readwrite'],
  ['FRAGCOORD',                    DataType.Vec4,       'read'],
  ['UV',                           DataType.Vec2,       'read'],
  ['TEXTURE',                      DataType.Sampler2D,  'read'],
  ['NORMAL_TEXTURE',               DataType.Sampler2D,  'read'],
  ['SPECULAR_SHININESS_TEXTURE',   DataType.Sampler2D,  'read'],
  ['SPECULAR_SHININESS',           DataType.Vec4,       'read'],
  ['TEXTURE_PIXEL_SIZE',           DataType.Vec2,       'read'],
  ['SCREEN_UV',                    DataType.Vec2,       'read'],
  ['SCREEN_PIXEL_SIZE',            DataType.Vec2,       'read'],
  ['POINT_COORD',                  DataType.Vec2,       'read'],
  ['AT_LIGHT_PASS',                DataType.Bool,       'read'],
  ['REGION_RECT',                  DataType.Vec4,       'read'],
];

const CANVAS_ITEM_LIGHT: VarRow[] = [
  ['LIGHT',              DataType.Vec4,      'readwrite'],
  ['SHADOW_MODULATE',    DataType.Vec4,      'readwrite'],
  ['FRAGCOORD',          DataType.Vec4,      'read'],
  ['NORMAL',             DataType.Vec3,      'read'],
  ['COLOR',              DataType.Vec4,      'read'],
  ['UV',                 DataType.Vec2,      'read'],
  ['SPECULAR_SHININESS', DataType.Vec4,      'read'],
  ['LIGHT_COLOR',        DataType.Vec4,      'read'],
  ['LIGHT_POSITION',     DataType.Vec3,      'read'],
  ['LIGHT_DIRECTION',    DataType.Vec3,      'read'],
  ['LIGHT_ENERGY',       DataType.Float,     'read'],
  ['LIGHT_IS_DIRECTIONAL', DataType.Bool,    'read'],
  ['LIGHT_VERTEX',       DataType.Vec3,      'read'],
  ['SCREEN_UV',          DataType.Vec2,      'read'],
  ['TEXTURE',            DataType.Sampler2D, 'read'],
  ['TEXTURE_PIXEL_SIZE', DataType.Vec2,      'read'],
  ['POINT_COORD',        DataType.Vec2,      'read'],
];

// Shared base for both particle stages (everything except the stage-specific entries)
const PARTICLES_BASE: VarRow[] = [
  ['COLOR',               DataType.Vec4,  'readwrite'],
  ['VELOCITY',            DataType.Vec2,  'readwrite'],
  ['MASS',                DataType.Float, 'readwrite'],
  ['ACTIVE',              DataType.Bool,  'readwrite'],
  ['CUSTOM',              DataType.Vec4,  'readwrite'],
  ['USERDATA1',           DataType.Vec4,  'readwrite'],
  ['USERDATA2',           DataType.Vec4,  'readwrite'],
  ['USERDATA3',           DataType.Vec4,  'readwrite'],
  ['USERDATA4',           DataType.Vec4,  'readwrite'],
  ['USERDATA5',           DataType.Vec4,  'readwrite'],
  ['USERDATA6',           DataType.Vec4,  'readwrite'],
  ['TRANSFORM',           DataType.Mat4,  'readwrite'],
  ['LIFETIME',            DataType.Float, 'read'],
  ['DELTA',               DataType.Float, 'read'],
  ['NUMBER',              DataType.Uint,  'read'],
  ['INDEX',               DataType.Uint,  'read'],
  ['EMISSION_TRANSFORM',  DataType.Mat4,  'read'],
  ['EMITTER_VELOCITY',    DataType.Vec2,  'read'],
  ['INTERPOLATE_TO_END',  DataType.Float, 'read'],
  ['RANDOM_SEED',         DataType.Uint,  'read'],
  ['FLAG_EMIT_POSITION',  DataType.Uint,  'read'],
  ['FLAG_EMIT_ROT_SCALE', DataType.Uint,  'read'],
  ['FLAG_EMIT_VELOCITY',  DataType.Uint,  'read'],
  ['FLAG_EMIT_COLOR',     DataType.Uint,  'read'],
  ['FLAG_EMIT_CUSTOM',    DataType.Uint,  'read'],
  ['AMOUNT_RATIO',        DataType.Float, 'read'],
];

const PARTICLES_START_ONLY: VarRow[] = [
  ['RESTART_POSITION',  DataType.Bool, 'read'],
  ['RESTART_ROT_SCALE', DataType.Bool, 'read'],
  ['RESTART_VELOCITY',  DataType.Bool, 'read'],
  ['RESTART_COLOR',     DataType.Bool, 'read'],
  ['RESTART_CUSTOM',    DataType.Bool, 'read'],
];

const PARTICLES_PROCESS_ONLY: VarRow[] = [
  ['RESTART',           DataType.Bool,  'read'],
  ['COLLIDED',          DataType.Bool,  'read'],
  ['COLLISION_NORMAL',  DataType.Vec2,  'read'],
  ['COLLISION_DEPTH',   DataType.Float, 'read'],
  ['ATTRACTOR_FORCE',   DataType.Vec2,  'read'],
];

function buildVarMap(rows: VarRow[]): Map<string, BuiltinVariable> {
  const map = new Map<string, BuiltinVariable>();
  for (const [name, type, access] of rows) {
    map.set(name, { type, access });
  }
  return map;
}

export function getBuiltinVariables(shaderType: string, stage: ShaderStageValue): Map<string, BuiltinVariable> {
  const rows: VarRow[] = [...GLOBAL_CONSTANTS];

  if (shaderType === 'canvas_item') {
    if (stage === ShaderStage.Vertex) {
      rows.push(...CANVAS_ITEM_VERTEX);
    } else if (stage === ShaderStage.Fragment) {
      rows.push(...CANVAS_ITEM_FRAGMENT);
    } else if (stage === ShaderStage.Light) {
      rows.push(...CANVAS_ITEM_LIGHT);
    }
  } else if (shaderType === 'particles') {
    if (stage === ShaderStage.ParticleStart) {
      rows.push(...PARTICLES_BASE, ...PARTICLES_START_ONLY);
    } else if (stage === ShaderStage.ParticleProcess) {
      rows.push(...PARTICLES_BASE, ...PARTICLES_PROCESS_ONLY);
    }
  }

  return buildVarMap(rows);
}

// ---------------------------------------------------------------------------
// Function overload helpers
// ---------------------------------------------------------------------------

const GEN_F_TYPES: DataTypeValue[]  = [DataType.Float, DataType.Vec2, DataType.Vec3, DataType.Vec4];
const GEN_I_TYPES: DataTypeValue[]  = [DataType.Int,   DataType.Ivec2, DataType.Ivec3, DataType.Ivec4];
const GEN_U_TYPES: DataTypeValue[]  = [DataType.Uint,  DataType.Uvec2, DataType.Uvec3, DataType.Uvec4];
const VEC_F_TYPES: DataTypeValue[]  = [DataType.Vec2, DataType.Vec3, DataType.Vec4];
const VEC_I_TYPES: DataTypeValue[]  = [DataType.Ivec2, DataType.Ivec3, DataType.Ivec4];
const VEC_U_TYPES: DataTypeValue[]  = [DataType.Uvec2, DataType.Uvec3, DataType.Uvec4];
const VEC_B_TYPES: DataTypeValue[]  = [DataType.Bvec2, DataType.Bvec3, DataType.Bvec4];

// genFType(n params) -> same genFType return
function genF(paramCount: number, stages: ShaderStageValue[] | null = null): Overload[] {
  return GEN_F_TYPES.map(t => ({
    returnType: t,
    params: Array(paramCount).fill(t) as DataTypeValue[],
    stages,
  }));
}

// genFType(n params) -> float scalar return
function genFToScalar(paramCount: number, stages: ShaderStageValue[] | null = null): Overload[] {
  return GEN_F_TYPES.map(t => ({
    returnType: DataType.Float,
    params: Array(paramCount).fill(t) as DataTypeValue[],
    stages,
  }));
}

// genIType(n params) -> same genIType return
function genI(paramCount: number, stages: ShaderStageValue[] | null = null): Overload[] {
  return GEN_I_TYPES.map(t => ({
    returnType: t,
    params: Array(paramCount).fill(t) as DataTypeValue[],
    stages,
  }));
}

// genUType(n params) -> same genUType return
function genU(paramCount: number, stages: ShaderStageValue[] | null = null): Overload[] {
  return GEN_U_TYPES.map(t => ({
    returnType: t,
    params: Array(paramCount).fill(t) as DataTypeValue[],
    stages,
  }));
}



// vecN, float -> vecN  (mixed scalar second/third arg)
function genFMixed2(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_F_TYPES.map(t => ({
    returnType: t,
    params: [t, DataType.Float],
    stages,
  }));
}

// vecN, vecN, float -> vecN  (mixed scalar third arg)
function genFMixed3(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_F_TYPES.map(t => ({
    returnType: t,
    params: [t, t, DataType.Float],
    stages,
  }));
}

// float, float, vecN -> vecN  (mixed scalar first two args -- for step/smoothstep edge)
function genFMixedEdge2(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_F_TYPES.map(t => ({
    returnType: t,
    params: [DataType.Float, t],
    stages,
  }));
}

function genFMixedEdge3(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_F_TYPES.map(t => ({
    returnType: t,
    params: [DataType.Float, DataType.Float, t],
    stages,
  }));
}



// genUType mixed: vecN, uint -> vecN
function genUMixed2(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_U_TYPES.map(t => ({
    returnType: t,
    params: [t, DataType.Uint],
    stages,
  }));
}

// genIType mixed: ivecN, int -> ivecN
function genIMixed2(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_I_TYPES.map(t => ({
    returnType: t,
    params: [t, DataType.Int],
    stages,
  }));
}

// genUType mixed clamp: uvecN, uint, uint -> uvecN
function genUMixed3(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_U_TYPES.map(t => ({
    returnType: t,
    params: [t, DataType.Uint, DataType.Uint],
    stages,
  }));
}

// genIType mixed clamp: ivecN, int, int -> ivecN
function genIMixed3(stages: ShaderStageValue[] | null = null): Overload[] {
  return VEC_I_TYPES.map(t => ({
    returnType: t,
    params: [t, DataType.Int, DataType.Int],
    stages,
  }));
}

function ov(returnType: DataTypeValue, params: DataTypeValue[], stages: ShaderStageValue[] | null = null): Overload {
  return { returnType, params, stages };
}

// ---------------------------------------------------------------------------
// Function registry builder
// ---------------------------------------------------------------------------

function buildFunctions(): Map<string, Overload[]> {
  const map = new Map<string, Overload[]>();

  function reg(name: string, overloads: Overload[]): void {
    if (map.has(name)) {
      map.get(name)!.push(...overloads);
    } else {
      map.set(name, [...overloads]);
    }
  }

  // 7.1 Trigonometric
  for (const name of ['sin', 'cos', 'tan', 'asin', 'acos', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'radians', 'degrees']) {
    reg(name, genF(1));
  }
  // atan: two variants
  reg('atan', genF(2)); // atan(y, x)
  reg('atan', genF(1)); // atan(y_over_x)

  // 7.2 Exponential
  for (const name of ['exp', 'exp2', 'log', 'log2', 'sqrt', 'inversesqrt']) {
    reg(name, genF(1));
  }
  reg('pow', genF(2));

  // 7.3 Common Math
  reg('abs',   [...genF(1), ...genI(1)]);
  reg('sign',  [...genF(1), ...genI(1)]);

  for (const name of ['floor', 'ceil', 'fract', 'trunc', 'round', 'roundEven']) {
    reg(name, genF(1));
  }

  reg('mod', [...genF(2), ...genFMixed2()]);

  reg('min', [...genF(2), ...genFMixed2(), ...genI(2), ...genIMixed2(), ...genU(2), ...genUMixed2()]);
  reg('max', [...genF(2), ...genFMixed2(), ...genI(2), ...genIMixed2(), ...genU(2), ...genUMixed2()]);

  // clamp: genFType(3) + mixed + genIType(3) + mixed + genUType(3) + mixed
  reg('clamp', [
    ...genF(3),
    ...genFMixed3(),
    ...genI(3),
    ...genIMixed3(),
    ...genU(3),
    ...genUMixed3(),
  ]);

  // mix: genFType(3) + mixed scalar t + genBType select
  reg('mix', [
    ...genF(3),
    ...genFMixed3(),
    // mix(vecN, vecN, bvecN) select variant
    ...VEC_F_TYPES.map((t, i) => ov(t, [t, t, VEC_B_TYPES[i]])),
  ]);

  // step: genFType(2) + mixed scalar edge
  reg('step', [...genF(2), ...genFMixedEdge2()]);

  // smoothstep: genFType(3) + mixed scalar edges
  reg('smoothstep', [...genF(3), ...genFMixedEdge3()]);

  reg('fma', genF(3));

  // isnan / isinf
  reg('isnan', [
    ov(DataType.Bool, [DataType.Float]),
    ...VEC_F_TYPES.map((t, i) => ov(VEC_B_TYPES[i], [t])),
  ]);
  reg('isinf', [
    ov(DataType.Bool, [DataType.Float]),
    ...VEC_F_TYPES.map((t, i) => ov(VEC_B_TYPES[i], [t])),
  ]);

  // 7.4 Geometric
  reg('length',     genFToScalar(1));
  reg('distance',   genFToScalar(2));
  reg('dot',        genFToScalar(2));
  reg('cross',      [ov(DataType.Vec3, [DataType.Vec3, DataType.Vec3])]);
  reg('normalize',  genF(1));
  reg('reflect',    genF(2));
  // refract(I, N, eta): last param is always float
  reg('refract', GEN_F_TYPES.map(t => ov(t, [t, t, DataType.Float])));
  reg('faceforward', genF(3));

  // 7.5 Matrix
  for (const [mat, vec] of [[DataType.Mat2, DataType.Vec2], [DataType.Mat3, DataType.Vec3], [DataType.Mat4, DataType.Vec4]] as [DataTypeValue, DataTypeValue][]) {
    reg('matrixCompMult', [ov(mat, [mat, mat])]);
    reg('transpose',      [ov(mat, [mat])]);
    reg('determinant',    [ov(DataType.Float, [mat])]);
    reg('inverse',        [ov(mat, [mat])]);
    // outerProduct: outerProduct(vecN, vecM) -> matNxM; register square cases for simplicity
    reg('outerProduct',   [ov(mat, [vec, vec])]);
  }

  // 7.6 Vector Comparison
  // vecN -> bvecN for float/int/uint comparisons
  const cmpFTypes: DataTypeValue[] = [...VEC_F_TYPES, ...VEC_I_TYPES, ...VEC_U_TYPES];
  const cmpBTypes: DataTypeValue[] = [...VEC_B_TYPES, ...VEC_B_TYPES, ...VEC_B_TYPES];
  for (const name of ['lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual', 'equal', 'notEqual']) {
    reg(name, cmpFTypes.map((t, i) => ov(cmpBTypes[i], [t, t])));
  }
  reg('any', VEC_B_TYPES.map(t => ov(DataType.Bool, [t])));
  reg('all', VEC_B_TYPES.map(t => ov(DataType.Bool, [t])));
  reg('not', VEC_B_TYPES.map(t => ov(t, [t])));

  // 7.7 Float Bit Reinterpret
  reg('floatBitsToInt',  [
    ov(DataType.Int,   [DataType.Float]),
    ov(DataType.Ivec2, [DataType.Vec2]),
    ov(DataType.Ivec3, [DataType.Vec3]),
    ov(DataType.Ivec4, [DataType.Vec4]),
  ]);
  reg('floatBitsToUint', [
    ov(DataType.Uint,  [DataType.Float]),
    ov(DataType.Uvec2, [DataType.Vec2]),
    ov(DataType.Uvec3, [DataType.Vec3]),
    ov(DataType.Uvec4, [DataType.Vec4]),
  ]);
  reg('intBitsToFloat', [
    ov(DataType.Float, [DataType.Int]),
    ov(DataType.Vec2,  [DataType.Ivec2]),
    ov(DataType.Vec3,  [DataType.Ivec3]),
    ov(DataType.Vec4,  [DataType.Ivec4]),
  ]);
  reg('uintBitsToFloat', [
    ov(DataType.Float, [DataType.Uint]),
    ov(DataType.Vec2,  [DataType.Uvec2]),
    ov(DataType.Vec3,  [DataType.Uvec3]),
    ov(DataType.Vec4,  [DataType.Uvec4]),
  ]);

  // 7.8 Packing
  reg('packHalf2x16',    [ov(DataType.Uint,  [DataType.Vec2])]);
  reg('unpackHalf2x16',  [ov(DataType.Vec2,  [DataType.Uint])]);
  reg('packSnorm2x16',   [ov(DataType.Uint,  [DataType.Vec2])]);
  reg('unpackSnorm2x16', [ov(DataType.Vec2,  [DataType.Uint])]);
  reg('packUnorm2x16',   [ov(DataType.Uint,  [DataType.Vec2])]);
  reg('unpackUnorm2x16', [ov(DataType.Vec2,  [DataType.Uint])]);
  reg('packSnorm4x8',    [ov(DataType.Uint,  [DataType.Vec4])]);
  reg('unpackSnorm4x8',  [ov(DataType.Vec4,  [DataType.Uint])]);
  reg('packUnorm4x8',    [ov(DataType.Uint,  [DataType.Vec4])]);
  reg('unpackUnorm4x8',  [ov(DataType.Vec4,  [DataType.Uint])]);

  // 7.9 Bit Operations (genIType and genUType)
  // bitCount/findLSB/findMSB return genIType (matching component count).
  // For signed inputs: int->int, ivec2->ivec2, ivec3->ivec3, ivec4->ivec4.
  // For unsigned inputs: uint->int, uvec2->ivec2, uvec3->ivec3, uvec4->ivec4.
  for (const name of ['bitCount', 'findLSB', 'findMSB']) {
    reg(name, [
      ...GEN_I_TYPES.map((t, i) => ov(GEN_I_TYPES[i], [t])),
      ...GEN_U_TYPES.map((t, i) => ov(GEN_I_TYPES[i], [t])),
    ]);
  }
  reg('bitfieldReverse', [
    ...GEN_I_TYPES.map(t => ov(t, [t])),
    ...GEN_U_TYPES.map(t => ov(t, [t])),
  ]);
  // bitfieldExtract(value, offset, bits)
  reg('bitfieldExtract', [
    ...GEN_I_TYPES.map(t => ov(t, [t, DataType.Int, DataType.Int])),
    ...GEN_U_TYPES.map(t => ov(t, [t, DataType.Int, DataType.Int])),
  ]);
  // bitfieldInsert(base, insert, offset, bits)
  reg('bitfieldInsert', [
    ...GEN_I_TYPES.map(t => ov(t, [t, t, DataType.Int, DataType.Int])),
    ...GEN_U_TYPES.map(t => ov(t, [t, t, DataType.Int, DataType.Int])),
  ]);

  // 7.12 Derivatives (Fragment only)
  const fragOnly: ShaderStageValue[] = [ShaderStage.Fragment];
  for (const name of ['dFdx', 'dFdy', 'fwidth', 'dFdxCoarse', 'dFdyCoarse', 'dFdxFine', 'dFdyFine', 'fwidthCoarse', 'fwidthFine']) {
    reg(name, genF(1, fragOnly));
  }

  // 7.13 Texture Sampling
  reg('texture', [
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Vec2]),
    ov(DataType.Vec4, [DataType.Isampler2D, DataType.Vec2]),
    ov(DataType.Vec4, [DataType.Usampler2D, DataType.Vec2]),
    ov(DataType.Vec4, [DataType.Sampler2DArray, DataType.Vec3]),
    ov(DataType.Vec4, [DataType.Sampler3D, DataType.Vec3]),
    ov(DataType.Vec4, [DataType.SamplerCube, DataType.Vec3]),
  ]);
  reg('textureLod', [
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec4, [DataType.Isampler2D, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec4, [DataType.Usampler2D, DataType.Vec2, DataType.Float]),
    ov(DataType.Vec4, [DataType.Sampler2DArray, DataType.Vec3, DataType.Float]),
    ov(DataType.Vec4, [DataType.Sampler3D, DataType.Vec3, DataType.Float]),
  ]);
  reg('texelFetch', [
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Ivec2, DataType.Int]),
    ov(DataType.Vec4, [DataType.Isampler2D, DataType.Ivec2, DataType.Int]),
    ov(DataType.Vec4, [DataType.Usampler2D, DataType.Ivec2, DataType.Int]),
  ]);
  reg('textureSize', [
    ov(DataType.Ivec2, [DataType.Sampler2D, DataType.Int]),
    ov(DataType.Ivec2, [DataType.Isampler2D, DataType.Int]),
    ov(DataType.Ivec2, [DataType.Usampler2D, DataType.Int]),
    ov(DataType.Ivec3, [DataType.Sampler2DArray, DataType.Int]),
    ov(DataType.Ivec3, [DataType.Sampler3D, DataType.Int]),
  ]);
  reg('textureGrad', [
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Vec2, DataType.Vec2, DataType.Vec2]),
    ov(DataType.Vec4, [DataType.Sampler3D, DataType.Vec3, DataType.Vec3, DataType.Vec3]),
  ]);
  reg('textureProj', [
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Vec3]),
    ov(DataType.Vec4, [DataType.Sampler2D, DataType.Vec4]),
  ]);

  // 7.14 Canvas SDF (Fragment + Light stages)
  const fragLight: ShaderStageValue[] = [ShaderStage.Fragment, ShaderStage.Light];
  reg('texture_sdf',        [ov(DataType.Float, [DataType.Vec2], fragLight)]);
  reg('sdf_to_screen_uv',   [ov(DataType.Vec2,  [DataType.Vec2], fragLight)]);
  reg('texture_sdf_normal', [ov(DataType.Vec2,  [DataType.Vec2], fragLight)]);
  reg('screen_uv_to_sdf',   [ov(DataType.Vec2,  [DataType.Vec2], fragLight)]);

  // 7.15 Custom builtins
  reg('saturate', genF(1));
  // inverse_lerp(a, b, value): mixed overload is (float, float, vecN) -> vecN
  reg('inverse_lerp', [
    ...genF(3),
    ...genFMixedEdge3(),
  ]);
  // remap(value, in_min, in_max, out_min, out_max) -> same type; scalar and mixed variants
  reg('remap', [
    ...GEN_F_TYPES.map(t => ov(t, [t, t, t, t, t])),
    // mixed scalar bounds
    ...VEC_F_TYPES.map(t => ov(t, [t, DataType.Float, DataType.Float, DataType.Float, DataType.Float])),
  ]);

  reg('seed_set',  [ov(DataType.Void, [DataType.Int])]);
  reg('seed_get',  [ov(DataType.Int,  [])]);
  reg('seed_push', [ov(DataType.Void, [])]);
  reg('seed_pop',  [ov(DataType.Void, [])]);

  return map;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _builtinFunctions: Map<string, Overload[]> | null = null;

export function getBuiltinFunctions(): Map<string, Overload[]> {
  if (_builtinFunctions === null) {
    _builtinFunctions = buildFunctions();
  }
  return _builtinFunctions;
}
