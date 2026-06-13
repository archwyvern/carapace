import { TokenKind, type TokenKindValue, type Token } from './tokens.js';
import { TypeInfo, DataType, typeFromTokenKind } from './types.js';
import { Diagnostic } from './diagnostic.js';
import * as Ast from './ast.js';

// Set of TokenKind values that represent type keywords (excluding Void).
const TYPE_TOKEN_KINDS = new Set<TokenKindValue>([
  TokenKind.Bool, TokenKind.Int, TokenKind.Uint, TokenKind.Float,
  TokenKind.Bvec2, TokenKind.Bvec3, TokenKind.Bvec4,
  TokenKind.Ivec2, TokenKind.Ivec3, TokenKind.Ivec4,
  TokenKind.Uvec2, TokenKind.Uvec3, TokenKind.Uvec4,
  TokenKind.Vec2, TokenKind.Vec3, TokenKind.Vec4,
  TokenKind.Mat2, TokenKind.Mat3, TokenKind.Mat4,
  TokenKind.Mat2x3, TokenKind.Mat2x4,
  TokenKind.Mat3x2, TokenKind.Mat3x4,
  TokenKind.Mat4x2, TokenKind.Mat4x3,
  TokenKind.Sampler2D, TokenKind.Isampler2D, TokenKind.Usampler2D,
  TokenKind.Sampler2DArray, TokenKind.Isampler2DArray, TokenKind.Usampler2DArray,
  TokenKind.Sampler3D, TokenKind.Isampler3D, TokenKind.Usampler3D,
  TokenKind.SamplerCube, TokenKind.SamplerCubeArray, TokenKind.SamplerExternalOES,
]);

const PRECISION_KINDS = new Set<TokenKindValue>([
  TokenKind.Lowp, TokenKind.Mediump, TokenKind.Highp,
]);

const INTERPOLATION_KINDS = new Set<TokenKindValue>([
  TokenKind.Flat, TokenKind.Smooth, TokenKind.Noperspective,
  TokenKind.Centroid, TokenKind.Sample,
]);

const ASSIGN_OPS = new Set<TokenKindValue>([
  TokenKind.Assign,
  TokenKind.PlusAssign,
  TokenKind.MinusAssign,
  TokenKind.StarAssign,
  TokenKind.SlashAssign,
  TokenKind.PercentAssign,
  TokenKind.LeftShiftAssign,
  TokenKind.RightShiftAssign,
  TokenKind.AmpAssign,
  TokenKind.PipeAssign,
  TokenKind.CaretAssign,
]);

const HINT_NAME_KINDS = new Set<TokenKindValue>([
  TokenKind.SourceColor,
  TokenKind.ColorConversionDisabled,
  TokenKind.HintDefaultWhite,
  TokenKind.HintDefaultBlack,
  TokenKind.HintDefaultTransparent,
  TokenKind.HintNormal,
  TokenKind.HintAnisotropy,
  TokenKind.HintRoughnessNormal,
  TokenKind.HintRoughnessR,
  TokenKind.HintRoughnessG,
  TokenKind.HintRoughnessB,
  TokenKind.HintRoughnessA,
  TokenKind.HintRoughnessGray,
  TokenKind.HintScreenTexture,
  TokenKind.HintNormalRoughnessTexture,
  TokenKind.HintDepthTexture,
  TokenKind.HintBlitSource0,
  TokenKind.HintBlitSource1,
  TokenKind.HintBlitSource2,
  TokenKind.HintBlitSource3,
  TokenKind.FilterNearest,
  TokenKind.FilterLinear,
  TokenKind.FilterNearestMipmap,
  TokenKind.FilterLinearMipmap,
  TokenKind.FilterNearestMipmapAnisotropic,
  TokenKind.FilterLinearMipmapAnisotropic,
  TokenKind.RepeatEnable,
  TokenKind.RepeatDisable,
]);

const BUFFER_QUALIFIER_KINDS = new Set<TokenKindValue>([
  TokenKind.Readonly,
  TokenKind.Writeonly,
  TokenKind.Restrict,
  TokenKind.Coherent,
  TokenKind.Volatile,
]);

interface ParseResult {
  ast: Ast.ShaderAst;
  diagnostics: Diagnostic[];
}

interface ParseOptions {
  isInclude?: boolean;
}

interface HintResult {
  kind: string;
  args: unknown[];
}

export class Parser
{
  private tokens: Token[];
  private pos: number;
  private diagnostics: Diagnostic[];
  private structNames: Set<string>;

  constructor(tokens: Token[])
  {
    this.tokens = tokens;
    this.pos = 0;
    this.diagnostics = [];
    this.structNames = new Set();
  }

  parse({ isInclude = false }: ParseOptions = {}): ParseResult
  {
    const ast = this.parseShader({ isInclude });
    return { ast, diagnostics: this.diagnostics };
  }

  // -- Helpers ----------------------------------------------------------------

  private peek(): Token
  {
    return this.tokens[this.pos];
  }

  private peekAt(offset: number): Token
  {
    const i = this.pos + offset;
    if (i < this.tokens.length) {
      return this.tokens[i];
    }
    return this.tokens[this.tokens.length - 1]; // Eof
  }

  private advance(): Token
  {
    return this.tokens[this.pos++];
  }

  private check(kind: TokenKindValue): boolean
  {
    return this.peek().kind === kind;
  }

  private match(kind: TokenKindValue): boolean
  {
    if (this.check(kind)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(kind: TokenKindValue, message?: string): Token
  {
    if (this.check(kind)) {
      return this.advance();
    }
    this.error(message || `expected ${kind}`);
    return this.peek(); // don't advance on error
  }

  private error(message: string): void
  {
    const tok = this.peek();
    this.diagnostics.push(Diagnostic.error(message, tok.line, tok.column));
  }

  private atEnd(): boolean
  {
    return this.peek().kind === TokenKind.Eof;
  }

  // Skip tokens until we find one of the given kinds (used for error recovery).
  private synchronize(...kinds: TokenKindValue[]): void
  {
    const kindSet = new Set(kinds);
    while (!this.atEnd()) {
      if (kindSet.has(this.peek().kind)) {
        return;
      }
      this.advance();
    }
  }

  // -- Type helpers -----------------------------------------------------------

  private isTypeToken(token: Token): boolean
  {
    if (TYPE_TOKEN_KINDS.has(token.kind)) return true;
    if (token.kind === TokenKind.Void) return true;
    if (token.kind === TokenKind.Identifier && this.structNames.has(token.text)) return true;
    return false;
  }

  private isPrecisionToken(token: Token): boolean
  {
    return PRECISION_KINDS.has(token.kind);
  }

  private isInterpolationToken(token: Token): boolean
  {
    return INTERPOLATION_KINDS.has(token.kind);
  }

  // -- Top level --------------------------------------------------------------

  private parseShader({ isInclude = false }: ParseOptions = {}): Ast.ShaderAst
  {
    const tok = this.peek();
    let shaderType: string | null = null;

    if (this.check(TokenKind.ShaderType)) {
      this.advance();
      const nameTok = this.expect(TokenKind.Identifier, 'expected shader type name');
      shaderType = nameTok.text;
      this.expect(TokenKind.Semicolon, 'expected ";" after shader_type');
    } else if (!isInclude) {
      this.error('expected "shader_type"');
    }

    const ast = new Ast.ShaderAst(shaderType, tok.line, tok.column);

    while (!this.atEnd()) {
      this.parseTopLevelDecl(ast);
    }

    return ast;
  }

  private parseTopLevelDecl(ast: Ast.ShaderAst): void
  {
    const tok = this.peek();

    switch (tok.kind) {
      case TokenKind.RenderMode:
        this.parseRenderMode(ast);
        return;
      case TokenKind.Struct:
        ast.structs.push(this.parseStructDecl());
        return;
      case TokenKind.Uniform:
        ast.uniforms.push(this.parseUniformDecl(null));
        return;
      case TokenKind.Global:
        if (this.peekAt(1).kind === TokenKind.Uniform) {
          ast.uniforms.push(this.parseUniformDecl('global'));
          return;
        }
        break;
      case TokenKind.Instance:
        if (this.peekAt(1).kind === TokenKind.Uniform) {
          ast.uniforms.push(this.parseUniformDecl('instance'));
          return;
        }
        break;
      case TokenKind.Varying:
        ast.varyings.push(this.parseVaryingDecl());
        return;
      case TokenKind.Const:
        if (this.peekAt(1).kind === TokenKind.Spec) {
          ast.specConstants.push(this.parseSpecConstDecl());
        } else {
          ast.constants.push(...this.parseConstDecl());
        }
        return;
      case TokenKind.Buffer:
        ast.buffers.push(this.parseBufferDecl());
        return;
      case TokenKind.GroupUniforms:
        ast.uniforms.push(this.parseUniformGroupDecl() as any);
        return;
      default:
        break;
    }

    // Check if it looks like a function definition: type/void/structname
    if (this.isTypeToken(tok) || this.isPrecisionToken(tok)) {
      ast.functions.push(this.parseFunctionDef());
      return;
    }

    // Error recovery: skip unknown token
    this.error(`unexpected token '${tok.text}' at top level`);
    this.advance();
    this.synchronize(TokenKind.Semicolon, TokenKind.RightBrace);
    if (this.check(TokenKind.Semicolon)) {
      this.advance();
    }
  }

  // -- Declarations -----------------------------------------------------------

  private parseRenderMode(ast: Ast.ShaderAst): void
  {
    this.advance(); // consume 'render_mode'
    const nameTok = this.expect(TokenKind.Identifier, 'expected render mode name');
    ast.renderModes.push(nameTok.text);

    while (this.match(TokenKind.Comma)) {
      const next = this.expect(TokenKind.Identifier, 'expected render mode name');
      ast.renderModes.push(next.text);
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after render_mode');
  }

  private parseStructDecl(): Ast.StructDecl
  {
    const tok = this.advance(); // consume 'struct'
    const nameTok = this.expect(TokenKind.Identifier, 'expected struct name');
    const name = nameTok.text;
    this.structNames.add(name);

    this.expect(TokenKind.LeftBrace, 'expected "{" in struct declaration');
    const members = this.parseStructMembers();
    this.expect(TokenKind.RightBrace, 'expected "}" in struct declaration');
    this.expect(TokenKind.Semicolon, 'expected ";" after struct declaration');

    return new Ast.StructDecl(name, members as any, tok.line, tok.column);
  }

  private parseStructMembers(): Array<{ type: TypeInfo; name: string; arraySize: number | Ast.Expr }>
  {
    const members: Array<{ type: TypeInfo; name: string; arraySize: number | Ast.Expr }> = [];
    while (!this.check(TokenKind.RightBrace) && !this.atEnd()) {
      const type = this.parseTypeSpecifier();
      const nameTok = this.expect(TokenKind.Identifier, 'expected member name');
      let arraySize: number | Ast.Expr = 0;
      if (this.check(TokenKind.LeftBracket)) {
        arraySize = this.parseArraySuffix();
      }
      members.push({ type, name: nameTok.text, arraySize });

      while (this.match(TokenKind.Comma)) {
        const extraName = this.expect(TokenKind.Identifier, 'expected member name');
        let extraArraySize: number | Ast.Expr = 0;
        if (this.check(TokenKind.LeftBracket)) {
          extraArraySize = this.parseArraySuffix();
        }
        members.push({ type, name: extraName.text, arraySize: extraArraySize });
      }

      this.expect(TokenKind.Semicolon, 'expected ";" after struct member');
    }
    return members;
  }

  private parseUniformDecl(scope: string | null): Ast.UniformDecl
  {
    const tok = this.peek();
    // Consume scope keyword if present
    if (scope === 'global' || scope === 'instance') {
      this.advance(); // consume 'global' or 'instance'
    }
    this.advance(); // consume 'uniform'

    const type = this.parseTypeSpecifier();
    // Optional array suffix after type
    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected uniform name');
    const name = nameTok.text;

    // Optional array suffix after name
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    // Optional hints
    let hints: HintResult[] = [];
    if (this.match(TokenKind.Colon)) {
      hints = this.parseHintList();
    }

    // Optional default value
    let defaultValue: Ast.Expr | null = null;
    if (this.match(TokenKind.Assign)) {
      defaultValue = this.parseExpression();
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after uniform declaration');

    return new Ast.UniformDecl(scope, type, name, hints as any, defaultValue, arraySize as any, tok.line, tok.column);
  }

  private parseHintList(): HintResult[]
  {
    const hints: HintResult[] = [];
    hints.push(this.parseHint());
    while (this.match(TokenKind.Comma)) {
      hints.push(this.parseHint());
    }
    return hints;
  }

  private parseHint(): HintResult
  {
    const tok = this.peek();

    if (tok.kind === TokenKind.HintRange) {
      this.advance();
      this.expect(TokenKind.LeftParen, 'expected "(" after hint_range');
      const args: number[] = [];
      args.push(this.parseNumericLiteral());
      this.expect(TokenKind.Comma, 'expected "," in hint_range');
      args.push(this.parseNumericLiteral());
      if (this.match(TokenKind.Comma)) {
        args.push(this.parseNumericLiteral());
      }
      this.expect(TokenKind.RightParen, 'expected ")" after hint_range');
      return { kind: 'hint_range', args };
    }

    if (tok.kind === TokenKind.HintEnum) {
      this.advance();
      this.expect(TokenKind.LeftParen, 'expected "(" after hint_enum');
      const args: string[] = [];
      args.push(this.parseStringLiteral());
      while (this.match(TokenKind.Comma)) {
        args.push(this.parseStringLiteral());
      }
      this.expect(TokenKind.RightParen, 'expected ")" after hint_enum');
      return { kind: 'hint_enum', args };
    }

    if (tok.kind === TokenKind.InstanceIndex) {
      this.advance();
      this.expect(TokenKind.LeftParen, 'expected "(" after instance_index');
      const args: number[] = [];
      args.push(this.parseNumericLiteral());
      this.expect(TokenKind.RightParen, 'expected ")" after instance_index');
      return { kind: 'instance_index', args };
    }

    if (HINT_NAME_KINDS.has(tok.kind)) {
      this.advance();
      return { kind: tok.text, args: [] };
    }

    // Unknown hint -- treat as identifier hint name
    if (tok.kind === TokenKind.Identifier) {
      this.advance();
      return { kind: tok.text, args: [] };
    }

    this.error(`expected uniform hint, got '${tok.text}'`);
    this.advance();
    return { kind: 'unknown', args: [] };
  }

  private parseNumericLiteral(): number
  {
    const tok = this.peek();
    if (tok.kind === TokenKind.FloatLiteral || tok.kind === TokenKind.IntLiteral || tok.kind === TokenKind.UintLiteral) {
      this.advance();
      return parseFloat(tok.text);
    }
    // Handle negative numbers
    if ((tok.kind === TokenKind.Minus || tok.kind === TokenKind.Plus) &&
        (this.peekAt(1).kind === TokenKind.FloatLiteral ||
         this.peekAt(1).kind === TokenKind.IntLiteral ||
         this.peekAt(1).kind === TokenKind.UintLiteral)) {
      const sign = this.advance();
      const num = this.advance();
      const val = parseFloat(num.text);
      return sign.kind === TokenKind.Minus ? -val : val;
    }
    this.error('expected numeric literal');
    return 0;
  }

  private parseStringLiteral(): string
  {
    const tok = this.expect(TokenKind.StringLiteral, 'expected string literal');
    // Strip surrounding quotes
    return tok.text.slice(1, -1);
  }

  private parseVaryingDecl(): Ast.VaryingDecl
  {
    const tok = this.advance(); // consume 'varying'

    let interpolation: string | null = null;
    if (this.isInterpolationToken(this.peek())) {
      interpolation = this.advance().text;
    }

    let precision: string | null = null;
    if (this.isPrecisionToken(this.peek())) {
      precision = this.advance().text;
    }

    const type = this.parseTypeSpecifier();

    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected varying name');
    const name = nameTok.text;

    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after varying declaration');

    return new Ast.VaryingDecl(interpolation, precision, type, name, arraySize as any, tok.line, tok.column);
  }

  private parseConstDecl(): Ast.ConstDecl[]
  {
    const tok = this.advance(); // consume 'const'

    let precision: string | null = null;
    if (this.isPrecisionToken(this.peek())) {
      precision = this.advance().text;
    }

    const type = this.parseTypeSpecifier();

    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected const name');
    const name = nameTok.text;

    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    this.expect(TokenKind.Assign, 'expected "=" in const declaration');
    const initializer = this.parseExpression();

    const decls: Ast.ConstDecl[] = [new Ast.ConstDecl(precision, type, name, initializer, arraySize as any, tok.line, tok.column)];

    while (this.match(TokenKind.Comma)) {
      const extraName = this.expect(TokenKind.Identifier, 'expected const name');
      let extraArraySize: number | Ast.Expr = 0;
      if (this.check(TokenKind.LeftBracket)) {
        extraArraySize = this.parseArraySuffix();
      }
      this.expect(TokenKind.Assign, 'expected "=" in const declaration');
      const extraInit = this.parseExpression();
      decls.push(new Ast.ConstDecl(precision, type, extraName.text, extraInit, extraArraySize as any, extraName.line, extraName.column));
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after const declaration');

    return decls;
  }

  private parseSpecConstDecl(): Ast.SpecConstDecl
  {
    const tok = this.advance(); // consume 'const'
    this.advance(); // consume 'spec'

    const type = this.parseTypeSpecifier();

    const nameTok = this.expect(TokenKind.Identifier, 'expected spec const name');
    const name = nameTok.text;

    let hints: HintResult[] = [];
    if (this.match(TokenKind.Colon)) {
      hints = this.parseHintList();
    }

    this.expect(TokenKind.Assign, 'expected "=" in spec const declaration');
    const defaultValue = this.parseExpression();

    this.expect(TokenKind.Semicolon, 'expected ";" after spec const declaration');

    return new Ast.SpecConstDecl(type, name, hints as any, defaultValue, tok.line, tok.column);
  }

  private parseBufferDecl(): Ast.BufferDecl
  {
    const tok = this.advance(); // consume 'buffer'

    const nameTok = this.expect(TokenKind.Identifier, 'expected buffer name');
    const name = nameTok.text;

    const qualifiers: string[] = [];
    if (this.match(TokenKind.Colon)) {
      while (BUFFER_QUALIFIER_KINDS.has(this.peek().kind)) {
        qualifiers.push(this.advance().text);
        if (!this.match(TokenKind.Comma)) break;
      }
    }

    this.expect(TokenKind.LeftBrace, 'expected "{" in buffer declaration');
    const members = this.parseStructMembers();
    this.expect(TokenKind.RightBrace, 'expected "}" in buffer declaration');
    this.expect(TokenKind.Semicolon, 'expected ";" after buffer declaration');

    return new Ast.BufferDecl(name, qualifiers, members as any, tok.line, tok.column);
  }

  private parseUniformGroupDecl(): Ast.UniformGroupDecl
  {
    const tok = this.advance(); // consume 'group_uniforms'

    let name: string | null = null;
    let subgroup: string | null = null;

    if (this.check(TokenKind.Identifier)) {
      name = this.advance().text;
      if (this.match(TokenKind.Dot)) {
        subgroup = this.expect(TokenKind.Identifier, 'expected subgroup name').text;
      }
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after group_uniforms');

    return new Ast.UniformGroupDecl(name as any, subgroup, tok.line, tok.column);
  }

  private parseFunctionDef(): Ast.FunctionDef
  {
    const tok = this.peek();

    // Optional precision qualifier
    if (this.isPrecisionToken(this.peek())) {
      this.advance();
    }

    const returnType = this.parseTypeSpecifier();

    // Optional array suffix on return type
    if (this.check(TokenKind.LeftBracket)) {
      returnType.arraySize = this.parseArraySuffix() as number;
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected function name');
    const name = nameTok.text;

    this.expect(TokenKind.LeftParen, 'expected "(" after function name');
    const params = this.parseParamList();
    this.expect(TokenKind.RightParen, 'expected ")" after parameters');

    const body = this.parseBlock();

    return new Ast.FunctionDef(returnType, name, params, body, tok.line, tok.column);
  }

  private parseParamList(): Ast.ParamDecl[]
  {
    const params: Ast.ParamDecl[] = [];
    if (this.check(TokenKind.RightParen)) return params;

    params.push(this.parseParam());
    while (this.match(TokenKind.Comma)) {
      params.push(this.parseParam());
    }
    return params;
  }

  private parseParam(): Ast.ParamDecl
  {
    const tok = this.peek();
    let qualifier: string | null = null;
    let isConst = false;

    // Optional const, then optional qualifier: in, out, inout
    if (this.check(TokenKind.Const)) {
      isConst = true;
      this.advance();
    }
    if (this.check(TokenKind.In) || this.check(TokenKind.Out) || this.check(TokenKind.Inout)) {
      qualifier = this.advance().text;
    }

    let precision: string | null = null;
    if (this.isPrecisionToken(this.peek())) {
      precision = this.advance().text;
    }

    const type = this.parseTypeSpecifier();

    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected parameter name');
    const name = nameTok.text;

    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    return new Ast.ParamDecl(qualifier, isConst, precision, type, name, arraySize as any, tok.line, tok.column);
  }

  // -- Type parsing -----------------------------------------------------------

  private parseTypeSpecifier(): TypeInfo
  {
    if (this.isPrecisionToken(this.peek())) {
      this.advance();
    }

    const tok = this.peek();

    // Builtin type keyword
    const dt = typeFromTokenKind(tok.kind);
    if (dt !== null) {
      this.advance();
      return new TypeInfo(dt);
    }

    // Struct name
    if (tok.kind === TokenKind.Identifier && this.structNames.has(tok.text)) {
      this.advance();
      return new TypeInfo(DataType.Struct, { structName: tok.text });
    }

    this.error(`expected type, got '${tok.text}'`);
    this.advance();
    return new TypeInfo(DataType.Void);
  }

  private parseArraySuffix(): number | Ast.Expr
  {
    this.advance(); // consume '['
    if (this.match(TokenKind.RightBracket)) {
      // Unsized array
      return -1;
    }
    const sizeExpr = this.parseExpression();
    this.expect(TokenKind.RightBracket, 'expected "]"');
    return sizeExpr;
  }

  // -- Statements -------------------------------------------------------------

  private parseStatement(): Ast.Stmt | Ast.Stmt[]
  {
    const tok = this.peek();

    switch (tok.kind) {
      case TokenKind.LeftBrace:
        return this.parseBlock();
      case TokenKind.If:
        return this.parseIfStmt();
      case TokenKind.For:
        return this.parseForStmt();
      case TokenKind.While:
        return this.parseWhileStmt();
      case TokenKind.Do:
        return this.parseDoWhileStmt();
      case TokenKind.Switch:
        return this.parseSwitchStmt();
      case TokenKind.Return:
        return this.parseReturnStmt();
      case TokenKind.Break: {
        this.advance();
        this.expect(TokenKind.Semicolon, 'expected ";" after break');
        return new Ast.BreakStmt(tok.line, tok.column);
      }
      case TokenKind.Continue: {
        this.advance();
        this.expect(TokenKind.Semicolon, 'expected ";" after continue');
        return new Ast.ContinueStmt(tok.line, tok.column);
      }
      case TokenKind.Discard: {
        this.advance();
        this.expect(TokenKind.Semicolon, 'expected ";" after discard');
        return new Ast.DiscardStmt(tok.line, tok.column);
      }
      case TokenKind.Semicolon: {
        this.advance();
        return new Ast.EmptyStmt(tok.line, tok.column);
      }
      case TokenKind.Const:
        return this.parseLocalConstDecl();
      default:
        break;
    }

    // Check if this is a variable declaration (type followed by identifier)
    if (this.isTypeToken(tok) && tok.kind !== TokenKind.Void) {
      // Look ahead: skip past precision, type, possible array suffix, and check for identifier
      if (this.looksLikeVarDecl()) {
        return this.parseVarDeclStmt();
      }
    }

    // If it's a bare identifier not followed by anything that makes it a valid
    // expression statement (assignment, call, etc.), report at the identifier.
    if (tok.kind === TokenKind.Identifier) {
      const next = this.peekAt(1);
      if (next.kind === TokenKind.RightBrace || next.kind === TokenKind.Eof) {
        this.error(`unexpected identifier '${tok.text}'`);
        this.advance();
        return new Ast.EmptyStmt(tok.line, tok.column);
      }
    }

    return this.parseExpressionStmt();
  }

  // Heuristic: does the current position look like a variable declaration?
  // A var decl starts with [precision] type [array_suffix] IDENTIFIER
  private looksLikeVarDecl(): boolean
  {
    let offset = 0;
    // Optional precision
    if (this.isPrecisionToken(this.peekAt(offset))) {
      offset++;
    }
    // Type token
    const typeTok = this.peekAt(offset);
    if (!this.isTypeToken(typeTok)) return false;
    offset++;
    // Optional array suffix: [ ... ]
    if (this.peekAt(offset).kind === TokenKind.LeftBracket) {
      // Find matching ]
      offset++;
      let depth = 1;
      while (depth > 0 && this.peekAt(offset).kind !== TokenKind.Eof) {
        if (this.peekAt(offset).kind === TokenKind.LeftBracket) depth++;
        if (this.peekAt(offset).kind === TokenKind.RightBracket) depth--;
        offset++;
      }
    }
    // Now we should see an identifier
    return this.peekAt(offset).kind === TokenKind.Identifier;
  }

  private parseBlock(): Ast.BlockStmt
  {
    const tok = this.expect(TokenKind.LeftBrace, 'expected "{"');
    const statements: Ast.Stmt[] = [];
    while (!this.check(TokenKind.RightBrace) && !this.atEnd()) {
      const result = this.parseStatement();
      if (Array.isArray(result)) {
        statements.push(...result);
      } else {
        statements.push(result);
      }
    }
    this.expect(TokenKind.RightBrace, 'expected "}"');
    return new Ast.BlockStmt(statements, tok.line, tok.column);
  }

  private parseIfStmt(): Ast.IfStmt
  {
    const tok = this.advance(); // consume 'if'
    this.expect(TokenKind.LeftParen, 'expected "(" after if');
    const condition = this.parseExpression();
    this.expect(TokenKind.RightParen, 'expected ")" after if condition');
    const thenBranch = this.parseStatement() as Ast.Stmt;
    let elseBranch: Ast.Stmt | null = null;
    if (this.match(TokenKind.Else)) {
      elseBranch = this.parseStatement() as Ast.Stmt;
    }
    return new Ast.IfStmt(condition, thenBranch, elseBranch, tok.line, tok.column);
  }

  private parseForStmt(): Ast.ForStmt
  {
    const tok = this.advance(); // consume 'for'
    this.expect(TokenKind.LeftParen, 'expected "(" after for');

    // Init: variable declaration, expression, or empty
    let init: Ast.Stmt | null = null;
    if (!this.check(TokenKind.Semicolon)) {
      if (this.looksLikeVarDecl()) {
        init = this.parseVarDeclStmt() as any;
      } else {
        const expr = this.parseExpression();
        init = new Ast.ExpressionStmt(expr, expr.line, expr.column);
        this.expect(TokenKind.Semicolon, 'expected ";" after for-loop init expression');
      }
    } else {
      this.advance(); // consume ';'
    }

    // Condition
    let condition: Ast.Expr | null = null;
    if (!this.check(TokenKind.Semicolon)) {
      condition = this.parseExpression();
    }
    this.expect(TokenKind.Semicolon, 'expected ";" after for condition');

    // Increment
    let increment: Ast.Expr | null = null;
    if (!this.check(TokenKind.RightParen)) {
      increment = this.parseExpression();
    }
    this.expect(TokenKind.RightParen, 'expected ")" after for clauses');

    const body = this.parseStatement() as Ast.Stmt;

    return new Ast.ForStmt(init, condition, increment, body, tok.line, tok.column);
  }

  private parseWhileStmt(): Ast.WhileStmt
  {
    const tok = this.advance(); // consume 'while'
    this.expect(TokenKind.LeftParen, 'expected "(" after while');
    const condition = this.parseExpression();
    this.expect(TokenKind.RightParen, 'expected ")" after while condition');
    const body = this.parseStatement() as Ast.Stmt;
    return new Ast.WhileStmt(condition, body, tok.line, tok.column);
  }

  private parseDoWhileStmt(): Ast.DoWhileStmt
  {
    const tok = this.advance(); // consume 'do'
    const body = this.parseStatement() as Ast.Stmt;
    this.expect(TokenKind.While, 'expected "while" after do body');
    this.expect(TokenKind.LeftParen, 'expected "(" after while');
    const condition = this.parseExpression();
    this.expect(TokenKind.RightParen, 'expected ")" after while condition');
    this.expect(TokenKind.Semicolon, 'expected ";" after do-while');
    return new Ast.DoWhileStmt(body, condition, tok.line, tok.column);
  }

  private parseSwitchStmt(): Ast.SwitchStmt
  {
    const tok = this.advance(); // consume 'switch'
    this.expect(TokenKind.LeftParen, 'expected "(" after switch');
    const expression = this.parseExpression();
    this.expect(TokenKind.RightParen, 'expected ")" after switch expression');
    this.expect(TokenKind.LeftBrace, 'expected "{" in switch');

    const cases: Ast.CaseClause[] = [];
    while (!this.check(TokenKind.RightBrace) && !this.atEnd()) {
      cases.push(this.parseCaseClause());
    }

    this.expect(TokenKind.RightBrace, 'expected "}" after switch');
    return new Ast.SwitchStmt(expression, cases, tok.line, tok.column);
  }

  private parseCaseClause(): Ast.CaseClause
  {
    const tok = this.peek();
    let expression: Ast.Expr | null = null;

    if (this.match(TokenKind.Case)) {
      expression = this.parseExpression();
    } else if (this.match(TokenKind.Default)) {
      // default case: expression stays null
    } else {
      this.error('expected "case" or "default"');
      this.advance();
      return new Ast.CaseClause(null, [], tok.line, tok.column);
    }

    this.expect(TokenKind.Colon, 'expected ":" after case');

    const statements: Ast.Stmt[] = [];
    while (!this.check(TokenKind.Case) && !this.check(TokenKind.Default) &&
           !this.check(TokenKind.RightBrace) && !this.atEnd()) {
      const result = this.parseStatement();
      if (Array.isArray(result)) {
        statements.push(...result);
      } else {
        statements.push(result);
      }
    }

    return new Ast.CaseClause(expression, statements, tok.line, tok.column);
  }

  private parseReturnStmt(): Ast.ReturnStmt
  {
    const tok = this.advance(); // consume 'return'
    let expression: Ast.Expr | null = null;
    if (!this.check(TokenKind.Semicolon)) {
      expression = this.parseExpression();
    }
    this.expect(TokenKind.Semicolon, 'expected ";" after return');
    return new Ast.ReturnStmt(expression, tok.line, tok.column);
  }

  private parseLocalConstDecl(): Ast.LocalConstDecl[]
  {
    const tok = this.advance(); // consume 'const'

    let precision: string | null = null;
    if (this.isPrecisionToken(this.peek())) {
      precision = this.advance().text;
    }

    const type = this.parseTypeSpecifier();

    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected variable name');
    const name = nameTok.text;

    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    this.expect(TokenKind.Assign, 'expected "=" in const declaration');
    const initializer = this.parseExpression();

    const decls: Ast.LocalConstDecl[] = [new Ast.LocalConstDecl(precision, type, name, initializer, arraySize as any, tok.line, tok.column)];

    while (this.match(TokenKind.Comma)) {
      const extraName = this.expect(TokenKind.Identifier, 'expected variable name');
      let extraArraySize: number | Ast.Expr = 0;
      if (this.check(TokenKind.LeftBracket)) {
        extraArraySize = this.parseArraySuffix();
      }
      this.expect(TokenKind.Assign, 'expected "=" in const declaration');
      const extraInit = this.parseExpression();
      decls.push(new Ast.LocalConstDecl(precision, type, extraName.text, extraInit, extraArraySize as any, extraName.line, extraName.column));
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after const declaration');

    return decls;
  }

  private parseVarDeclStmt(): Ast.VarDeclStmt[]
  {
    const tok = this.peek();

    // Optional precision
    if (this.isPrecisionToken(this.peek())) {
      this.advance();
    }

    const type = this.parseTypeSpecifier();

    // Array suffix after type
    let arraySize: number | Ast.Expr = 0;
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    const nameTok = this.expect(TokenKind.Identifier, 'expected variable name');
    const name = nameTok.text;

    // Array suffix after name
    if (this.check(TokenKind.LeftBracket)) {
      arraySize = this.parseArraySuffix();
    }

    let initializer: Ast.Expr | null = null;
    if (this.match(TokenKind.Assign)) {
      initializer = this.parseExpression();
    }

    const decls: Ast.VarDeclStmt[] = [new Ast.VarDeclStmt(type, name, initializer, arraySize as any, tok.line, tok.column)];

    while (this.match(TokenKind.Comma)) {
      const extraName = this.expect(TokenKind.Identifier, 'expected variable name');
      let extraArraySize: number | Ast.Expr = 0;
      if (this.check(TokenKind.LeftBracket)) {
        extraArraySize = this.parseArraySuffix();
      }
      let extraInit: Ast.Expr | null = null;
      if (this.match(TokenKind.Assign)) {
        extraInit = this.parseExpression();
      }
      decls.push(new Ast.VarDeclStmt(type, extraName.text, extraInit, extraArraySize as any, extraName.line, extraName.column));
    }

    this.expect(TokenKind.Semicolon, 'expected ";" after variable declaration');

    return decls;
  }

  private parseExpressionStmt(): Ast.ExpressionStmt
  {
    const tok = this.peek();
    const expr = this.parseExpression();
    this.expect(TokenKind.Semicolon, 'expected ";"');
    return new Ast.ExpressionStmt(expr, tok.line, tok.column);
  }

  // -- Expressions (precedence climbing) --------------------------------------

  private parseExpression(): Ast.Expr
  {
    return this.parseAssignment();
  }

  private parseAssignment(): Ast.Expr
  {
    const left = this.parseTernary();

    if (ASSIGN_OPS.has(this.peek().kind)) {
      const op = this.advance();
      const right = this.parseAssignment(); // right-associative
      return new Ast.AssignExpr(op.text, left, right, op.line, op.column);
    }

    return left;
  }

  private parseTernary(): Ast.Expr
  {
    let expr = this.parseLogicalOr();

    if (this.match(TokenKind.Question)) {
      const trueExpr = this.parseExpression();
      this.expect(TokenKind.Colon, 'expected ":" in ternary');
      const falseExpr = this.parseExpression();
      return new Ast.TernaryExpr(expr, trueExpr, falseExpr, expr.line, expr.column);
    }

    return expr;
  }

  private parseLogicalOr(): Ast.Expr
  {
    let left = this.parseLogicalAnd();
    while (this.check(TokenKind.PipePipe)) {
      const op = this.advance();
      const right = this.parseLogicalAnd();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseLogicalAnd(): Ast.Expr
  {
    let left = this.parseBitwiseOr();
    while (this.check(TokenKind.AmpAmp)) {
      const op = this.advance();
      const right = this.parseBitwiseOr();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseBitwiseOr(): Ast.Expr
  {
    let left = this.parseBitwiseXor();
    while (this.check(TokenKind.Pipe)) {
      const op = this.advance();
      const right = this.parseBitwiseXor();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseBitwiseXor(): Ast.Expr
  {
    let left = this.parseBitwiseAnd();
    while (this.check(TokenKind.Caret)) {
      const op = this.advance();
      const right = this.parseBitwiseAnd();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseBitwiseAnd(): Ast.Expr
  {
    let left = this.parseEquality();
    while (this.check(TokenKind.Amp)) {
      const op = this.advance();
      const right = this.parseEquality();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseEquality(): Ast.Expr
  {
    let left = this.parseRelational();
    while (this.check(TokenKind.EqualEqual) || this.check(TokenKind.BangEqual)) {
      const op = this.advance();
      const right = this.parseRelational();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseRelational(): Ast.Expr
  {
    let left = this.parseShift();
    while (this.check(TokenKind.Less) || this.check(TokenKind.Greater) ||
           this.check(TokenKind.LessEqual) || this.check(TokenKind.GreaterEqual)) {
      const op = this.advance();
      const right = this.parseShift();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseShift(): Ast.Expr
  {
    let left = this.parseAdditive();
    while (this.check(TokenKind.LeftShift) || this.check(TokenKind.RightShift)) {
      const op = this.advance();
      const right = this.parseAdditive();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseAdditive(): Ast.Expr
  {
    let left = this.parseMultiplicative();
    while (this.check(TokenKind.Plus) || this.check(TokenKind.Minus)) {
      const op = this.advance();
      const right = this.parseMultiplicative();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseMultiplicative(): Ast.Expr
  {
    let left = this.parseUnary();
    while (this.check(TokenKind.Star) || this.check(TokenKind.Slash) || this.check(TokenKind.Percent)) {
      const op = this.advance();
      const right = this.parseUnary();
      left = new Ast.BinaryExpr(op.text, left, right, op.line, op.column);
    }
    return left;
  }

  private parseUnary(): Ast.Expr
  {
    if (this.check(TokenKind.Minus) || this.check(TokenKind.Plus) ||
        this.check(TokenKind.Bang) || this.check(TokenKind.Tilde)) {
      const op = this.advance();
      const operand = this.parseUnary();
      return new Ast.UnaryExpr(op.text, operand, true, op.line, op.column);
    }

    if (this.check(TokenKind.PlusPlus) || this.check(TokenKind.MinusMinus)) {
      const op = this.advance();
      const operand = this.parseUnary();
      return new Ast.UnaryExpr(op.text, operand, true, op.line, op.column);
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Ast.Expr
  {
    let expr = this.parsePrimary();

    while (true) {
      if (this.check(TokenKind.Dot)) {
        this.advance(); // consume '.'
        const memberTok = this.expect(TokenKind.Identifier, 'expected member name after "."');
        // Check for method call: .ident(args)
        if (this.check(TokenKind.LeftParen)) {
          this.advance(); // consume '('
          const args = this.parseArgList();
          this.expect(TokenKind.RightParen, 'expected ")" after method arguments');
          expr = new Ast.MethodCallExpr(expr, memberTok.text, args, memberTok.line, memberTok.column);
        } else {
          expr = new Ast.MemberAccessExpr(expr, memberTok.text, memberTok.line, memberTok.column);
        }
      } else if (this.check(TokenKind.LeftBracket)) {
        const bracketTok = this.advance(); // consume '['
        const index = this.parseExpression();
        this.expect(TokenKind.RightBracket, 'expected "]"');
        expr = new Ast.IndexExpr(expr, index, bracketTok.line, bracketTok.column);
      } else if (this.check(TokenKind.PlusPlus)) {
        const op = this.advance();
        expr = new Ast.PostfixExpr(expr, op.text, op.line, op.column);
      } else if (this.check(TokenKind.MinusMinus)) {
        const op = this.advance();
        expr = new Ast.PostfixExpr(expr, op.text, op.line, op.column);
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Ast.Expr
  {
    const tok = this.peek();

    // Grouped expression
    if (this.check(TokenKind.LeftParen)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenKind.RightParen, 'expected ")"');
      return expr;
    }

    // Integer literal
    if (this.check(TokenKind.IntLiteral)) {
      this.advance();
      return new Ast.LiteralExpr(this.parseIntValue(tok.text), DataType.Int, tok.line, tok.column);
    }

    // Uint literal
    if (this.check(TokenKind.UintLiteral)) {
      this.advance();
      return new Ast.LiteralExpr(this.parseUintValue(tok.text), DataType.Uint, tok.line, tok.column);
    }

    // Float literal
    if (this.check(TokenKind.FloatLiteral)) {
      this.advance();
      return new Ast.LiteralExpr(parseFloat(tok.text), DataType.Float, tok.line, tok.column);
    }

    // Boolean literals
    if (this.check(TokenKind.True)) {
      this.advance();
      return new Ast.LiteralExpr(true, DataType.Bool, tok.line, tok.column);
    }
    if (this.check(TokenKind.False)) {
      this.advance();
      return new Ast.LiteralExpr(false, DataType.Bool, tok.line, tok.column);
    }

    // String literal
    if (this.check(TokenKind.StringLiteral)) {
      this.advance();
      return new Ast.LiteralExpr(tok.text, DataType.Void, tok.line, tok.column);
    }

    // Type keyword -> TypeConstructExpr or ArrayConstructExpr
    if (TYPE_TOKEN_KINDS.has(tok.kind)) {
      const dt = typeFromTokenKind(tok.kind);
      this.advance();

      // type[N](...) -> ArrayConstructExpr
      if (this.check(TokenKind.LeftBracket)) {
        return this.parseArrayConstruct(new TypeInfo(dt!), tok);
      }

      // type(...) -> TypeConstructExpr
      if (this.check(TokenKind.LeftParen)) {
        this.advance();
        const args = this.parseArgList();
        this.expect(TokenKind.RightParen, 'expected ")" after type constructor arguments');
        return new Ast.TypeConstructExpr(new TypeInfo(dt!), args, tok.line, tok.column);
      }

      // Bare type keyword in expression context -- treat as identifier for error recovery
      return new Ast.IdentifierExpr(tok.text, tok.line, tok.column);
    }

    // Identifier -> FunctionCallExpr, ArrayConstructExpr, or IdentifierExpr
    if (this.check(TokenKind.Identifier)) {
      this.advance();

      // identifier(args) -> FunctionCallExpr (struct constructors also use this)
      if (this.check(TokenKind.LeftParen)) {
        this.advance();
        const args = this.parseArgList();
        this.expect(TokenKind.RightParen, 'expected ")" after function arguments');
        return new Ast.FunctionCallExpr(tok.text, args, tok.line, tok.column);
      }

      // identifier[N](...) -> ArrayConstructExpr
      if (this.check(TokenKind.LeftBracket)) {
        // Peek ahead to see if this is array_type(args) or just array indexing
        // Array construct: IDENT [ expr ] ( args )
        // Array index: IDENT [ expr ] (not followed by '(')
        // We need to look ahead past the bracket to distinguish
        const savedPos = this.pos;
        this.advance(); // consume '['
        if (this.check(TokenKind.RightBracket)) {
          // IDENT[](...) -- unsized array constructor
          this.advance(); // consume ']'
          if (this.check(TokenKind.LeftParen)) {
            this.advance();
            const args = this.parseArgList();
            this.expect(TokenKind.RightParen, 'expected ")"');
            const elementType = this.structNames.has(tok.text)
              ? new TypeInfo(DataType.Struct, { structName: tok.text })
              : new TypeInfo(DataType.Void);
            return new Ast.ArrayConstructExpr(elementType, -1, args, tok.line, tok.column);
          }
          // Not an array constructor -- restore and fall through to index
          this.pos = savedPos;
        } else {
          // IDENT[expr](...) or IDENT[expr] (index)
          // Try to parse the expression and see if ')' '(' follows
          const sizeExpr = this.parseExpression();
          this.expect(TokenKind.RightBracket, 'expected "]"');
          if (this.check(TokenKind.LeftParen)) {
            // Array constructor
            this.advance();
            const args = this.parseArgList();
            this.expect(TokenKind.RightParen, 'expected ")"');
            const elementType = this.structNames.has(tok.text)
              ? new TypeInfo(DataType.Struct, { structName: tok.text })
              : new TypeInfo(DataType.Void);
            return new Ast.ArrayConstructExpr(elementType, sizeExpr as any, args, tok.line, tok.column);
          }
          // Regular index expression
          const ident = new Ast.IdentifierExpr(tok.text, tok.line, tok.column);
          return new Ast.IndexExpr(ident, sizeExpr, tok.line, tok.column);
        }
      }

      return new Ast.IdentifierExpr(tok.text, tok.line, tok.column);
    }

    // Brace initializer
    if (this.check(TokenKind.LeftBrace)) {
      return this.parseBraceInit();
    }

    // Error
    this.error(`unexpected token '${tok.text}' in expression`);
    this.advance();
    return new Ast.LiteralExpr(0, DataType.Int, tok.line, tok.column);
  }

  private parseArrayConstruct(dt: TypeInfo, tok: Token): Ast.ArrayConstructExpr
  {
    this.advance(); // consume '['
    let size: number | Ast.Expr = -1;
    if (!this.check(TokenKind.RightBracket)) {
      size = this.parseExpression();
    }
    this.expect(TokenKind.RightBracket, 'expected "]"');
    this.expect(TokenKind.LeftParen, 'expected "(" after array type');
    const args = this.parseArgList();
    this.expect(TokenKind.RightParen, 'expected ")" after array constructor arguments');
    return new Ast.ArrayConstructExpr(dt, size as any, args, tok.line, tok.column);
  }

  private parseBraceInit(): Ast.BraceInitExpr
  {
    const tok = this.advance(); // consume '{'
    const elements: Ast.Expr[] = [];
    if (!this.check(TokenKind.RightBrace)) {
      elements.push(this.parseExpression());
      while (this.match(TokenKind.Comma)) {
        if (this.check(TokenKind.RightBrace)) break; // trailing comma
        elements.push(this.parseExpression());
      }
    }
    this.expect(TokenKind.RightBrace, 'expected "}" in brace initializer');
    return new Ast.BraceInitExpr(elements, tok.line, tok.column);
  }

  private parseArgList(): Ast.Expr[]
  {
    const args: Ast.Expr[] = [];
    if (this.check(TokenKind.RightParen)) return args;

    args.push(this.parseExpression());
    while (this.match(TokenKind.Comma)) {
      args.push(this.parseExpression());
    }
    return args;
  }

  // -- Numeric parsing helpers ------------------------------------------------

  private parseIntValue(text: string): number
  {
    if (text.startsWith('0x') || text.startsWith('0X')) {
      return parseInt(text, 16);
    }
    return parseInt(text, 10);
  }

  private parseUintValue(text: string): number
  {
    // Strip trailing 'u' or 'U'
    const stripped = text.replace(/[uU]$/, '');
    if (stripped.startsWith('0x') || stripped.startsWith('0X')) {
      return parseInt(stripped, 16);
    }
    return parseInt(stripped, 10);
  }
}
