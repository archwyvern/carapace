import { Preprocessor } from './lang/preprocessor.js';
import { Lexer } from './lang/lexer.js';
import { Parser } from './lang/parser.js';
import { TypeChecker } from './lang/type-checker.js';
import { wgslBackend } from './backends/wgsl/index.js';
import type { ShaderBackendFactory, RenderModes, VaryingInfo } from './backends/backend.js';
import type { DataTypeValue } from './lang/types.js';
import type { Diagnostic } from './lang/diagnostic.js';
import type { UniformHint, StructMember } from './lang/ast.js';

// Public re-exports of the backend contract.
export { wgslBackend, WgslCodeGen } from './backends/wgsl/index.js';
export { webglBackend, Glsl300EsCodeGen, getGlslLibrarySource, assembleFragmentShader } from './backends/webgl/index.js';
export type {
  ShaderBackend,
  ShaderBackendFactory,
  BackendOptions,
  CodeGenResult,
  RenderModes,
  VaryingInfo,
  UniformInfo,
  TextureInfo,
  BufferInfo,
  SpecConstantInfo,
} from './backends/backend.js';

export class CompilationResult {
  codeSections: Map<string, string>;
  userFunctions: string;
  constDeclarations: string;
  uniformBlockMembers: string;
  samplerDeclarations: string;
  bufferDeclarations: string;
  specConstDeclarations: string;
  uniforms: unknown[];
  textures: unknown[];
  buffers: unknown[];
  specConstants: unknown[];
  renderModes: RenderModes;
  rawRenderModes: string[];
  libraries: Set<string>;
  varyings: VaryingInfo[];
  diagnostics: Diagnostic[];

  constructor() {
    this.codeSections = new Map();
    this.userFunctions = '';
    this.constDeclarations = '';
    this.uniformBlockMembers = '';
    this.samplerDeclarations = '';
    this.bufferDeclarations = '';
    this.specConstDeclarations = '';
    this.uniforms = [];
    this.textures = [];
    this.buffers = [];
    this.specConstants = [];
    this.renderModes = {
      blendMode: 'mix',
      unshaded: false,
      lightOnly: false,
      skipVertexTransform: false,
      worldVertexCoords: false,
    };
    this.rawRenderModes = [];
    this.libraries = new Set();
    this.varyings = [];
    this.diagnostics = [];
  }

  get success(): boolean {
    return !this.diagnostics.some(d => d.severity === 'error');
  }
}

export class UniformMetadata {
  name: string;
  type: DataTypeValue;
  hints: UniformHint[];
  defaultValue: unknown;
  group: string | null;
  subgroup: string | null;
  scope: string | null;

  constructor(name: string, type: DataTypeValue, hints: UniformHint[], defaultValue: unknown, group: string | null, subgroup: string | null, scope: string | null) {
    this.name = name;
    this.type = type;
    this.hints = hints;
    this.defaultValue = defaultValue;
    this.group = group;
    this.subgroup = subgroup;
    this.scope = scope;
  }
}

export class TextureMetadata {
  name: string;
  type: DataTypeValue;
  hints: UniformHint[];
  binding: number;

  constructor(name: string, type: DataTypeValue, hints: UniformHint[], binding: number) {
    this.name = name;
    this.type = type;
    this.hints = hints;
    this.binding = binding;
  }
}

export class BufferMetadata {
  name: string;
  qualifiers: string[];
  members: StructMember[];
  binding: number;

  constructor(name: string, qualifiers: string[], members: StructMember[], binding: number) {
    this.name = name;
    this.qualifiers = qualifiers;
    this.members = members;
    this.binding = binding;
  }
}

export class SpecConstMetadata {
  name: string;
  type: DataTypeValue;
  hints: UniformHint[];
  defaultValue: unknown;

  constructor(name: string, type: DataTypeValue, hints: UniformHint[], defaultValue: unknown) {
    this.name = name;
    this.type = type;
    this.hints = hints;
    this.defaultValue = defaultValue;
  }
}

export interface CompileOptions {
  filename?: string;
  macros?: Record<string, string>;
  includeLoader?: ((path: string) => string | null) | null;
  startTextureBinding?: number;
  startBufferBinding?: number;
  isInclude?: boolean;
  backend?: ShaderBackendFactory;
}

export interface PreprocessResult {
  output: string;
  sourceMap: number[];
  libraries: Set<string>;
  diagnostics: Diagnostic[];
}

export function preprocess(source: string, {
  filename = 'shader',
  macros = {},
  includeLoader = null,
}: Pick<CompileOptions, 'filename' | 'macros' | 'includeLoader'> = {}): PreprocessResult {
  const pp = new Preprocessor(source, { macros, filename, includeLoader });
  return pp.process();
}

export interface CompilePreprocessedOptions {
  filename?: string;
  sourceMap?: number[];
  libraries?: Set<string>;
  startTextureBinding?: number;
  startBufferBinding?: number;
  isInclude?: boolean;
  backend?: ShaderBackendFactory;
}

export function compilePreprocessed(preprocessedSource: string, {
  filename = 'shader',
  sourceMap,
  libraries = new Set(),
  startTextureBinding = 0,
  startBufferBinding = 0,
  isInclude = false,
  backend = wgslBackend,
}: CompilePreprocessedOptions = {}): CompilationResult {
  const result = new CompilationResult();
  result.libraries = libraries;

  // Phase 1: Lex
  const lexer = new Lexer(preprocessedSource);
  const lexResult = lexer.tokenize();
  for (const d of lexResult.diagnostics) {
    if (sourceMap && sourceMap[d.line - 1] !== undefined) {
      d.line = sourceMap[d.line - 1];
    }
    d.filename = filename;
  }
  result.diagnostics.push(...lexResult.diagnostics);
  if (!result.success) return result;

  // Phase 2: Parse
  const parser = new Parser(lexResult.tokens);
  const parseResult = parser.parse({ isInclude });
  result.diagnostics.push(...parseResult.diagnostics);
  if (!result.success) return result;

  // Phase 3: Type check
  const checker = new TypeChecker(parseResult.ast, libraries);
  const checkResult = checker.check();
  result.diagnostics.push(...checkResult.diagnostics);
  if (!result.success) return result;

  if (isInclude) return result;

  // Phase 4: Code generation (selected backend)
  const gen = backend(parseResult.ast, {
    startTextureBinding,
    startBufferBinding,
    libraries,
  });
  const genResult = gen.generate();

  result.codeSections = genResult.codeSections;
  result.userFunctions = genResult.userFunctions;
  result.constDeclarations = genResult.constDeclarations;
  result.uniformBlockMembers = genResult.uniformBlockMembers;
  result.samplerDeclarations = genResult.samplerDeclarations;
  result.bufferDeclarations = genResult.bufferDeclarations;
  result.specConstDeclarations = genResult.specConstDeclarations;
  result.uniforms = genResult.uniforms;
  result.textures = genResult.textures;
  result.buffers = genResult.buffers;
  result.specConstants = genResult.specConstants;
  result.renderModes = genResult.renderModes;
  result.rawRenderModes = genResult.rawRenderModes;
  result.varyings = genResult.varyings ?? [];
  result.diagnostics.push(...(genResult.diagnostics || []));

  return result;
}

export function compile(source: string, {
  filename = 'shader',
  macros = {},
  includeLoader = null,
  startTextureBinding = 0,
  startBufferBinding = 0,
  isInclude = false,
  backend = wgslBackend,
}: CompileOptions = {}): CompilationResult {
  const result = new CompilationResult();

  // Phase 1: Preprocess
  const pp = new Preprocessor(source, { macros, filename, includeLoader });
  const ppResult = pp.process();
  result.diagnostics.push(...ppResult.diagnostics);
  result.libraries = ppResult.libraries;
  if (!result.success) return result;

  // Phase 2: Lex
  const lexer = new Lexer(ppResult.output);
  const lexResult = lexer.tokenize();
  for (const d of lexResult.diagnostics) {
    if (ppResult.sourceMap[d.line - 1] !== undefined) {
      d.line = ppResult.sourceMap[d.line - 1];
    }
    d.filename = filename;
  }
  result.diagnostics.push(...lexResult.diagnostics);
  if (!result.success) return result;

  // Phase 3: Parse
  const parser = new Parser(lexResult.tokens);
  const parseResult = parser.parse({ isInclude });
  result.diagnostics.push(...parseResult.diagnostics);
  if (!result.success) return result;

  // Phase 4: Type check
  const checker = new TypeChecker(parseResult.ast, ppResult.libraries);
  const checkResult = checker.check();
  result.diagnostics.push(...checkResult.diagnostics);
  if (!result.success) return result;

  // Include files: skip codegen (no entry points to generate)
  if (isInclude) return result;

  // Phase 5: Code generation (selected backend)
  const gen = backend(parseResult.ast, {
    startTextureBinding,
    startBufferBinding,
    libraries: ppResult.libraries,
  });
  const genResult = gen.generate();

  result.codeSections = genResult.codeSections;
  result.userFunctions = genResult.userFunctions;
  result.constDeclarations = genResult.constDeclarations;
  result.uniformBlockMembers = genResult.uniformBlockMembers;
  result.samplerDeclarations = genResult.samplerDeclarations;
  result.bufferDeclarations = genResult.bufferDeclarations;
  result.specConstDeclarations = genResult.specConstDeclarations;
  result.uniforms = genResult.uniforms;
  result.textures = genResult.textures;
  result.buffers = genResult.buffers;
  result.specConstants = genResult.specConstants;
  result.renderModes = genResult.renderModes;
  result.rawRenderModes = genResult.rawRenderModes;
  result.varyings = genResult.varyings ?? [];
  result.diagnostics.push(...(genResult.diagnostics || []));

  return result;
}
