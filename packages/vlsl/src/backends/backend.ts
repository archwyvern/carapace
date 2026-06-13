import type * as Ast from '../lang/ast.js';
import type { UniformHint } from '../lang/ast.js';
import type { DataTypeValue } from '../lang/types.js';
import type { Diagnostic } from '../lang/diagnostic.js';

// The backend contract. A backend turns a type-checked AST into a CodeGenResult.
// The lang/ frontend stays backend-agnostic; everything dialect-specific lives behind
// this interface. compile() in index.ts targets this contract, not any concrete backend.

export interface BackendOptions {
  startTextureBinding?: number;
  startBufferBinding?: number;
  libraries?: Set<string>;
}

export interface UniformInfo {
  name: string;
  type: DataTypeValue;
  // TODO: `wgslType` is a WGSL-ism leaking into the shared output contract. Generalize to a
  // neutral `targetType` (emitted dialect type string) when the WebGL backend is built out —
  // that is the point at which a second backend actually needs to populate it.
  wgslType: string;
  hints: UniformHint[];
  defaultValue: Ast.Expr | null;
}

export interface TextureInfo {
  name: string;
  type: DataTypeValue;
  texBinding: number;
  samplerBinding: number;
}

export interface BufferInfo {
  name: string;
  qualifiers: string[];
}

export interface SpecConstantInfo {
  name: string;
  type: DataTypeValue;
  wgslType: string; // TODO: generalize alongside UniformInfo.wgslType
}

export interface RenderModes {
  blendMode: string;
  unshaded: boolean;
  lightOnly: boolean;
  skipVertexTransform: boolean;
  worldVertexCoords: boolean;
}

export interface VaryingInfo {
  name: string;
  glslType: string;
  flat: boolean;
}

export interface CodeGenResult {
  codeSections: Map<string, string>;
  varyings?: VaryingInfo[];
  userFunctions: string;
  constDeclarations: string;
  uniformBlockMembers: string;
  samplerDeclarations: string;
  bufferDeclarations: string;
  specConstDeclarations: string;
  uniforms: UniformInfo[];
  textures: TextureInfo[];
  buffers: BufferInfo[];
  specConstants: SpecConstantInfo[];
  renderModes: RenderModes;
  rawRenderModes: string[];
  diagnostics: Diagnostic[];
}

export interface ShaderBackend {
  generate(): CodeGenResult;
}

export type ShaderBackendFactory = (ast: Ast.ShaderAst, options: BackendOptions) => ShaderBackend;
