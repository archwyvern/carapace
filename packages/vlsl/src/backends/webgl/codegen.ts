import { DataType, TypeInfo, isSampler, scalarComponentOf } from '../../lang/types.js';
import type { DataTypeValue } from '../../lang/types.js';
import { Diagnostic } from '../../lang/diagnostic.js';
import type { ShaderBackend, BackendOptions, CodeGenResult, UniformInfo, TextureInfo, BufferInfo, SpecConstantInfo, RenderModes } from '../backend.js';
import { getLibraryFunctionName } from '../library-names.js';
import * as Ast from '../../lang/ast.js';

// ---------------------------------------------------------------------------
// GLSL ES 3.00 backend for WebGL2 preview.
//
// The canonical shader language is GLSL-flavoured, so most builtins pass through
// unchanged. Differences vs the language source: canonical types map to GLSL
// types, uniforms are emitted as individual `uniform` declarations (referenced
// bare, matching the runtime's per-name binding), `UV`/`FRAGCOORD`/`TIME`/etc.
// map onto the canvas_item preview ABI, and the fragment entry becomes
// `void main()` writing `fragColor`. canvas_item only: `buffer` decls and
// `particles` shaders are rejected (WebGL2 has UBOs but no SSBO/compute).
//
// The emitted pieces (uniforms, samplers, consts, user functions, main) are
// assembled into a full `#version 300 es` shader by `assembleFragmentShader`
// in ./index.ts, which also injects the `#include`d library bodies.
// ---------------------------------------------------------------------------

// Type mapping: Hardcoded shader language -> GLSL ES 3.00
const TYPE_MAP = new Map<DataTypeValue, string>([
  [DataType.Float, 'float'],
  [DataType.Int, 'int'],
  [DataType.Uint, 'uint'],
  [DataType.Bool, 'bool'],
  [DataType.Vec2, 'vec2'],
  [DataType.Vec3, 'vec3'],
  [DataType.Vec4, 'vec4'],
  [DataType.Ivec2, 'ivec2'],
  [DataType.Ivec3, 'ivec3'],
  [DataType.Ivec4, 'ivec4'],
  [DataType.Uvec2, 'uvec2'],
  [DataType.Uvec3, 'uvec3'],
  [DataType.Uvec4, 'uvec4'],
  [DataType.Bvec2, 'bvec2'],
  [DataType.Bvec3, 'bvec3'],
  [DataType.Bvec4, 'bvec4'],
  [DataType.Mat2, 'mat2'],
  [DataType.Mat3, 'mat3'],
  [DataType.Mat4, 'mat4'],
  [DataType.Mat2x3, 'mat2x3'],
  [DataType.Mat2x4, 'mat2x4'],
  [DataType.Mat3x2, 'mat3x2'],
  [DataType.Mat3x4, 'mat3x4'],
  [DataType.Mat4x2, 'mat4x2'],
  [DataType.Mat4x3, 'mat4x3'],
]);

// Sampler types -> GLSL ES 3.00 combined-sampler type (no separate sampler object).
const SAMPLER_TYPE_MAP = new Map<DataTypeValue, string>([
  [DataType.Sampler2D, 'sampler2D'],
  [DataType.Isampler2D, 'isampler2D'],
  [DataType.Usampler2D, 'usampler2D'],
  [DataType.Sampler2DArray, 'sampler2DArray'],
  [DataType.Isampler2DArray, 'isampler2DArray'],
  [DataType.Usampler2DArray, 'usampler2DArray'],
  [DataType.Sampler3D, 'sampler3D'],
  [DataType.Isampler3D, 'isampler3D'],
  [DataType.Usampler3D, 'usampler3D'],
  [DataType.SamplerCube, 'samplerCube'],
  [DataType.SamplerCubeArray, 'samplerCubeArray'],
  [DataType.SamplerExternalOES, 'samplerExternalOES'],
]);

// Built-in function remapping for GLSL ES 3.00. Most language builtins are already
// GLSL names and pass through; only a few WebGL2-unsupported variants are remapped.
// `saturate` is handled separately (helper, since GLSL has no saturate()).
const FUNCTION_REMAP = new Map<string, string>([
  ['dFdxCoarse', 'dFdx'],
  ['dFdyCoarse', 'dFdy'],
  ['dFdxFine', 'dFdx'],
  ['dFdyFine', 'dFdy'],
]);

// Entry point names that correspond to shader stages.
const ENTRY_POINT_NAMES = new Set<string>(['vertex', 'fragment', 'light', 'start', 'process']);

interface FragmentBuiltinInfo {
  type: DataTypeValue;
  init: string;
}

// Builtin variables that are read-write in the fragment stage and need
// local var initialisation in the entry point.
const FRAGMENT_BUILTINS = new Map<string, FragmentBuiltinInfo>([
  ['COLOR', { type: DataType.Vec4, init: 'vec4(0.0)' }],
  ['NORMAL', { type: DataType.Vec3, init: 'vec3(0.0, 0.0, 1.0)' }],
  ['NORMAL_MAP', { type: DataType.Vec3, init: 'vec3(0.5, 0.5, 1.0)' }],
  ['NORMAL_MAP_DEPTH', { type: DataType.Float, init: '1.0' }],
  ['EMISSION', { type: DataType.Vec3, init: 'vec3(0.0)' }],
  ['BLEND_FACTOR', { type: DataType.Vec4, init: 'vec4(0.0)' }],
]);

// Read-only fragment builtins -> GLSL expression. Names in BUILTIN_UNIFORMS are
// backed by a uniform the runtime supplies; UV/SCREEN_UV map to the v_uv varying
// from the preview vertex shader; FRAGCOORD is gl_FragCoord; constants inline.
const FRAGMENT_READONLY_BUILTINS = new Map<string, string>([
  ['FRAGCOORD', 'gl_FragCoord'],
  ['UV', 'v_uv'],
  ['SCREEN_UV', 'v_uv'],
  ['SCREEN_PIXEL_SIZE', 'SCREEN_PIXEL_SIZE'],
  ['TEXTURE_PIXEL_SIZE', 'TEXTURE_PIXEL_SIZE'],
  ['TIME', 'TIME'],
  ['AT_LIGHT_PASS', 'false'],
  ['PI', '3.14159265358979323846'],
  ['TAU', '6.28318530717958647692'],
  ['E', '2.71828182845904523536'],
  ['EPSILON', '0.00001'],
]);

// Vertex-stage read-only builtins (canvas_item vertex()). The writable per-vertex /
// per-instance builtins (VERTEX, UV, COLOR, INSTANCE_CUSTOM, INSTANCE_ID, *_MATRIX)
// pass through as bare locals the runtime vertex shader declares + initialises; only
// the global / uniform-backed ones need remapping here. UV is deliberately NOT mapped
// to v_uv in the vertex stage (there it is a writable local, not the fragment varying).
const VERTEX_READONLY_BUILTINS = new Map<string, string>([
  ['TIME', 'TIME'],
  ['TEXTURE_PIXEL_SIZE', 'TEXTURE_PIXEL_SIZE'],
  ['AT_LIGHT_PASS', 'false'],
  ['PI', '3.14159265358979323846'],
  ['TAU', '6.28318530717958647692'],
  ['E', '2.71828182845904523536'],
  ['EPSILON', '0.00001'],
]);

// Read-only builtins backed by a runtime-supplied uniform: name -> GLSL type.
const BUILTIN_UNIFORMS = new Map<string, string>([
  ['TIME', 'float'],
  ['SCREEN_PIXEL_SIZE', 'vec2'],
  ['TEXTURE_PIXEL_SIZE', 'vec2'],
]);

// Read-only fragment builtins: type information for lightweight type inference.
const FRAGMENT_READONLY_BUILTIN_TYPES = new Map<string, DataTypeValue>([
  ['FRAGCOORD', DataType.Vec4],
  ['UV', DataType.Vec2],
  ['SCREEN_UV', DataType.Vec2],
  ['SCREEN_PIXEL_SIZE', DataType.Vec2],
  ['TEXTURE_PIXEL_SIZE', DataType.Vec2],
  ['TIME', DataType.Float],
  ['AT_LIGHT_PASS', DataType.Bool],
  ['PI', DataType.Float],
  ['TAU', DataType.Float],
  ['E', DataType.Float],
  ['EPSILON', DataType.Float],
  ['POINT_COORD', DataType.Vec2],
  ['REGION_RECT', DataType.Vec4],
  ['SPECULAR_SHININESS', DataType.Vec4],
]);

// Scalar type -> [vec2, vec3, vec4] mapping for swizzle type inference.
const SCALAR_TO_VEC = new Map<DataTypeValue, [DataTypeValue, DataTypeValue, DataTypeValue]>([
  [DataType.Float, [DataType.Vec2, DataType.Vec3, DataType.Vec4]],
  [DataType.Int,   [DataType.Ivec2, DataType.Ivec3, DataType.Ivec4]],
  [DataType.Uint,  [DataType.Uvec2, DataType.Uvec3, DataType.Uvec4]],
  [DataType.Bool,  [DataType.Bvec2, DataType.Bvec3, DataType.Bvec4]],
]);

// Blend mode render modes.
const BLEND_MODES = new Set<string>([
  'blend_mix', 'blend_add', 'blend_sub', 'blend_mul',
  'blend_premul_alpha', 'blend_disabled', 'blend_dual_source',
]);

export class Glsl300EsCodeGen implements ShaderBackend {
  private ast: Ast.ShaderAst;
  private libraries: Set<string>;
  private diagnostics: Diagnostic[];
  private needsSaturateHelper: boolean;
  private uniformNames: Set<string>;
  private samplerNames: Set<string>;
  private usedBuiltinUniforms: Set<string>;
  private currentStage = '';
  // Flat map of local variable/parameter names -> DataType for type inference.
  private localTypes: Map<string, DataTypeValue>;

  constructor(ast: Ast.ShaderAst, _options: BackendOptions = {}) {
    this.ast = ast;
    this.libraries = _options.libraries ?? new Set();
    this.diagnostics = [];
    this.needsSaturateHelper = false;
    this.uniformNames = new Set();
    this.samplerNames = new Set();
    this.usedBuiltinUniforms = new Set();
    this.localTypes = new Map();
  }

  // -- Public API -----------------------------------------------------------

  generate(): CodeGenResult {
    // canvas_item only: WebGL2 has no SSBO/compute.
    if (this.ast.shaderType === 'particles') {
      this.diagnostics.push(Diagnostic.error(
        'the WebGL2 (GLSL ES 300) backend supports canvas_item only; `particles` is not supported', 1, 1));
    }
    if (this.ast.buffers.length > 0) {
      this.diagnostics.push(Diagnostic.error(
        'the WebGL2 (GLSL ES 300) backend does not support `buffer` declarations (no SSBO in WebGL2)', 1, 1));
    }

    // Classify uniforms into sampler vs non-sampler.
    const samplerUniforms: Ast.UniformDecl[] = [];
    const nonSamplerUniforms: Ast.UniformDecl[] = [];
    for (const u of this.ast.uniforms) {
      if (isSampler(u.type.type)) {
        samplerUniforms.push(u);
        this.samplerNames.add(u.name);
      } else {
        nonSamplerUniforms.push(u);
        this.uniformNames.add(u.name);
      }
    }

    const rawRenderModes = [...this.ast.renderModes];
    const renderModes = this.parseRenderModes(rawRenderModes);

    // Collect uniform metadata (declarations are assembled after body emission,
    // so that builtin-uniform usage discovered during emission is included).
    const uniforms: UniformInfo[] = [];
    for (const u of nonSamplerUniforms) {
      uniforms.push({
        name: u.name,
        type: u.type.type,
        wgslType: this.emitType(u.type),
        hints: u.hints ?? [],
        defaultValue: u.defaultValue ?? null,
      });
    }

    // Sampler declarations + metadata.
    const samplerLines: string[] = [];
    const textures: TextureInfo[] = [];
    let texBinding = 0;
    for (const u of samplerUniforms) {
      const glslType = SAMPLER_TYPE_MAP.get(u.type.type) ?? 'sampler2D';
      samplerLines.push(`uniform ${glslType} ${u.name};`);
      textures.push({ name: u.name, type: u.type.type, texBinding, samplerBinding: texBinding });
      texBinding++;
    }
    const samplerDeclarations = samplerLines.join('\n');

    // Const declarations.
    const constLines: string[] = [];
    for (const c of this.ast.constants) {
      const glslType = this.emitType(c.type);
      const init = c.initializer ? ` = ${this.emitExpr(c.initializer)}` : '';
      constLines.push(`const ${glslType} ${c.name}${init};`);
    }
    const constDeclarations = constLines.join('\n');

    // Spec constants: GLSL ES 300 has no specialization constants. Emit as
    // compile-time consts seeded with their defaults (best effort).
    const specConstLines: string[] = [];
    const specConstants: SpecConstantInfo[] = [];
    for (const sc of this.ast.specConstants) {
      const glslType = this.emitType(sc.type);
      const init = sc.defaultValue ? ` = ${this.emitExpr(sc.defaultValue)}` : '';
      specConstLines.push(`const ${glslType} ${sc.name}${init};`);
      specConstants.push({ name: sc.name, type: sc.type.type, wgslType: glslType });
    }
    const specConstDeclarations = specConstLines.join('\n');

    // Struct declarations.
    const structLines: string[] = [];
    for (const s of this.ast.structs) {
      const memberLines = s.members.map((m: Ast.StructMember) => `  ${this.emitType(m.type)} ${m.name};`);
      structLines.push(`struct ${s.name} {\n${memberLines.join('\n')}\n};`);
    }

    // Separate entry points from user functions.
    const userFuncs: Ast.FunctionDef[] = [];
    const entryPoints: Ast.FunctionDef[] = [];
    for (const fn of this.ast.functions) {
      if (ENTRY_POINT_NAMES.has(fn.name)) {
        entryPoints.push(fn);
      } else {
        userFuncs.push(fn);
      }
    }

    // Emit user functions (populates usedBuiltinUniforms / needsSaturateHelper).
    const userFunctionLines: string[] = [];
    for (const fn of userFuncs) {
      userFunctionLines.push(this.emitFunction(fn));
    }

    // Emit entry points into code sections.
    const codeSections = new Map<string, string>();
    for (const fn of entryPoints) {
      codeSections.set(fn.name, this.emitEntryPoint(fn));
      // Also expose the fragment body (no main) so the renderer can wrap it with a
      // light loop for lit materials; the unlit `fragment` main is left untouched.
      if (fn.name === 'fragment') codeSections.set('fragment_body', this.emitStageBody(fn));
    }

    // Assemble user functions: structs, then the saturate helper if needed, then functions.
    let userFunctions = userFunctionLines.join('\n\n');
    if (this.needsSaturateHelper) {
      const helper =
        'float saturate(float x) { return clamp(x, 0.0, 1.0); }\n' +
        'vec2 saturate(vec2 x) { return clamp(x, 0.0, 1.0); }\n' +
        'vec3 saturate(vec3 x) { return clamp(x, 0.0, 1.0); }\n' +
        'vec4 saturate(vec4 x) { return clamp(x, 0.0, 1.0); }';
      userFunctions = helper + (userFunctions ? '\n\n' + userFunctions : '');
    }
    if (structLines.length > 0) {
      userFunctions = structLines.join('\n\n') + (userFunctions ? '\n\n' + userFunctions : '');
    }

    // Assemble uniform declarations: builtin uniforms used + user uniforms.
    const uniformLines: string[] = [];
    for (const [name, glslType] of BUILTIN_UNIFORMS) {
      if (this.usedBuiltinUniforms.has(name)) {
        uniformLines.push(`uniform ${glslType} ${name};`);
      }
    }
    for (const u of nonSamplerUniforms) {
      uniformLines.push(`uniform ${this.emitType(u.type)} ${u.name};`);
    }
    const uniformBlockMembers = uniformLines.join('\n');

    // Varyings: user vertex->fragment channels, emitted as `out`/`in` by the
    // assemblers. Integer or explicitly-flat varyings need the `flat` qualifier.
    const varyings = this.ast.varyings.map((v) => {
      const glslType = this.emitType(v.type);
      return {
        name: v.name,
        glslType,
        flat: v.interpolation === 'flat' || /^(int|uint|ivec|uvec)/.test(glslType),
      };
    });

    return {
      codeSections,
      varyings,
      userFunctions,
      constDeclarations,
      uniformBlockMembers,
      samplerDeclarations,
      bufferDeclarations: '',
      specConstDeclarations,
      uniforms,
      textures,
      buffers: [] as BufferInfo[],
      specConstants,
      renderModes,
      rawRenderModes,
      diagnostics: this.diagnostics,
    };
  }

  // -- Render mode parsing --------------------------------------------------

  private parseRenderModes(modes: string[]): RenderModes {
    const result: RenderModes = {
      blendMode: 'mix',
      unshaded: false,
      lightOnly: false,
      skipVertexTransform: false,
      worldVertexCoords: false,
    };
    for (const mode of modes) {
      if (BLEND_MODES.has(mode)) {
        result.blendMode = mode.replace('blend_', '');
      } else if (mode === 'unshaded') {
        result.unshaded = true;
      } else if (mode === 'light_only') {
        result.lightOnly = true;
      } else if (mode === 'skip_vertex_transform') {
        result.skipVertexTransform = true;
      } else if (mode === 'world_vertex_coords') {
        result.worldVertexCoords = true;
      }
    }
    return result;
  }

  // -- Type emission --------------------------------------------------------

  private emitType(typeInfo: TypeInfo | null): string {
    if (!typeInfo) return 'float';
    const dt = typeInfo.type;
    if (dt === DataType.Struct) return typeInfo.structName ?? 'UNKNOWN_STRUCT';
    if (dt === DataType.Void) return 'void';
    if (isSampler(dt)) return SAMPLER_TYPE_MAP.get(dt) ?? 'sampler2D';
    return TYPE_MAP.get(dt) ?? String(dt);
  }

  // -- Expression emission --------------------------------------------------

  private emitExpr(expr: Ast.Expr | null): string {
    if (!expr) return '';
    if (expr instanceof Ast.LiteralExpr) return this.emitLiteral(expr);
    if (expr instanceof Ast.IdentifierExpr) return this.emitIdentifier(expr);
    if (expr instanceof Ast.BinaryExpr) return this.emitBinary(expr);
    if (expr instanceof Ast.UnaryExpr) return this.emitUnary(expr);
    if (expr instanceof Ast.PostfixExpr) return `${this.emitExpr(expr.operand)}${expr.op}`;
    if (expr instanceof Ast.TernaryExpr) return this.emitTernary(expr);
    if (expr instanceof Ast.AssignExpr) return this.emitAssign(expr);
    if (expr instanceof Ast.FunctionCallExpr) return this.emitFunctionCall(expr);
    if (expr instanceof Ast.TypeConstructExpr) return this.emitTypeConstruct(expr);
    if (expr instanceof Ast.MemberAccessExpr) return `${this.emitExpr(expr.object)}.${expr.member}`;
    if (expr instanceof Ast.SwizzleExpr) return `${this.emitExpr(expr.object)}.${expr.components}`;
    if (expr instanceof Ast.IndexExpr) return `${this.emitExpr(expr.object)}[${this.emitExpr(expr.index)}]`;
    if (expr instanceof Ast.MethodCallExpr) return this.emitMethodCall(expr);
    if (expr instanceof Ast.ArrayConstructExpr) return this.emitArrayConstruct(expr);
    if (expr instanceof Ast.BraceInitExpr) {
      const elems = expr.elements.map((e: Ast.Expr) => this.emitExpr(e)).join(', ');
      return `(${elems})`;
    }
    this.diagnostics.push(Diagnostic.error(
      `unsupported expression node: ${(expr as object).constructor.name}`,
      (expr as Ast.LiteralExpr).line, (expr as Ast.LiteralExpr).column));
    return '/* UNSUPPORTED */';
  }

  private emitLiteral(expr: Ast.LiteralExpr): string {
    const val = expr.value;
    if (expr.dataType === DataType.Float) {
      const s = String(val);
      if (!s.includes('.') && !s.includes('e') && !s.includes('E')) return s + '.0';
      return s;
    }
    if (expr.dataType === DataType.Uint) {
      const s = String(val);
      return s.endsWith('u') ? s : s + 'u';
    }
    if (expr.dataType === DataType.Bool) return val ? 'true' : 'false';
    return String(val);
  }

  private emitIdentifier(expr: Ast.IdentifierExpr): string {
    const name = expr.name;
    // Uniforms are referenced bare in GLSL (individual uniforms, not a block).
    if (this.uniformNames.has(name)) return name;
    // Read-only builtin remapping (stage-specific); track builtin-uniform usage.
    const readonlyBuiltins = this.currentStage === 'vertex' ? VERTEX_READONLY_BUILTINS : FRAGMENT_READONLY_BUILTINS;
    if (readonlyBuiltins.has(name)) {
      if (BUILTIN_UNIFORMS.has(name)) this.usedBuiltinUniforms.add(name);
      return readonlyBuiltins.get(name)!;
    }
    return name;
  }

  private emitBinary(expr: Ast.BinaryExpr): string {
    return `(${this.emitExpr(expr.left)} ${expr.op} ${this.emitExpr(expr.right)})`;
  }

  private emitUnary(expr: Ast.UnaryExpr): string {
    const operand = this.emitExpr(expr.operand);
    // GLSL supports prefix ++/-- and unary ops directly.
    if (expr.prefix) return `${expr.op}${operand}`;
    return `${operand}${expr.op}`;
  }

  private emitTernary(expr: Ast.TernaryExpr): string {
    const cond = this.emitExpr(expr.condition);
    const trueVal = this.emitExpr(expr.trueExpr);
    const falseVal = this.emitExpr(expr.falseExpr);
    return `(${cond} ? ${trueVal} : ${falseVal})`;
  }

  private emitAssign(expr: Ast.AssignExpr): string {
    return `${this.emitExpr(expr.target)} ${expr.op} ${this.emitExpr(expr.value)}`;
  }

  private emitFunctionCall(expr: Ast.FunctionCallExpr): string {
    const name = expr.name;

    // saturate(): GLSL has no saturate; emit via an overloaded helper.
    if (name === 'saturate') {
      this.needsSaturateHelper = true;
      const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
      return `saturate(${args})`;
    }

    // Library function name remapping (canonical stdlib -> mangled lib name).
    if (this.libraries.size > 0) {
      const argTypes = expr.args.map((a: Ast.Expr) => this.inferExprType(a));
      if (argTypes.every((t: DataTypeValue | null) => t !== null)) {
        const libName = getLibraryFunctionName(name, argTypes as DataTypeValue[]);
        if (libName) {
          // GLSL handles inout via the lib's param qualifier; pass args directly.
          const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
          return `${libName}(${args})`;
        }
      }
    }

    // Everything else (texture, mix, mod, atan, floatBitsToInt, dFdx, ...) is a
    // GLSL builtin and passes through, with a few WebGL2-unsupported remaps.
    const glslName = FUNCTION_REMAP.get(name) ?? name;
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    return `${glslName}(${args})`;
  }

  private emitTypeConstruct(expr: Ast.TypeConstructExpr): string {
    const glslType = TYPE_MAP.get(expr.type.type) ?? String(expr.type.type);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    return `${glslType}(${args})`;
  }

  private emitMethodCall(expr: Ast.MethodCallExpr): string {
    const obj = this.emitExpr(expr.object);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    // GLSL ES 300 arrays support .length().
    if (expr.method === 'length') return `${obj}.length()`;
    return `${obj}.${expr.method}(${args})`;
  }

  private emitArrayConstruct(expr: Ast.ArrayConstructExpr): string {
    const elemType = TYPE_MAP.get(expr.elementType.type) ?? String(expr.elementType.type);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    if (expr.size) return `${elemType}[${expr.size}](${args})`;
    return `${elemType}[](${args})`;
  }

  // -- Lightweight type inference for library name remapping ----------------

  private inferExprType(expr: Ast.Expr | null): DataTypeValue | null {
    if (!expr) return null;
    if (expr instanceof Ast.LiteralExpr) return expr.dataType;
    if (expr instanceof Ast.TypeConstructExpr) return expr.type.type;
    if (expr instanceof Ast.UnaryExpr) return this.inferExprType(expr.operand);
    if (expr instanceof Ast.PostfixExpr) return this.inferExprType(expr.operand);
    if (expr instanceof Ast.IdentifierExpr) {
      const fb = FRAGMENT_BUILTINS.get(expr.name);
      if (fb) return fb.type;
      const roType = FRAGMENT_READONLY_BUILTIN_TYPES.get(expr.name);
      if (roType !== undefined) return roType;
      for (const u of this.ast.uniforms) {
        if (u.name === expr.name) return u.type.type;
      }
      for (const c of this.ast.constants) {
        if (c.name === expr.name) return (c.type as unknown as TypeInfo).type;
      }
      const localType = this.localTypes.get(expr.name);
      if (localType !== undefined) return localType;
      return null;
    }
    if (expr instanceof Ast.BinaryExpr) {
      const lt = this.inferExprType(expr.left);
      const rt = this.inferExprType(expr.right);
      if (lt !== null && rt !== null) {
        if (lt !== DataType.Float && lt !== DataType.Int && lt !== DataType.Uint && lt !== DataType.Bool) return lt;
        if (rt !== DataType.Float && rt !== DataType.Int && rt !== DataType.Uint && rt !== DataType.Bool) return rt;
        return lt;
      }
      if (lt !== null) return lt;
      if (rt !== null) return rt;
      return null;
    }
    if (expr instanceof Ast.AssignExpr) return this.inferExprType(expr.value);
    if (expr instanceof Ast.MemberAccessExpr || expr instanceof Ast.SwizzleExpr) {
      const components = (expr as Ast.MemberAccessExpr).member ?? (expr as Ast.SwizzleExpr).components;
      if (components && typeof components === 'string') {
        const objType = this.inferExprType(expr.object);
        if (objType !== null) {
          const scalar = scalarComponentOf(objType);
          if (components.length === 1) return scalar;
          const vecType = SCALAR_TO_VEC.get(scalar);
          if (vecType) {
            if (components.length === 2) return vecType[0];
            if (components.length === 3) return vecType[1];
            if (components.length === 4) return vecType[2];
          }
        }
      }
      return null;
    }
    return null;
  }

  // -- Statement emission ---------------------------------------------------

  private emitStmt(stmt: Ast.Stmt | null, indent: number): string {
    if (!stmt) return '';
    const pad = '  '.repeat(indent);

    if (stmt instanceof Ast.BlockStmt) return this.emitBlock(stmt, indent);

    if (stmt instanceof Ast.VarDeclStmt) {
      this.localTypes.set(stmt.name, stmt.type.type);
      const glslType = this.emitType(stmt.type);
      const init = stmt.initializer ? ` = ${this.emitExpr(stmt.initializer)}` : '';
      return `${pad}${glslType} ${stmt.name}${init};\n`;
    }

    if (stmt instanceof Ast.LocalConstDecl) {
      this.localTypes.set(stmt.name, stmt.type.type);
      const glslType = this.emitType(stmt.type);
      const init = stmt.initializer ? ` = ${this.emitExpr(stmt.initializer)}` : '';
      return `${pad}${glslType} ${stmt.name}${init};\n`;
    }

    if (stmt instanceof Ast.IfStmt) return this.emitIf(stmt, indent);
    if (stmt instanceof Ast.ForStmt) return this.emitFor(stmt, indent);
    if (stmt instanceof Ast.WhileStmt) return this.emitWhile(stmt, indent);
    if (stmt instanceof Ast.DoWhileStmt) return this.emitDoWhile(stmt, indent);
    if (stmt instanceof Ast.SwitchStmt) return this.emitSwitch(stmt, indent);

    if (stmt instanceof Ast.ReturnStmt) {
      if (stmt.expression) return `${pad}return ${this.emitExpr(stmt.expression)};\n`;
      return `${pad}return;\n`;
    }
    if (stmt instanceof Ast.BreakStmt) return `${pad}break;\n`;
    if (stmt instanceof Ast.ContinueStmt) return `${pad}continue;\n`;
    if (stmt instanceof Ast.DiscardStmt) return `${pad}discard;\n`;
    if (stmt instanceof Ast.ExpressionStmt) return `${pad}${this.emitExpr(stmt.expression)};\n`;
    if (stmt instanceof Ast.EmptyStmt) return '';

    return `${pad}/* unsupported statement: ${(stmt as object).constructor.name} */\n`;
  }

  private emitBlock(block: Ast.BlockStmt, indent: number): string {
    let code = '';
    for (const s of block.statements) code += this.emitStmt(s, indent);
    return code;
  }

  private emitIf(stmt: Ast.IfStmt, indent: number): string {
    const pad = '  '.repeat(indent);
    let code = `${pad}if (${this.emitExpr(stmt.condition)}) {\n`;
    code += stmt.thenBranch instanceof Ast.BlockStmt
      ? this.emitBlock(stmt.thenBranch, indent + 1)
      : this.emitStmt(stmt.thenBranch, indent + 1);
    if (stmt.elseBranch) {
      if (stmt.elseBranch instanceof Ast.IfStmt) {
        code += `${pad}} else `;
        code += this.emitIf(stmt.elseBranch, indent).trimStart();
      } else {
        code += `${pad}} else {\n`;
        code += stmt.elseBranch instanceof Ast.BlockStmt
          ? this.emitBlock(stmt.elseBranch, indent + 1)
          : this.emitStmt(stmt.elseBranch, indent + 1);
        code += `${pad}}\n`;
      }
    } else {
      code += `${pad}}\n`;
    }
    return code;
  }

  private emitFor(stmt: Ast.ForStmt, indent: number): string {
    const pad = '  '.repeat(indent);
    let initStr = '';
    if (stmt.init) {
      const initNode = Array.isArray(stmt.init) ? stmt.init[0] : stmt.init;
      if (initNode instanceof Ast.VarDeclStmt) {
        this.localTypes.set(initNode.name, initNode.type.type);
        const glslType = this.emitType(initNode.type);
        const init = initNode.initializer ? ` = ${this.emitExpr(initNode.initializer)}` : '';
        initStr = `${glslType} ${initNode.name}${init}`;
      } else if (initNode instanceof Ast.ExpressionStmt) {
        initStr = this.emitExpr(initNode.expression);
      }
    }
    const condStr = stmt.condition ? this.emitExpr(stmt.condition) : '';
    const incrStr = stmt.increment ? this.emitExpr(stmt.increment) : '';
    let code = `${pad}for (${initStr}; ${condStr}; ${incrStr}) {\n`;
    code += stmt.body instanceof Ast.BlockStmt
      ? this.emitBlock(stmt.body, indent + 1)
      : this.emitStmt(stmt.body, indent + 1);
    code += `${pad}}\n`;
    return code;
  }

  private emitWhile(stmt: Ast.WhileStmt, indent: number): string {
    const pad = '  '.repeat(indent);
    let code = `${pad}while (${this.emitExpr(stmt.condition)}) {\n`;
    code += stmt.body instanceof Ast.BlockStmt
      ? this.emitBlock(stmt.body, indent + 1)
      : this.emitStmt(stmt.body, indent + 1);
    code += `${pad}}\n`;
    return code;
  }

  private emitDoWhile(stmt: Ast.DoWhileStmt, indent: number): string {
    const pad = '  '.repeat(indent);
    let code = `${pad}do {\n`;
    code += stmt.body instanceof Ast.BlockStmt
      ? this.emitBlock(stmt.body, indent + 1)
      : this.emitStmt(stmt.body, indent + 1);
    code += `${pad}} while (${this.emitExpr(stmt.condition)});\n`;
    return code;
  }

  private emitSwitch(stmt: Ast.SwitchStmt, indent: number): string {
    const pad = '  '.repeat(indent);
    let code = `${pad}switch (${this.emitExpr(stmt.expression)}) {\n`;
    for (const c of stmt.cases) {
      if (c.expression === null) {
        code += `${pad}  default: {\n`;
      } else {
        code += `${pad}  case ${this.emitExpr(c.expression)}: {\n`;
      }
      for (const s of c.statements) code += this.emitStmt(s, indent + 2);
      code += `${pad}  }\n`;
    }
    code += `${pad}}\n`;
    return code;
  }

  // -- Function emission ----------------------------------------------------

  private emitFunction(fn: Ast.FunctionDef): string {
    for (const p of fn.params) this.localTypes.set(p.name, p.type.type);
    const returnType = this.emitType(fn.returnType) || 'void';
    const params = fn.params.map((p: Ast.ParamDecl) => `${this.emitType(p.type)} ${p.name}`).join(', ');
    let code = `${returnType} ${fn.name}(${params}) {\n`;
    code += fn.body instanceof Ast.BlockStmt ? this.emitBlock(fn.body, 1) : this.emitStmt(fn.body, 1);
    code += '}';
    return code;
  }

  // -- Entry point emission -------------------------------------------------

  private emitEntryPoint(fn: Ast.FunctionDef): string {
    this.currentStage = fn.name;
    if (fn.name === 'fragment') return this.emitFragmentEntry(fn);
    if (fn.name === 'vertex' || fn.name === 'light') return this.emitStageBody(fn);
    // start()/process() are not wired by the preview; emit as a named helper so the
    // source still compiles if referenced. Not wired to main.
    return this.emitGenericEntry(fn);
  }

  // A stage's body as bare statements (no main). The assembler that consumes the
  // section wraps it: the vertex shader declares the vertex builtins + writes
  // varyings/gl_Position; a lit fragment declares the light builtins + accumulates
  // LIGHT. Used for vertex(), light(), and the fragment `_body` section. In the
  // light stage, currentStage='light' falls through to the fragment readonly map
  // (UV->v_uv etc.); LIGHT/COLOR/NORMAL/LIGHT_* pass through bare as locals.
  private emitStageBody(fn: Ast.FunctionDef): string {
    return fn.body instanceof Ast.BlockStmt ? this.emitBlock(fn.body, 1) : this.emitStmt(fn.body, 1);
  }

  private emitFragmentEntry(fn: Ast.FunctionDef): string {
    let code = 'void main() {\n';
    for (const [name, info] of FRAGMENT_BUILTINS) {
      code += `  ${TYPE_MAP.get(info.type)} ${name} = ${info.init};\n`;
    }
    code += '\n';
    code += fn.body instanceof Ast.BlockStmt ? this.emitBlock(fn.body, 1) : this.emitStmt(fn.body, 1);
    code += '\n  fragColor = COLOR;\n';
    code += '}';
    return code;
  }

  private emitGenericEntry(fn: Ast.FunctionDef): string {
    let code = `// ${fn.name} entry point (not wired into the preview main)\n`;
    code += `void ${fn.name}_stage() {\n`;
    code += fn.body instanceof Ast.BlockStmt ? this.emitBlock(fn.body, 1) : this.emitStmt(fn.body, 1);
    code += '}';
    return code;
  }
}