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
  // Declared `hint_screen_texture`: the renderer binds a copy of the framebuffer to this
  // slot (rather than a material texture) before drawing. The web backends have no shared
  // base-set screen sampler like the engine's GLSL, so the screen texture keeps a normal
  // per-shader binding and is flagged here instead.
  screenTexture?: boolean;
  // The screen texture's declared filter requests mipmaps (renderer generates them).
  screenTextureMipmaps?: boolean;
}

// Filter hints (snake_case source text, as stored on UniformDecl.hints) that imply mipmaps.
const MIPMAP_FILTER_HINTS = new Set<string>([
  'filter_nearest_mipmap',
  'filter_linear_mipmap',
  'filter_nearest_mipmap_anisotropic',
  'filter_linear_mipmap_anisotropic',
]);

export interface ScreenTextureInfo {
  isScreenTexture: boolean;
  mipmaps: boolean;
}

/**
 * Inspect a sampler uniform's hints for `hint_screen_texture` and whether its declared
 * filter uses mipmaps. Mirrors the C# GlslCodeGen screen-texture detection; the flags let
 * the renderer copy the framebuffer (and generate mipmaps) before drawing with the shader.
 */
export function screenTextureFromHints(hints: ReadonlyArray<{ kind: string }>): ScreenTextureInfo {
  let isScreenTexture = false;
  let mipmaps = false;
  for (const h of hints) {
    if (h.kind === 'hint_screen_texture') isScreenTexture = true;
    else if (MIPMAP_FILTER_HINTS.has(h.kind)) mipmaps = true;
  }
  return { isScreenTexture, mipmaps: isScreenTexture && mipmaps };
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
  // A `hint_screen_texture` sampler is present; the renderer must copy the framebuffer.
  usesScreenTexture: boolean;
  usesScreenTextureMipmaps: boolean;
  diagnostics: Diagnostic[];
}

export interface ShaderBackend {
  generate(): CodeGenResult;
}

export type ShaderBackendFactory = (ast: Ast.ShaderAst, options: BackendOptions) => ShaderBackend;
