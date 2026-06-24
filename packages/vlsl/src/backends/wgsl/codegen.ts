import { DataType, TypeInfo, isSampler, scalarComponentOf } from '../../lang/types.js';
import type { DataTypeValue } from '../../lang/types.js';
import { Diagnostic } from '../../lang/diagnostic.js';
import type { BackendOptions, CodeGenResult, UniformInfo, TextureInfo, BufferInfo, SpecConstantInfo, RenderModes } from '../backend.js';
import { screenTextureFromHints } from '../backend.js';
import { getLibraryInoutParams } from '../../lang/library-registry.js';
import { getLibraryFunctionName } from '../library-names.js';
import * as Ast from '../../lang/ast.js';

// ---------------------------------------------------------------------------
// Type mapping: Hardcoded shader language -> WGSL
// ---------------------------------------------------------------------------

const TYPE_MAP = new Map<DataTypeValue, string>([
  [DataType.Float, 'f32'],
  [DataType.Int, 'i32'],
  [DataType.Uint, 'u32'],
  [DataType.Bool, 'bool'],
  [DataType.Vec2, 'vec2f'],
  [DataType.Vec3, 'vec3f'],
  [DataType.Vec4, 'vec4f'],
  [DataType.Ivec2, 'vec2i'],
  [DataType.Ivec3, 'vec3i'],
  [DataType.Ivec4, 'vec4i'],
  [DataType.Uvec2, 'vec2u'],
  [DataType.Uvec3, 'vec3u'],
  [DataType.Uvec4, 'vec4u'],
  [DataType.Bvec2, 'vec2<bool>'],
  [DataType.Bvec3, 'vec3<bool>'],
  [DataType.Bvec4, 'vec4<bool>'],
  [DataType.Mat2, 'mat2x2f'],
  [DataType.Mat3, 'mat3x3f'],
  [DataType.Mat4, 'mat4x4f'],
  [DataType.Mat2x3, 'mat2x3f'],
  [DataType.Mat2x4, 'mat2x4f'],
  [DataType.Mat3x2, 'mat3x2f'],
  [DataType.Mat3x4, 'mat3x4f'],
  [DataType.Mat4x2, 'mat4x2f'],
  [DataType.Mat4x3, 'mat4x3f'],
]);

// Sampler types -> WGSL texture type string
const SAMPLER_TEXTURE_MAP = new Map<DataTypeValue, string>([
  [DataType.Sampler2D, 'texture_2d<f32>'],
  [DataType.Isampler2D, 'texture_2d<i32>'],
  [DataType.Usampler2D, 'texture_2d<u32>'],
  [DataType.Sampler2DArray, 'texture_2d_array<f32>'],
  [DataType.Isampler2DArray, 'texture_2d_array<i32>'],
  [DataType.Usampler2DArray, 'texture_2d_array<u32>'],
  [DataType.Sampler3D, 'texture_3d<f32>'],
  [DataType.Isampler3D, 'texture_3d<i32>'],
  [DataType.Usampler3D, 'texture_3d<u32>'],
  [DataType.SamplerCube, 'texture_cube<f32>'],
  [DataType.SamplerCubeArray, 'texture_cube_array<f32>'],
  [DataType.SamplerExternalOES, 'texture_external'],
]);

// Built-in function remapping. Functions not listed here pass through unchanged.
const FUNCTION_REMAP = new Map<string, string>([
  ['dFdx', 'dpdx'],
  ['dFdy', 'dpdy'],
  ['dFdxCoarse', 'dpdxCoarse'],
  ['dFdyCoarse', 'dpdyCoarse'],
  ['dFdxFine', 'dpdxFine'],
  ['dFdyFine', 'dpdyFine'],
  ['inversesqrt', 'inverseSqrt'],
  ['fract', 'fract'],
  ['mix', 'mix'],
  ['clamp', 'clamp'],
  ['saturate', 'saturate'],
]);

// Functions that become bitcast<T>(x).
const BITCAST_FUNCTIONS = new Map<string, string>([
  ['floatBitsToInt', 'i32'],
  ['floatBitsToUint', 'u32'],
  ['intBitsToFloat', 'f32'],
  ['uintBitsToFloat', 'f32'],
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
  ['COLOR', { type: DataType.Vec4, init: 'vec4f(0.0)' }],
  ['NORMAL', { type: DataType.Vec3, init: 'vec3f(0.0, 0.0, 1.0)' }],
  ['NORMAL_MAP', { type: DataType.Vec3, init: 'vec3f(0.5, 0.5, 1.0)' }],
  ['NORMAL_MAP_DEPTH', { type: DataType.Float, init: '1.0' }],
  ['EMISSION', { type: DataType.Vec3, init: 'vec3f(0.0)' }],
  ['BLEND_FACTOR', { type: DataType.Vec4, init: 'vec4f(0.0)' }],
  ['VERTEX', { type: DataType.Vec2, init: 'vec2f(0.0)' }],
  ['SHADOW_VERTEX', { type: DataType.Vec2, init: 'vec2f(0.0)' }],
  ['LIGHT_VERTEX', { type: DataType.Vec3, init: 'vec3f(0.0)' }],
]);

// Read-only fragment builtins that come from the entry-point inputs or uniforms.
const FRAGMENT_READONLY_BUILTINS = new Map<string, string>([
  ['FRAGCOORD', 'frag_coord'],
  ['UV', '(frag_coord.xy / uniforms.resolution)'],
  ['SCREEN_UV', '(frag_coord.xy / uniforms.resolution)'],
  ['SCREEN_PIXEL_SIZE', 'uniforms.screen_pixel_size'],
  ['TEXTURE_PIXEL_SIZE', 'uniforms.texture_pixel_size'],
  ['TIME', 'uniforms.time'],
  ['AT_LIGHT_PASS', 'false'],
  ['PI', '3.14159265358979323846'],
  ['TAU', '6.28318530717958647692'],
  ['E', '2.71828182845904523536'],
  ['EPSILON', '0.00001'],
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

// Blend mode render modes and their suffix after 'blend_'.
const BLEND_MODES = new Set<string>([
  'blend_mix', 'blend_add', 'blend_sub', 'blend_mul',
  'blend_premul_alpha', 'blend_disabled', 'blend_dual_source',
]);


// ---------------------------------------------------------------------------
// Code generator
// ---------------------------------------------------------------------------

export class WgslCodeGen
{
  private ast: Ast.ShaderAst;
  private startTextureBinding: number;
  private startBufferBinding: number;
  private libraries: Set<string>;
  private diagnostics: Diagnostic[];
  private needsModHelper: boolean;
  private uniformNames: Set<string>;
  private samplerNames: Set<string>;
  private nextBinding: number;
  // Flat map of local variable/parameter names -> DataType for type inference.
  // Scope management is intentionally simplified (overwrites on redeclaration).
  private localTypes: Map<string, DataTypeValue>;

  constructor(ast: Ast.ShaderAst, options: BackendOptions = {})
  {
    this.ast = ast;
    this.startTextureBinding = options.startTextureBinding ?? 0;
    this.startBufferBinding = options.startBufferBinding ?? 0;
    this.libraries = options.libraries ?? new Set();
    this.diagnostics = [];
    this.needsModHelper = false;
    this.uniformNames = new Set();
    this.samplerNames = new Set();
    this.nextBinding = 0;
    this.localTypes = new Map();
  }

  // -- Public API -----------------------------------------------------------

  generate(): CodeGenResult
  {
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

    // Parse render modes.
    const rawRenderModes = [...this.ast.renderModes];
    const renderModes = this.parseRenderModes(rawRenderModes);

    // Generate uniform block.
    let uniformBlockMembers = '';
    const uniforms: UniformInfo[] = [];
    this.nextBinding = 0;
    if (nonSamplerUniforms.length > 0) {
      const lines: string[] = [];
      for (const u of nonSamplerUniforms) {
        const wgslType = this.emitType(u.type);
        lines.push(`  ${u.name}: ${wgslType},`);
        uniforms.push({
          name: u.name,
          type: u.type.type,
          wgslType,
          hints: u.hints ?? [],
          defaultValue: u.defaultValue ?? null,
        });
      }
      uniformBlockMembers = lines.join('\n');
      this.nextBinding = 1; // binding 0 used for uniform block
    }

    // Generate sampler/texture declarations.
    let bindingIndex = this.nextBinding + this.startTextureBinding;
    const samplerLines: string[] = [];
    const textures: TextureInfo[] = [];
    let usesScreenTexture = false;
    let usesScreenTextureMipmaps = false;
    for (const u of samplerUniforms) {
      const texType = SAMPLER_TEXTURE_MAP.get(u.type.type) ?? 'texture_2d<f32>';
      samplerLines.push(`@group(0) @binding(${bindingIndex}) var ${u.name}_tex: ${texType};`);
      bindingIndex++;
      samplerLines.push(`@group(0) @binding(${bindingIndex}) var ${u.name}_sampler: sampler;`);
      bindingIndex++;
      // A `hint_screen_texture` sampler keeps a normal binding (WGSL has no shared base-set
      // screen sampler like the engine's GLSL); it's flagged so the renderer binds a copy of
      // the framebuffer here and knows to do the copy before drawing.
      const screen = screenTextureFromHints(u.hints ?? []);
      if (screen.isScreenTexture) {
        usesScreenTexture = true;
        if (screen.mipmaps) usesScreenTextureMipmaps = true;
      }
      textures.push({
        name: u.name,
        type: u.type.type,
        texBinding: bindingIndex - 2,
        samplerBinding: bindingIndex - 1,
        ...(screen.isScreenTexture && { screenTexture: true, screenTextureMipmaps: screen.mipmaps }),
      });
    }
    const samplerDeclarations = samplerLines.join('\n');

    // Generate buffer declarations.
    let bufBindingIndex = this.startBufferBinding;
    const bufferLines: string[] = [];
    const buffers: BufferInfo[] = [];
    for (const b of this.ast.buffers) {
      const memberLines = b.members.map((m: Ast.StructMember) => `  ${m.name}: ${this.emitType(m.type)},`);
      const structName = `${b.name}_Block`;
      bufferLines.push(`struct ${structName} {\n${memberLines.join('\n')}\n}`);
      const readOnly = b.qualifiers.includes('readonly');
      const accessMode = readOnly ? 'read' : 'read_write';
      bufferLines.push(`@group(0) @binding(${bufBindingIndex}) var<storage, ${accessMode}> ${b.name}: ${structName};`);
      bufBindingIndex++;
      buffers.push({ name: b.name, qualifiers: b.qualifiers });
    }
    const bufferDeclarations = bufferLines.join('\n');

    // Generate const declarations.
    const constLines: string[] = [];
    for (const c of this.ast.constants) {
      const wgslType = this.emitType(c.type);
      const init = c.initializer ? ` = ${this.emitExpr(c.initializer)}` : '';
      constLines.push(`const ${c.name}: ${wgslType}${init};`);
    }
    const constDeclarations = constLines.join('\n');

    // Generate spec constant (override) declarations.
    const specConstLines: string[] = [];
    const specConstants: SpecConstantInfo[] = [];
    for (const sc of this.ast.specConstants) {
      const wgslType = this.emitType(sc.type);
      const init = sc.defaultValue ? ` = ${this.emitExpr(sc.defaultValue)}` : '';
      specConstLines.push(`override ${sc.name}: ${wgslType}${init};`);
      specConstants.push({ name: sc.name, type: sc.type.type, wgslType });
    }
    const specConstDeclarations = specConstLines.join('\n');

    // Generate struct declarations.
    const structLines: string[] = [];
    for (const s of this.ast.structs) {
      const memberLines = s.members.map((m: Ast.StructMember) => `  ${m.name}: ${this.emitType(m.type)},`);
      structLines.push(`struct ${s.name} {\n${memberLines.join('\n')}\n}`);
    }

    // Separate entry-point functions from user functions.
    const userFuncs: Ast.FunctionDef[] = [];
    const entryPoints: Ast.FunctionDef[] = [];
    for (const fn of this.ast.functions) {
      if (ENTRY_POINT_NAMES.has(fn.name)) {
        entryPoints.push(fn);
      } else {
        userFuncs.push(fn);
      }
    }

    // Generate user functions.
    const userFunctionLines: string[] = [];
    for (const fn of userFuncs) {
      userFunctionLines.push(this.emitFunction(fn));
    }
    const userFunctions = userFunctionLines.join('\n\n');

    // Generate entry points into code sections.
    const codeSections = new Map<string, string>();
    for (const fn of entryPoints) {
      codeSections.set(fn.name, this.emitEntryPoint(fn));
    }

    // If mod helper is needed, prepend it to user functions.
    let finalUserFunctions = userFunctions;
    if (this.needsModHelper) {
      const helper = 'fn hc_mod(x: f32, y: f32) -> f32 {\n  return x - y * floor(x / y);\n}';
      finalUserFunctions = helper + (finalUserFunctions ? '\n\n' + finalUserFunctions : '');
    }

    return {
      codeSections,
      userFunctions: finalUserFunctions,
      constDeclarations,
      uniformBlockMembers,
      samplerDeclarations,
      bufferDeclarations,
      specConstDeclarations,
      uniforms,
      textures,
      buffers,
      specConstants,
      renderModes,
      rawRenderModes,
      usesScreenTexture,
      usesScreenTextureMipmaps,
      diagnostics: this.diagnostics,
    };
  }

  // -- Render mode parsing --------------------------------------------------

  private parseRenderModes(modes: string[]): RenderModes
  {
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

  private emitType(typeInfo: TypeInfo | null): string
  {
    if (!typeInfo) {
      return 'f32';
    }
    const dt = typeInfo.type;
    if (dt === DataType.Struct) {
      return typeInfo.structName ?? 'UNKNOWN_STRUCT';
    }
    if (dt === DataType.Void) {
      return '';
    }
    return TYPE_MAP.get(dt) ?? String(dt);
  }

  // -- Expression emission --------------------------------------------------

  private emitExpr(expr: Ast.Expr | null): string
  {
    if (!expr) {
      return '';
    }

    if (expr instanceof Ast.LiteralExpr) {
      return this.emitLiteral(expr);
    }

    if (expr instanceof Ast.IdentifierExpr) {
      return this.emitIdentifier(expr);
    }

    if (expr instanceof Ast.BinaryExpr) {
      return this.emitBinary(expr);
    }

    if (expr instanceof Ast.UnaryExpr) {
      return this.emitUnary(expr);
    }

    if (expr instanceof Ast.PostfixExpr) {
      return this.emitPostfix(expr);
    }

    if (expr instanceof Ast.TernaryExpr) {
      return this.emitTernary(expr);
    }

    if (expr instanceof Ast.AssignExpr) {
      return this.emitAssign(expr);
    }

    if (expr instanceof Ast.FunctionCallExpr) {
      return this.emitFunctionCall(expr);
    }

    if (expr instanceof Ast.TypeConstructExpr) {
      return this.emitTypeConstruct(expr);
    }

    if (expr instanceof Ast.MemberAccessExpr) {
      return this.emitMemberAccess(expr);
    }

    if (expr instanceof Ast.SwizzleExpr) {
      return `${this.emitExpr(expr.object)}.${expr.components}`;
    }

    if (expr instanceof Ast.IndexExpr) {
      return `${this.emitExpr(expr.object)}[${this.emitExpr(expr.index)}]`;
    }

    if (expr instanceof Ast.MethodCallExpr) {
      return this.emitMethodCall(expr);
    }

    if (expr instanceof Ast.ArrayConstructExpr) {
      return this.emitArrayConstruct(expr);
    }

    if (expr instanceof Ast.BraceInitExpr) {
      const elems = expr.elements.map((e: Ast.Expr) => this.emitExpr(e)).join(', ');
      return `(${elems})`;
    }

    this.diagnostics.push(Diagnostic.error(
      `unsupported expression node: ${(expr as object).constructor.name}`,
      (expr as Ast.LiteralExpr).line, (expr as Ast.LiteralExpr).column
    ));
    return '/* UNSUPPORTED */';
  }

  private emitLiteral(expr: Ast.LiteralExpr): string
  {
    const val = expr.value;
    if (expr.dataType === DataType.Float) {
      // Ensure the literal has a decimal point or exponent for WGSL.
      const s = String(val);
      if (!s.includes('.') && !s.includes('e') && !s.includes('E')) {
        return s + '.0';
      }
      return s;
    }
    if (expr.dataType === DataType.Uint) {
      const s = String(val);
      return s.endsWith('u') ? s : s + 'u';
    }
    if (expr.dataType === DataType.Bool) {
      return val ? 'true' : 'false';
    }
    return String(val);
  }

  private emitIdentifier(expr: Ast.IdentifierExpr): string
  {
    const name = expr.name;

    // Check if it's a uniform reference.
    if (this.uniformNames.has(name)) {
      return `uniforms.${name}`;
    }

    // Check if it's a sampler reference -- these get split into tex/sampler.
    // Handled at call sites (texture(), textureLod(), etc.) instead.

    // Check for read-only builtin remapping.
    if (FRAGMENT_READONLY_BUILTINS.has(name)) {
      return FRAGMENT_READONLY_BUILTINS.get(name)!;
    }

    return name;
  }

  private emitBinary(expr: Ast.BinaryExpr): string
  {
    const left = this.emitExpr(expr.left);
    const right = this.emitExpr(expr.right);
    return `(${left} ${expr.op} ${right})`;
  }

  private emitUnary(expr: Ast.UnaryExpr): string
  {
    const operand = this.emitExpr(expr.operand);
    // WGSL does not have prefix ++ or --. Convert to compound assignment.
    if (expr.prefix && (expr.op === '++' || expr.op === '--')) {
      const assignOp = expr.op === '++' ? '+=' : '-=';
      return `(${operand} ${assignOp} 1)`;
    }
    if (expr.prefix) {
      return `${expr.op}${operand}`;
    }
    return `${operand}${expr.op}`;
  }

  private emitPostfix(expr: Ast.PostfixExpr): string
  {
    // LIMITATION: WGSL only allows x++ and x-- as standalone statements, not
    // inside expressions. Hoisting into separate statements is too complex for
    // this pass. Emit as-is and rely on the user writing sane code for now.
    const operand = this.emitExpr(expr.operand);
    return `${operand}${expr.op}`;
  }

  private emitTernary(expr: Ast.TernaryExpr): string
  {
    // WGSL has no ternary. Use select(falseVal, trueVal, condition).
    const cond = this.emitExpr(expr.condition);
    const trueVal = this.emitExpr(expr.trueExpr);
    const falseVal = this.emitExpr(expr.falseExpr);
    return `select(${falseVal}, ${trueVal}, ${cond})`;
  }

  private emitAssign(expr: Ast.AssignExpr): string
  {
    const target = this.emitExpr(expr.target);
    const value = this.emitExpr(expr.value);
    return `${target} ${expr.op} ${value}`;
  }

  private emitFunctionCall(expr: Ast.FunctionCallExpr): string
  {
    const name = expr.name;

    // Bitcast functions.
    if (BITCAST_FUNCTIONS.has(name)) {
      const targetType = BITCAST_FUNCTIONS.get(name)!;
      const arg = this.emitExpr(expr.args[0]);
      return `bitcast<${targetType}>(${arg})`;
    }

    // atan(y, x) -> atan2(y, x) in WGSL (single-arg atan stays as atan)
    if (name === 'atan' && expr.args.length === 2) {
      const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
      return `atan2(${args})`;
    }

    // mod(x, y) -> use the helper function for correct GLSL-like behavior.
    if (name === 'mod') {
      this.needsModHelper = true;
      const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
      return `hc_mod(${args})`;
    }

    // Texture sampling functions: these need sampler/texture split.
    if (name === 'texture') {
      return this.emitTextureSample(expr);
    }
    if (name === 'textureLod') {
      return this.emitTextureSampleLevel(expr);
    }
    if (name === 'texelFetch') {
      return this.emitTextureLoad(expr);
    }
    if (name === 'textureSize') {
      return this.emitTextureDimensions(expr);
    }

    // Library function name remapping.
    if (this.libraries.size > 0) {
      const argTypes = expr.args.map((a: Ast.Expr) => this.inferExprType(a));
      if (argTypes.every((t: DataTypeValue | null) => t !== null)) {
        const libName = getLibraryFunctionName(name, argTypes as DataTypeValue[]);
        if (libName) {
          // Check for inout params -- emit & prefix for those arguments
          const inoutIndices = getLibraryInoutParams(name, argTypes as DataTypeValue[]);
          const args = expr.args.map((a: Ast.Expr, i: number) => {
            const emitted = this.emitExpr(a);
            if (inoutIndices && inoutIndices.includes(i)) {
              return `&${emitted}`;
            }
            return emitted;
          }).join(', ');
          return `${libName}(${args})`;
        }
      }
    }

    // Remap function name if needed.
    const wgslName = FUNCTION_REMAP.get(name) ?? name;
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    return `${wgslName}(${args})`;
  }

  private emitTextureSample(expr: Ast.FunctionCallExpr): string
  {
    // texture(sampler, uv) -> textureSample(tex, sampler, uv)
    if (expr.args.length < 2) {
      return `textureSample(${expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ')})`;
    }
    const samplerName = this.getSamplerName(expr.args[0]);
    const uv = this.emitExpr(expr.args[1]);
    return `textureSample(${samplerName}_tex, ${samplerName}_sampler, ${uv})`;
  }

  private emitTextureSampleLevel(expr: Ast.FunctionCallExpr): string
  {
    // textureLod(sampler, uv, lod) -> textureSampleLevel(tex, sampler, uv, lod)
    if (expr.args.length < 3) {
      return `textureSampleLevel(${expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ')})`;
    }
    const samplerName = this.getSamplerName(expr.args[0]);
    const uv = this.emitExpr(expr.args[1]);
    const lod = this.emitExpr(expr.args[2]);
    return `textureSampleLevel(${samplerName}_tex, ${samplerName}_sampler, ${uv}, ${lod})`;
  }

  private emitTextureLoad(expr: Ast.FunctionCallExpr): string
  {
    // texelFetch(sampler, coord, lod) -> textureLoad(tex, coord, lod)
    if (expr.args.length < 3) {
      return `textureLoad(${expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ')})`;
    }
    const samplerName = this.getSamplerName(expr.args[0]);
    const coord = this.emitExpr(expr.args[1]);
    const lod = this.emitExpr(expr.args[2]);
    return `textureLoad(${samplerName}_tex, ${coord}, ${lod})`;
  }

  private emitTextureDimensions(expr: Ast.FunctionCallExpr): string
  {
    // textureSize(sampler, lod) -> textureDimensions(tex, lod)
    if (expr.args.length < 2) {
      return `textureDimensions(${expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ')})`;
    }
    const samplerName = this.getSamplerName(expr.args[0]);
    const lod = this.emitExpr(expr.args[1]);
    return `textureDimensions(${samplerName}_tex, ${lod})`;
  }

  private getSamplerName(expr: Ast.Expr): string
  {
    // The first argument to texture functions is the sampler name identifier.
    if (expr instanceof Ast.IdentifierExpr) {
      return expr.name;
    }
    // Fallback: emit the expression and hope for the best.
    return this.emitExpr(expr);
  }

  private emitTypeConstruct(expr: Ast.TypeConstructExpr): string
  {
    const wgslType = TYPE_MAP.get(expr.type.type) ?? String(expr.type.type);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    return `${wgslType}(${args})`;
  }

  private emitMemberAccess(expr: Ast.MemberAccessExpr): string
  {
    const obj = this.emitExpr(expr.object);
    return `${obj}.${expr.member}`;
  }

  private emitMethodCall(expr: Ast.MethodCallExpr): string
  {
    const obj = this.emitExpr(expr.object);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    if (expr.method === 'length') {
      return `arrayLength(&${obj})`;
    }
    return `${obj}.${expr.method}(${args})`;
  }

  private emitArrayConstruct(expr: Ast.ArrayConstructExpr): string
  {
    const elemType = TYPE_MAP.get(expr.elementType.type) ?? String(expr.elementType.type);
    const args = expr.args.map((a: Ast.Expr) => this.emitExpr(a)).join(', ');
    if (expr.size) {
      return `array<${elemType}, ${expr.size}>(${args})`;
    }
    return `array<${elemType}>(${args})`;
  }

  // -- Lightweight type inference for library name remapping -------------------

  private inferExprType(expr: Ast.Expr | null): DataTypeValue | null
  {
    if (!expr) return null;

    if (expr instanceof Ast.LiteralExpr) {
      return expr.dataType;
    }

    if (expr instanceof Ast.TypeConstructExpr) {
      return expr.type.type;
    }

    // Unary preserves type.
    if (expr instanceof Ast.UnaryExpr) {
      return this.inferExprType(expr.operand);
    }

    // Postfix preserves type.
    if (expr instanceof Ast.PostfixExpr) {
      return this.inferExprType(expr.operand);
    }

    // Identifiers: check builtin variables and uniforms.
    if (expr instanceof Ast.IdentifierExpr) {
      // Fragment writable builtins.
      const fb = FRAGMENT_BUILTINS.get(expr.name);
      if (fb) return fb.type;
      // Fragment read-only builtins: need a type map.
      const roType = FRAGMENT_READONLY_BUILTIN_TYPES.get(expr.name);
      if (roType !== undefined) return roType;
      // Non-sampler uniforms (stored during generate).
      for (const u of this.ast.uniforms) {
        if (u.name === expr.name) {
          return u.type.type;
        }
      }
      // Constants.
      for (const c of this.ast.constants) {
        if (c.name === expr.name) {
          return (c.type as unknown as TypeInfo).type;
        }
      }
      // Local variables and function parameters.
      const localType = this.localTypes.get(expr.name);
      if (localType !== undefined) return localType;
      return null;
    }

    // Binary expressions: infer from operands.
    // For vector op scalar or scalar op vector, the vector type dominates.
    if (expr instanceof Ast.BinaryExpr) {
      const lt = this.inferExprType(expr.left);
      const rt = this.inferExprType(expr.right);
      if (lt !== null && rt !== null) {
        // If either is a vector/matrix type, prefer it over scalar
        if (lt !== DataType.Float && lt !== DataType.Int && lt !== DataType.Uint && lt !== DataType.Bool) return lt;
        if (rt !== DataType.Float && rt !== DataType.Int && rt !== DataType.Uint && rt !== DataType.Bool) return rt;
        return lt;
      }
      if (lt !== null) return lt;
      if (rt !== null) return rt;
      return null;
    }

    // Parenthesized / grouped expressions: just recurse.
    if (expr instanceof Ast.AssignExpr) {
      return this.inferExprType(expr.value);
    }

    // Member access / swizzle: return inferred type based on swizzle length
    // and the scalar component of the object type.
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

  private emitStmt(stmt: Ast.Stmt | null, indent: number): string
  {
    if (!stmt) {
      return '';
    }

    const pad = '  '.repeat(indent);

    if (stmt instanceof Ast.BlockStmt) {
      return this.emitBlock(stmt, indent);
    }

    if (stmt instanceof Ast.VarDeclStmt) {
      this.localTypes.set(stmt.name, stmt.type.type);
      const wgslType = this.emitType(stmt.type);
      const init = stmt.initializer ? ` = ${this.emitExpr(stmt.initializer)}` : '';
      return `${pad}var ${stmt.name}: ${wgslType}${init};\n`;
    }

    if (stmt instanceof Ast.LocalConstDecl) {
      this.localTypes.set(stmt.name, stmt.type.type);
      const wgslType = this.emitType(stmt.type);
      const init = stmt.initializer ? ` = ${this.emitExpr(stmt.initializer)}` : '';
      return `${pad}let ${stmt.name}: ${wgslType}${init};\n`;
    }

    if (stmt instanceof Ast.IfStmt) {
      return this.emitIf(stmt, indent);
    }

    if (stmt instanceof Ast.ForStmt) {
      return this.emitFor(stmt, indent);
    }

    if (stmt instanceof Ast.WhileStmt) {
      return this.emitWhile(stmt, indent);
    }

    if (stmt instanceof Ast.DoWhileStmt) {
      return this.emitDoWhile(stmt, indent);
    }

    if (stmt instanceof Ast.SwitchStmt) {
      return this.emitSwitch(stmt, indent);
    }

    if (stmt instanceof Ast.ReturnStmt) {
      if (stmt.expression) {
        return `${pad}return ${this.emitExpr(stmt.expression)};\n`;
      }
      return `${pad}return;\n`;
    }

    if (stmt instanceof Ast.BreakStmt) {
      return `${pad}break;\n`;
    }

    if (stmt instanceof Ast.ContinueStmt) {
      return `${pad}continue;\n`;
    }

    if (stmt instanceof Ast.DiscardStmt) {
      return `${pad}discard;\n`;
    }

    if (stmt instanceof Ast.ExpressionStmt) {
      return `${pad}${this.emitExpr(stmt.expression)};\n`;
    }

    if (stmt instanceof Ast.EmptyStmt) {
      return '';
    }

    return `${pad}/* unsupported statement: ${(stmt as object).constructor.name} */\n`;
  }

  private emitBlock(block: Ast.BlockStmt, indent: number): string
  {
    let code = '';
    for (const s of block.statements) {
      code += this.emitStmt(s, indent);
    }
    return code;
  }

  private emitIf(stmt: Ast.IfStmt, indent: number): string
  {
    const pad = '  '.repeat(indent);
    let code = `${pad}if (${this.emitExpr(stmt.condition)}) {\n`;
    if (stmt.thenBranch instanceof Ast.BlockStmt) {
      code += this.emitBlock(stmt.thenBranch, indent + 1);
    } else {
      code += this.emitStmt(stmt.thenBranch, indent + 1);
    }
    if (stmt.elseBranch) {
      if (stmt.elseBranch instanceof Ast.IfStmt) {
        code += `${pad}} else `;
        // Emit the else-if without its own padding (already on same line).
        const elseIfCode = this.emitIf(stmt.elseBranch, indent);
        code += elseIfCode.trimStart();
      } else {
        code += `${pad}} else {\n`;
        if (stmt.elseBranch instanceof Ast.BlockStmt) {
          code += this.emitBlock(stmt.elseBranch, indent + 1);
        } else {
          code += this.emitStmt(stmt.elseBranch, indent + 1);
        }
        code += `${pad}}\n`;
      }
    } else {
      code += `${pad}}\n`;
    }
    return code;
  }

  private emitFor(stmt: Ast.ForStmt, indent: number): string
  {
    const pad = '  '.repeat(indent);

    // WGSL has a `for` loop but its init/update parts are limited.
    // We emit a WGSL for loop.
    let initStr = '';
    if (stmt.init) {
      // Handle array from multi-declarator parser (for-loop init is always single, take first)
      const initNode = Array.isArray(stmt.init) ? stmt.init[0] : stmt.init;
      if (initNode instanceof Ast.VarDeclStmt) {
        this.localTypes.set(initNode.name, initNode.type.type);
        const wgslType = this.emitType(initNode.type);
        const init = initNode.initializer ? ` = ${this.emitExpr(initNode.initializer)}` : '';
        initStr = `var ${initNode.name}: ${wgslType}${init}`;
      } else if (initNode instanceof Ast.ExpressionStmt) {
        initStr = this.emitExpr(initNode.expression);
      }
    }
    const condStr = stmt.condition ? this.emitExpr(stmt.condition) : '';
    const incrStr = stmt.increment ? this.emitExpr(stmt.increment) : '';

    let code = `${pad}for (${initStr}; ${condStr}; ${incrStr}) {\n`;
    if (stmt.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(stmt.body, indent + 1);
    } else {
      code += this.emitStmt(stmt.body, indent + 1);
    }
    code += `${pad}}\n`;
    return code;
  }

  private emitWhile(stmt: Ast.WhileStmt, indent: number): string
  {
    const pad = '  '.repeat(indent);
    // WGSL uses `while` but some implementations may prefer `loop`.
    // We use `while` which is valid WGSL.
    let code = `${pad}while (${this.emitExpr(stmt.condition)}) {\n`;
    if (stmt.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(stmt.body, indent + 1);
    } else {
      code += this.emitStmt(stmt.body, indent + 1);
    }
    code += `${pad}}\n`;
    return code;
  }

  private emitDoWhile(stmt: Ast.DoWhileStmt, indent: number): string
  {
    const pad = '  '.repeat(indent);
    // WGSL doesn't have do-while. Use loop + break.
    let code = `${pad}loop {\n`;
    if (stmt.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(stmt.body, indent + 1);
    } else {
      code += this.emitStmt(stmt.body, indent + 1);
    }
    code += `${pad}  if (!(${this.emitExpr(stmt.condition)})) {\n`;
    code += `${pad}    break;\n`;
    code += `${pad}  }\n`;
    code += `${pad}}\n`;
    return code;
  }

  private emitSwitch(stmt: Ast.SwitchStmt, indent: number): string
  {
    const pad = '  '.repeat(indent);
    let code = `${pad}switch (${this.emitExpr(stmt.expression)}) {\n`;
    for (const c of stmt.cases) {
      if (c.expression === null) {
        code += `${pad}  default: {\n`;
      } else {
        code += `${pad}  case ${this.emitExpr(c.expression)}: {\n`;
      }
      for (const s of c.statements) {
        // Skip bare break statements inside case -- WGSL case blocks are
        // implicitly non-fallthrough so a trailing break is unnecessary.
        if (s instanceof Ast.BreakStmt) {
          continue;
        }
        code += this.emitStmt(s, indent + 2);
      }
      code += `${pad}  }\n`;
    }
    code += `${pad}}\n`;
    return code;
  }

  // -- Function emission ----------------------------------------------------

  private emitFunction(fn: Ast.FunctionDef): string
  {
    // Record parameter types for local type inference.
    for (const p of fn.params) {
      this.localTypes.set(p.name, p.type.type);
    }

    const returnType = this.emitType(fn.returnType);
    const params = fn.params.map((p: Ast.ParamDecl) => {
      const wgslType = this.emitType(p.type);
      return `${p.name}: ${wgslType}`;
    }).join(', ');

    const returnAnnotation = returnType ? ` -> ${returnType}` : '';
    let code = `fn ${fn.name}(${params})${returnAnnotation} {\n`;
    if (fn.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(fn.body, 1);
    } else {
      code += this.emitStmt(fn.body, 1);
    }
    code += '}';
    return code;
  }

  // -- Entry point emission -------------------------------------------------

  private emitEntryPoint(fn: Ast.FunctionDef): string
  {
    if (fn.name === 'fragment') {
      return this.emitFragmentEntry(fn);
    }
    // For vertex/light/other stages, emit a placeholder for now.
    return this.emitGenericEntry(fn);
  }

  private emitFragmentEntry(fn: Ast.FunctionDef): string
  {
    let code = '@fragment\n';
    code += 'fn fs_main(@builtin(position) frag_coord: vec4f) -> @location(0) vec4f {\n';

    // Initialize writable builtin locals.
    for (const [name, info] of FRAGMENT_BUILTINS) {
      code += `  var ${name}: ${TYPE_MAP.get(info.type)} = ${info.init};\n`;
    }
    code += '\n';

    // Emit the body statements.
    if (fn.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(fn.body, 1);
    } else {
      code += this.emitStmt(fn.body, 1);
    }

    code += '\n  return COLOR;\n';
    code += '}';
    return code;
  }

  private emitGenericEntry(fn: Ast.FunctionDef): string
  {
    // Minimal stub for non-fragment entry points.
    let code = `// ${fn.name} entry point (stub)\n`;
    code += `fn ${fn.name}_main() {\n`;
    if (fn.body instanceof Ast.BlockStmt) {
      code += this.emitBlock(fn.body, 1);
    } else {
      code += this.emitStmt(fn.body, 1);
    }
    code += '}';
    return code;
  }
}
