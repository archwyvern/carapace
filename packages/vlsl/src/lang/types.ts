import { TokenKind, type TokenKindValue } from './tokens.js';

export const DataType = Object.freeze({
  Void: 'void',
  Bool: 'bool',
  Int: 'int',
  Uint: 'uint',
  Float: 'float',
  Bvec2: 'bvec2',
  Bvec3: 'bvec3',
  Bvec4: 'bvec4',
  Ivec2: 'ivec2',
  Ivec3: 'ivec3',
  Ivec4: 'ivec4',
  Uvec2: 'uvec2',
  Uvec3: 'uvec3',
  Uvec4: 'uvec4',
  Vec2: 'vec2',
  Vec3: 'vec3',
  Vec4: 'vec4',
  Mat2: 'mat2',
  Mat3: 'mat3',
  Mat4: 'mat4',
  Mat2x3: 'mat2x3',
  Mat2x4: 'mat2x4',
  Mat3x2: 'mat3x2',
  Mat3x4: 'mat3x4',
  Mat4x2: 'mat4x2',
  Mat4x3: 'mat4x3',
  Sampler2D: 'sampler2D',
  Isampler2D: 'isampler2D',
  Usampler2D: 'usampler2D',
  Sampler2DArray: 'sampler2DArray',
  Isampler2DArray: 'isampler2DArray',
  Usampler2DArray: 'usampler2DArray',
  Sampler3D: 'sampler3D',
  Isampler3D: 'isampler3D',
  Usampler3D: 'usampler3D',
  SamplerCube: 'samplerCube',
  SamplerCubeArray: 'samplerCubeArray',
  SamplerExternalOES: 'samplerExternalOES',
  Struct: 'struct',
} as const);

export type DataTypeValue = typeof DataType[keyof typeof DataType];

export interface TypeInfoOptions {
  arraySize?: number;
  structName?: string | null;
  isConst?: boolean;
}

export class TypeInfo {
  type: DataTypeValue;
  arraySize: number;
  structName: string | null;
  isConst: boolean;

  constructor(type: DataTypeValue, { arraySize = 0, structName = null, isConst = false }: TypeInfoOptions = {}) {
    this.type = type;
    this.arraySize = arraySize;
    this.structName = structName;
    this.isConst = isConst;
  }
}

const TOKEN_KIND_TO_DATA_TYPE = new Map<TokenKindValue, DataTypeValue>([
  [TokenKind.Void, DataType.Void],
  [TokenKind.Bool, DataType.Bool],
  [TokenKind.Int, DataType.Int],
  [TokenKind.Uint, DataType.Uint],
  [TokenKind.Float, DataType.Float],
  [TokenKind.Bvec2, DataType.Bvec2],
  [TokenKind.Bvec3, DataType.Bvec3],
  [TokenKind.Bvec4, DataType.Bvec4],
  [TokenKind.Ivec2, DataType.Ivec2],
  [TokenKind.Ivec3, DataType.Ivec3],
  [TokenKind.Ivec4, DataType.Ivec4],
  [TokenKind.Uvec2, DataType.Uvec2],
  [TokenKind.Uvec3, DataType.Uvec3],
  [TokenKind.Uvec4, DataType.Uvec4],
  [TokenKind.Vec2, DataType.Vec2],
  [TokenKind.Vec3, DataType.Vec3],
  [TokenKind.Vec4, DataType.Vec4],
  [TokenKind.Mat2, DataType.Mat2],
  [TokenKind.Mat3, DataType.Mat3],
  [TokenKind.Mat4, DataType.Mat4],
  [TokenKind.Mat2x3, DataType.Mat2x3],
  [TokenKind.Mat2x4, DataType.Mat2x4],
  [TokenKind.Mat3x2, DataType.Mat3x2],
  [TokenKind.Mat3x4, DataType.Mat3x4],
  [TokenKind.Mat4x2, DataType.Mat4x2],
  [TokenKind.Mat4x3, DataType.Mat4x3],
  [TokenKind.Sampler2D, DataType.Sampler2D],
  [TokenKind.Isampler2D, DataType.Isampler2D],
  [TokenKind.Usampler2D, DataType.Usampler2D],
  [TokenKind.Sampler2DArray, DataType.Sampler2DArray],
  [TokenKind.Isampler2DArray, DataType.Isampler2DArray],
  [TokenKind.Usampler2DArray, DataType.Usampler2DArray],
  [TokenKind.Sampler3D, DataType.Sampler3D],
  [TokenKind.Isampler3D, DataType.Isampler3D],
  [TokenKind.Usampler3D, DataType.Usampler3D],
  [TokenKind.SamplerCube, DataType.SamplerCube],
  [TokenKind.SamplerCubeArray, DataType.SamplerCubeArray],
  [TokenKind.SamplerExternalOES, DataType.SamplerExternalOES],
]);

export function typeFromTokenKind(tokenKind: TokenKindValue): DataTypeValue | null {
  return TOKEN_KIND_TO_DATA_TYPE.get(tokenKind) ?? null;
}

const SCALAR_TYPES = new Set<DataTypeValue>([
  DataType.Bool,
  DataType.Int,
  DataType.Uint,
  DataType.Float,
]);

const VECTOR_TYPES = new Set<DataTypeValue>([
  DataType.Bvec2, DataType.Bvec3, DataType.Bvec4,
  DataType.Ivec2, DataType.Ivec3, DataType.Ivec4,
  DataType.Uvec2, DataType.Uvec3, DataType.Uvec4,
  DataType.Vec2, DataType.Vec3, DataType.Vec4,
]);

const MATRIX_TYPES = new Set<DataTypeValue>([
  DataType.Mat2, DataType.Mat3, DataType.Mat4,
  DataType.Mat2x3, DataType.Mat2x4,
  DataType.Mat3x2, DataType.Mat3x4,
  DataType.Mat4x2, DataType.Mat4x3,
]);

const SAMPLER_TYPES = new Set<DataTypeValue>([
  DataType.Sampler2D, DataType.Isampler2D, DataType.Usampler2D,
  DataType.Sampler2DArray, DataType.Isampler2DArray, DataType.Usampler2DArray,
  DataType.Sampler3D, DataType.Isampler3D, DataType.Usampler3D,
  DataType.SamplerCube, DataType.SamplerCubeArray, DataType.SamplerExternalOES,
]);

export function isScalar(dt: DataTypeValue): boolean {
  return SCALAR_TYPES.has(dt);
}

export function isVector(dt: DataTypeValue): boolean {
  return VECTOR_TYPES.has(dt);
}

export function isMatrix(dt: DataTypeValue): boolean {
  return MATRIX_TYPES.has(dt);
}

export function isSampler(dt: DataTypeValue): boolean {
  return SAMPLER_TYPES.has(dt);
}

const SCALAR_COMPONENT_OF = new Map<DataTypeValue, DataTypeValue>([
  [DataType.Vec2, DataType.Float],
  [DataType.Vec3, DataType.Float],
  [DataType.Vec4, DataType.Float],
  [DataType.Ivec2, DataType.Int],
  [DataType.Ivec3, DataType.Int],
  [DataType.Ivec4, DataType.Int],
  [DataType.Uvec2, DataType.Uint],
  [DataType.Uvec3, DataType.Uint],
  [DataType.Uvec4, DataType.Uint],
  [DataType.Bvec2, DataType.Bool],
  [DataType.Bvec3, DataType.Bool],
  [DataType.Bvec4, DataType.Bool],
  [DataType.Mat2, DataType.Float],
  [DataType.Mat3, DataType.Float],
  [DataType.Mat4, DataType.Float],
  [DataType.Mat2x3, DataType.Float],
  [DataType.Mat2x4, DataType.Float],
  [DataType.Mat3x2, DataType.Float],
  [DataType.Mat3x4, DataType.Float],
  [DataType.Mat4x2, DataType.Float],
  [DataType.Mat4x3, DataType.Float],
]);

export function scalarComponentOf(dt: DataTypeValue): DataTypeValue {
  return SCALAR_COMPONENT_OF.get(dt) ?? dt;
}

const VECTOR_COMPONENT_COUNT = new Map<DataTypeValue, number>([
  [DataType.Bvec2, 2], [DataType.Ivec2, 2], [DataType.Uvec2, 2], [DataType.Vec2, 2],
  [DataType.Bvec3, 3], [DataType.Ivec3, 3], [DataType.Uvec3, 3], [DataType.Vec3, 3],
  [DataType.Bvec4, 4], [DataType.Ivec4, 4], [DataType.Uvec4, 4], [DataType.Vec4, 4],
  [DataType.Bool, 1],
  [DataType.Int, 1],
  [DataType.Uint, 1],
  [DataType.Float, 1],
]);

export function vectorComponentCount(dt: DataTypeValue): number | null {
  return VECTOR_COMPONENT_COUNT.get(dt) ?? null;
}

export interface MatrixDims {
  cols: number;
  rows: number;
}

const MATRIX_DIMENSIONS = new Map<DataTypeValue, MatrixDims>([
  [DataType.Mat2, { cols: 2, rows: 2 }],
  [DataType.Mat3, { cols: 3, rows: 3 }],
  [DataType.Mat4, { cols: 4, rows: 4 }],
  [DataType.Mat2x3, { cols: 2, rows: 3 }],
  [DataType.Mat2x4, { cols: 2, rows: 4 }],
  [DataType.Mat3x2, { cols: 3, rows: 2 }],
  [DataType.Mat3x4, { cols: 3, rows: 4 }],
  [DataType.Mat4x2, { cols: 4, rows: 2 }],
  [DataType.Mat4x3, { cols: 4, rows: 3 }],
]);

export function matrixDimensions(dt: DataTypeValue): MatrixDims | null {
  return MATRIX_DIMENSIONS.get(dt) ?? null;
}
