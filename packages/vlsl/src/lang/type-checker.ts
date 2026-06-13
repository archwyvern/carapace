import { DataType, TypeInfo, isScalar, isVector, isMatrix,
         scalarComponentOf, vectorComponentCount, matrixDimensions } from './types.js';
import type { DataTypeValue } from './types.js';
import { Diagnostic } from './diagnostic.js';
import { getBuiltinVariables, getBuiltinFunctions, ShaderStage } from './builtins.js';
import { getLibrarySignatures } from './library-registry.js';
import * as Ast from './ast.js';

// Maps from scalar type to the corresponding vector types by component count.
const VECTOR_TYPE_MAP = new Map<string, DataTypeValue>([
  [`${DataType.Float}_2`, DataType.Vec2],
  [`${DataType.Float}_3`, DataType.Vec3],
  [`${DataType.Float}_4`, DataType.Vec4],
  [`${DataType.Int}_2`, DataType.Ivec2],
  [`${DataType.Int}_3`, DataType.Ivec3],
  [`${DataType.Int}_4`, DataType.Ivec4],
  [`${DataType.Uint}_2`, DataType.Uvec2],
  [`${DataType.Uint}_3`, DataType.Uvec3],
  [`${DataType.Uint}_4`, DataType.Uvec4],
  [`${DataType.Bool}_2`, DataType.Bvec2],
  [`${DataType.Bool}_3`, DataType.Bvec3],
  [`${DataType.Bool}_4`, DataType.Bvec4],
]);

function vectorTypeFor(scalarType: DataTypeValue, count: number): DataTypeValue | null {
  if (count === 1) return scalarType;
  return VECTOR_TYPE_MAP.get(`${scalarType}_${count}`) ?? null;
}

type ShaderStageValue = typeof ShaderStage[keyof typeof ShaderStage];

const ENTRY_POINT_STAGES = new Map<string, ShaderStageValue>([
  ['vertex', ShaderStage.Vertex],
  ['fragment', ShaderStage.Fragment],
  ['light', ShaderStage.Light],
  ['start', ShaderStage.ParticleStart],
  ['process', ShaderStage.ParticleProcess],
]);

const POSITION_SET = new Set(['x', 'y', 'z', 'w']);
const COLOR_SET = new Set(['r', 'g', 'b', 'a']);

function isNumeric(dt: DataTypeValue): boolean {
  return dt === DataType.Float || dt === DataType.Int || dt === DataType.Uint;
}

function isIntOrUint(dt: DataTypeValue): boolean {
  return dt === DataType.Int || dt === DataType.Uint;
}

function isIntOrUintVec(dt: DataTypeValue): boolean {
  return isIntOrUint(dt) ||
    dt === DataType.Ivec2 || dt === DataType.Ivec3 || dt === DataType.Ivec4 ||
    dt === DataType.Uvec2 || dt === DataType.Uvec3 || dt === DataType.Uvec4;
}

// Returns true if `from` can be promoted to `to` (implicit promotion).
// Spec 4.7: promotions are int->float, uint->float only.
function canPromote(from: DataTypeValue, to: DataTypeValue): boolean {
  if (from === to) return true;
  // int -> float, uint -> float
  if ((from === DataType.Int || from === DataType.Uint) && to === DataType.Float) return true;
  return false;
}

// Returns true if `from` can be converted to `to` (weaker than promotion).
// Spec 4.7: conversions are int->uint, uint->int.
function canConvert(from: DataTypeValue, to: DataTypeValue): boolean {
  if (canPromote(from, to)) return true;
  // int <-> uint (conversion, not promotion)
  if (from === DataType.Int && to === DataType.Uint) return true;
  if (from === DataType.Uint && to === DataType.Int) return true;
  return false;
}

interface BuiltinVar {
  type: DataTypeValue;
  access: string;
}

interface StructInfo {
  members: { name: string; type: TypeInfo }[];
}

interface UserFunction {
  name: string;
  returnType: TypeInfo;
  params: TypeInfo[];
}

interface FunctionOverload {
  returnType: DataTypeValue;
  params: DataTypeValue[];
  stages: ShaderStageValue[] | null;
}

interface OverloadCandidate {
  returnType: DataTypeValue;
  params: DataTypeValue[];
  stages: ShaderStageValue[] | null;
  source: string;
}

export class TypeChecker
{
  private ast: Ast.ShaderAst;
  private libraries: Set<string>;
  diagnostics: Diagnostic[];
  private scopes: Map<string, TypeInfo>[];
  private userFunctions: UserFunction[];
  private structs: Map<string, StructInfo>;
  private currentStage: ShaderStageValue | null;
  private currentReturnType: TypeInfo | null;
  private builtinVars: Map<string, BuiltinVar> | null;
  private builtinFns: Map<string, FunctionOverload[]>;
  private uniforms: Map<string, TypeInfo>;
  private varyings: Map<string, TypeInfo>;
  private constants: Map<string, TypeInfo>;

  constructor(ast: Ast.ShaderAst, libraries: Set<string> = new Set())
  {
    this.ast = ast;
    this.libraries = libraries;
    this.diagnostics = [];
    this.scopes = [];
    this.userFunctions = [];
    this.structs = new Map();
    this.currentStage = null;
    this.currentReturnType = null;
    this.builtinVars = null;
    // Clone the singleton so library merges don't mutate the cached builtins.
    this.builtinFns = new Map(
      Array.from(getBuiltinFunctions(), ([k, v]: [string, FunctionOverload[]]) => [k, [...v]])
    );
    this.uniforms = new Map();
    this.varyings = new Map();
    this.constants = new Map();
  }

  check(): { diagnostics: Diagnostic[] }
  {
    this.registerLibraries();
    this.registerStructs();
    this.registerTopLevel();
    this.registerUserFunctions();
    this.checkFunctions();
    return { diagnostics: this.diagnostics };
  }

  // -- Phase 0: register library functions ------------------------------------

  private registerLibraries(): void
  {
    for (const lib of this.libraries) {
      const libFns = getLibrarySignatures(lib) as Map<string, FunctionOverload[]> | null;
      if (libFns) {
        for (const [name, overloads] of libFns) {
          if (this.builtinFns.has(name)) {
            this.builtinFns.get(name)!.push(...overloads);
          } else {
            this.builtinFns.set(name, [...overloads]);
          }
        }
      }
    }
  }

  // -- Diagnostics ------------------------------------------------------------

  private error(message: string, line: number = 0, column: number = 0): void
  {
    this.diagnostics.push(Diagnostic.error(message, line, column));
  }

  // -- Scope management -------------------------------------------------------

  private pushScope(): void
  {
    this.scopes.push(new Map());
  }

  private popScope(): void
  {
    this.scopes.pop();
  }

  private declare(name: string, typeInfo: TypeInfo): void
  {
    if (this.scopes.length === 0) return;
    this.scopes[this.scopes.length - 1].set(name, typeInfo);
  }

  private lookup(name: string): TypeInfo | BuiltinVar | null
  {
    // Search scopes from top to bottom.
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name)!;
      }
    }
    // Check uniforms, varyings, constants.
    if (this.uniforms.has(name)) return this.uniforms.get(name)!;
    if (this.varyings.has(name)) return this.varyings.get(name)!;
    if (this.constants.has(name)) return this.constants.get(name)!;
    // Check builtin variables.
    if (this.builtinVars && this.builtinVars.has(name)) {
      const bv = this.builtinVars.get(name)!;
      return new TypeInfo(bv.type);
    }
    return null;
  }

  // -- Phase 1: register structs ---------------------------------------------

  private registerStructs(): void
  {
    for (const s of this.ast.structs) {
      const members = s.members.map(m => ({
        name: m.name,
        type: m.type,
      }));
      this.structs.set(s.name, { members });
    }
  }

  // -- Phase 2: register top-level declarations ------------------------------

  private registerTopLevel(): void
  {
    for (const u of this.ast.uniforms) {
      this.uniforms.set(u.name, u.type);
    }
    for (const v of this.ast.varyings) {
      this.varyings.set(v.name, v.type);
    }
    for (const c of this.ast.constants) {
      this.constants.set(c.name, c.type);
    }
  }

  // -- Phase 3: register user functions --------------------------------------

  private registerUserFunctions(): void
  {
    for (const fn of this.ast.functions) {
      this.userFunctions.push({
        name: fn.name,
        returnType: fn.returnType,
        params: fn.params.map(p => p.type),
      });
    }
  }

  // -- Phase 4: check functions ----------------------------------------------

  private checkFunctions(): void
  {
    for (const fn of this.ast.functions) {
      const stage = ENTRY_POINT_STAGES.get(fn.name) ?? null;
      const isEntryPoint = stage !== null;

      if (isEntryPoint) {
        if (fn.returnType.type !== DataType.Void) {
          this.error(`entry point '${fn.name}' must return void`, fn.line, fn.column);
        }
        if (fn.params.length > 0) {
          this.error(`entry point '${fn.name}' must not have parameters`, fn.line, fn.column);
        }
        this.currentStage = stage;
        this.builtinVars = getBuiltinVariables(this.ast.shaderType!, stage);
      } else {
        this.currentStage = null;
        this.builtinVars = null;
      }

      this.currentReturnType = fn.returnType;

      this.pushScope();
      for (const p of fn.params) {
        this.declare(p.name, p.type);
      }
      this.checkStatement(fn.body);
      this.popScope();
    }
  }

  // -- Statement checking -----------------------------------------------------

  private checkStatement(stmt: Ast.Stmt | Ast.Stmt[] | null): void
  {
    if (!stmt) return;

    // Handle arrays of statements (from multi-declarator parsing)
    if (Array.isArray(stmt)) {
      for (const s of stmt) {
        this.checkStatement(s);
      }
      return;
    }

    if (stmt instanceof Ast.BlockStmt) {
      this.pushScope();
      for (const s of stmt.statements) {
        this.checkStatement(s);
      }
      this.popScope();
      return;
    }

    if (stmt instanceof Ast.VarDeclStmt) {
      if (stmt.initializer) {
        const initType = this.resolveExprType(stmt.initializer);
        if (initType !== null && stmt.type && stmt.type.type) {
          if (!this.isAssignable(stmt.type.type, initType)) {
            this.error(
              `cannot assign '${initType}' to '${stmt.type.type}'`,
              stmt.line, stmt.column
            );
          }
        }
      }
      if (stmt.type && stmt.name) {
        this.declare(stmt.name, stmt.type);
      }
      return;
    }

    if (stmt instanceof Ast.LocalConstDecl) {
      if (stmt.initializer) {
        const initType = this.resolveExprType(stmt.initializer);
        if (initType !== null && stmt.type && stmt.type.type) {
          if (!this.isAssignable(stmt.type.type, initType)) {
            this.error(
              `cannot assign '${initType}' to '${stmt.type.type}'`,
              stmt.line, stmt.column
            );
          }
        }
      }
      if (stmt.type && stmt.name) {
        const constType = new TypeInfo(stmt.type.type, {
          arraySize: stmt.type.arraySize,
          structName: stmt.type.structName,
          isConst: true,
        });
        this.declare(stmt.name, constType);
      }
      return;
    }

    if (stmt instanceof Ast.IfStmt) {
      const condType = this.resolveExprType(stmt.condition);
      if (condType !== null && condType !== DataType.Bool) {
        this.error(`if condition must be bool, got '${condType}'`, stmt.line, stmt.column);
      }
      this.checkStatement(stmt.thenBranch);
      if (stmt.elseBranch) {
        this.checkStatement(stmt.elseBranch);
      }
      return;
    }

    if (stmt instanceof Ast.ForStmt) {
      this.pushScope();
      if (stmt.init) this.checkStatement(stmt.init);
      if (stmt.condition) {
        const condType = this.resolveExprType(stmt.condition);
        if (condType !== null && condType !== DataType.Bool) {
          this.error(`for condition must be bool, got '${condType}'`, stmt.line, stmt.column);
        }
      }
      if (stmt.increment) this.resolveExprType(stmt.increment);
      this.checkStatement(stmt.body);
      this.popScope();
      return;
    }

    if (stmt instanceof Ast.WhileStmt) {
      const condType = this.resolveExprType(stmt.condition);
      if (condType !== null && condType !== DataType.Bool) {
        this.error(`while condition must be bool, got '${condType}'`, stmt.line, stmt.column);
      }
      this.checkStatement(stmt.body);
      return;
    }

    if (stmt instanceof Ast.DoWhileStmt) {
      this.checkStatement(stmt.body);
      const condType = this.resolveExprType(stmt.condition);
      if (condType !== null && condType !== DataType.Bool) {
        this.error(`do-while condition must be bool, got '${condType}'`, stmt.line, stmt.column);
      }
      return;
    }

    if (stmt instanceof Ast.SwitchStmt) {
      const exprType = this.resolveExprType(stmt.expression);
      if (exprType !== null && !isIntOrUint(exprType)) {
        this.error(`switch expression must be int or uint, got '${exprType}'`, stmt.line, stmt.column);
      }
      for (const c of stmt.cases) {
        for (const s of c.statements) {
          this.checkStatement(s);
        }
      }
      return;
    }

    if (stmt instanceof Ast.ReturnStmt) {
      if (stmt.expression) {
        const exprType = this.resolveExprType(stmt.expression);
        if (exprType !== null && this.currentReturnType) {
          if (!this.isAssignable(this.currentReturnType.type, exprType)) {
            this.error(
              `return type '${exprType}' does not match function return type '${this.currentReturnType.type}'`,
              stmt.line, stmt.column
            );
          }
        }
      }
      return;
    }

    if (stmt instanceof Ast.ExpressionStmt) {
      this.resolveExprType(stmt.expression);
      return;
    }

    // BreakStmt, ContinueStmt, DiscardStmt, EmptyStmt: no checking needed.
  }

  // -- Expression type resolution ---------------------------------------------

  private resolveExprType(expr: Ast.Expr | null): DataTypeValue | null
  {
    if (!expr) return null;

    if (expr instanceof Ast.LiteralExpr) {
      return expr.dataType;
    }

    if (expr instanceof Ast.IdentifierExpr) {
      const ti = this.lookup(expr.name);
      if (!ti) {
        this.error(`undeclared identifier '${expr.name}'`, expr.line, expr.column);
        return null;
      }
      // ti may be a TypeInfo or a plain object from builtinVars.
      if (ti instanceof TypeInfo) return ti.type;
      return ti.type ?? null;
    }

    if (expr instanceof Ast.BinaryExpr) {
      return this.resolveBinaryExpr(expr);
    }

    if (expr instanceof Ast.UnaryExpr) {
      return this.resolveUnaryExpr(expr);
    }

    if (expr instanceof Ast.PostfixExpr) {
      const opType = this.resolveExprType(expr.operand);
      return opType;
    }

    if (expr instanceof Ast.TernaryExpr) {
      const condType = this.resolveExprType(expr.condition);
      if (condType !== null && condType !== DataType.Bool) {
        this.error(`ternary condition must be bool, got '${condType}'`, expr.line, expr.column);
      }
      const trueType = this.resolveExprType(expr.trueExpr);
      const falseType = this.resolveExprType(expr.falseExpr);
      if (trueType !== null && falseType !== null && trueType !== falseType) {
        this.error(
          `ternary branches must have the same type, got '${trueType}' and '${falseType}'`,
          expr.line, expr.column
        );
      }
      return trueType;
    }

    if (expr instanceof Ast.AssignExpr) {
      return this.resolveAssignExpr(expr);
    }

    if (expr instanceof Ast.FunctionCallExpr) {
      return this.resolveFunctionCall(expr);
    }

    if (expr instanceof Ast.TypeConstructExpr) {
      return this.resolveTypeConstruct(expr);
    }

    if (expr instanceof Ast.MemberAccessExpr) {
      return this.resolveMemberAccess(expr);
    }

    if (expr instanceof Ast.IndexExpr) {
      return this.resolveIndexExpr(expr);
    }

    if (expr instanceof Ast.MethodCallExpr) {
      // Only .length() is valid.
      this.resolveExprType(expr.object);
      if (expr.method === 'length') {
        return DataType.Int;
      }
      this.error(`unknown method '${expr.method}'`, expr.line, expr.column);
      return null;
    }

    if (expr instanceof Ast.ArrayConstructExpr) {
      for (const arg of expr.args) {
        this.resolveExprType(arg);
      }
      return expr.elementType.type;
    }

    if (expr instanceof Ast.BraceInitExpr) {
      for (const el of expr.elements) {
        this.resolveExprType(el);
      }
      return null;
    }

    return null;
  }

  // -- Binary expression ------------------------------------------------------

  private resolveBinaryExpr(expr: Ast.BinaryExpr): DataTypeValue | null
  {
    const left = this.resolveExprType(expr.left);
    const right = this.resolveExprType(expr.right);
    if (left === null || right === null) return null;

    const op = expr.op;

    // Logical operators.
    if (op === '&&' || op === '||') {
      if (left !== DataType.Bool || right !== DataType.Bool) {
        this.error(`logical '${op}' requires bool operands, got '${left}' and '${right}'`, expr.line, expr.column);
      }
      return DataType.Bool;
    }

    // Equality operators.
    if (op === '==' || op === '!=') {
      // Allow same type or promotable types.
      if (left !== right && !canPromote(left, right) && !canPromote(right, left)) {
        this.error(`cannot compare '${left}' and '${right}'`, expr.line, expr.column);
      }
      return DataType.Bool;
    }

    // Comparison operators.
    if (op === '<' || op === '>' || op === '<=' || op === '>=') {
      if (!isNumeric(left) || !isNumeric(right)) {
        this.error(`comparison '${op}' requires numeric scalars, got '${left}' and '${right}'`, expr.line, expr.column);
      }
      return DataType.Bool;
    }

    // Bitwise operators.
    if (op === '&' || op === '|' || op === '^' || op === '<<' || op === '>>') {
      if (!isIntOrUintVec(left) || !isIntOrUintVec(right)) {
        this.error(`bitwise '${op}' requires int/uint operands, got '${left}' and '${right}'`, expr.line, expr.column);
      }
      return left;
    }

    // Arithmetic operators.
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
      return this.resolveArithmeticType(left, right, op, expr);
    }

    return left;
  }

  private resolveArithmeticType(left: DataTypeValue, right: DataTypeValue, op: string, expr: Ast.BinaryExpr): DataTypeValue | null
  {
    // Same type: return that type.
    if (left === right) return left;

    // Scalar promotion: int->float, uint->float
    if (isScalar(left) && isScalar(right)) {
      if (canPromote(left, right)) return right;
      if (canPromote(right, left)) return left;
      this.error(`incompatible types '${left}' and '${right}' for '${op}'`, expr.line, expr.column);
      return null;
    }

    // Scalar * vector / vector * scalar promotion.
    if (isScalar(left) && (isVector(right) || isMatrix(right))) {
      const sc = scalarComponentOf(right);
      if (left === sc || canPromote(left, sc)) {
        return right;
      }
    }
    if ((isVector(left) || isMatrix(left)) && isScalar(right)) {
      const sc = scalarComponentOf(left);
      if (right === sc || canPromote(right, sc)) {
        return left;
      }
    }

    // Matrix * vector or vector * matrix (for square matrices).
    if (isMatrix(left) && isVector(right)) {
      return right;
    }
    if (isVector(left) && isMatrix(right)) {
      return left;
    }

    // Matrix * matrix.
    if (isMatrix(left) && isMatrix(right)) {
      return left;
    }

    this.error(`incompatible types '${left}' and '${right}' for '${op}'`, expr.line, expr.column);
    return null;
  }

  // -- Unary expression -------------------------------------------------------

  private resolveUnaryExpr(expr: Ast.UnaryExpr): DataTypeValue | null
  {
    const type = this.resolveExprType(expr.operand);
    if (type === null) return null;

    if (expr.op === '-') {
      if (!isNumeric(type) && !isVector(type) && !isMatrix(type)) {
        this.error(`unary '-' requires numeric type, got '${type}'`, expr.line, expr.column);
      }
      return type;
    }

    if (expr.op === '!') {
      if (type !== DataType.Bool) {
        this.error(`unary '!' requires bool, got '${type}'`, expr.line, expr.column);
      }
      return DataType.Bool;
    }

    if (expr.op === '~') {
      if (!isIntOrUintVec(type)) {
        this.error(`unary '~' requires int/uint, got '${type}'`, expr.line, expr.column);
      }
      return type;
    }

    // ++ and -- (prefix)
    return type;
  }

  // -- Assignment expression --------------------------------------------------

  private resolveAssignExpr(expr: Ast.AssignExpr): DataTypeValue | null
  {
    const targetType = this.resolveExprType(expr.target);
    const valueType = this.resolveExprType(expr.value);

    // Check if target is assignable.
    if (expr.target instanceof Ast.IdentifierExpr) {
      const name = expr.target.name;
      // Check uniforms (read-only).
      if (this.uniforms.has(name)) {
        this.error(`cannot assign to uniform '${name}'`, expr.line, expr.column);
      }
      // Check constants.
      if (this.constants.has(name)) {
        this.error(`cannot assign to constant '${name}'`, expr.line, expr.column);
      }
      // Check read-only builtins.
      if (this.builtinVars && this.builtinVars.has(name)) {
        const bv = this.builtinVars.get(name)!;
        if (bv.access === 'read') {
          this.error(`cannot write to read-only builtin '${name}'`, expr.line, expr.column);
        }
      }
      // Check const locals.
      const ti = this.lookupInScopes(name);
      if (ti && ti.isConst) {
        this.error(`cannot assign to const variable '${name}'`, expr.line, expr.column);
      }
    }

    if (targetType !== null && valueType !== null) {
      // For compound assignment, we just check that the value type is compatible.
      if (!this.isAssignable(targetType, valueType)) {
        this.error(
          `cannot assign '${valueType}' to '${targetType}'`,
          expr.line, expr.column
        );
      }
    }

    return targetType;
  }

  private lookupInScopes(name: string): TypeInfo | null
  {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name)!;
      }
    }
    return null;
  }

  // -- Function calls ---------------------------------------------------------

  private resolveFunctionCall(expr: Ast.FunctionCallExpr): DataTypeValue | null
  {
    const argTypes: (DataTypeValue | null)[] = [];
    for (const arg of expr.args) {
      const t = this.resolveExprType(arg);
      argTypes.push(t);
    }

    // Check if it's a struct constructor.
    if (this.structs.has(expr.name)) {
      const struct = this.structs.get(expr.name)!;
      if (argTypes.length !== struct.members.length) {
        this.error(
          `struct '${expr.name}' constructor expects ${struct.members.length} arguments, got ${argTypes.length}`,
          expr.line, expr.column
        );
      }
      return DataType.Struct;
    }

    // If any argType is null, we can't resolve the overload.
    if (argTypes.some(t => t === null)) return null;

    return this.resolveOverload(expr.name, argTypes as DataTypeValue[], expr.line, expr.column);
  }

  private resolveOverload(name: string, argTypes: DataTypeValue[], line: number, column: number): DataTypeValue | null
  {
    // Gather candidates from user functions and builtins.
    const candidates: OverloadCandidate[] = [];

    for (const uf of this.userFunctions) {
      if (uf.name === name) {
        candidates.push({
          returnType: uf.returnType.type,
          params: uf.params.map(p => p.type),
          stages: null,
          source: 'user',
        });
      }
    }

    const builtinOverloads = this.builtinFns.get(name);
    if (builtinOverloads) {
      for (const ov of builtinOverloads) {
        candidates.push({
          returnType: ov.returnType,
          params: ov.params,
          stages: ov.stages,
          source: 'builtin',
        });
      }
    }

    if (candidates.length === 0) {
      this.error(`unknown function '${name}'`, line, column);
      return null;
    }

    // Three-pass ranked matching.
    // Pass 1: Exact match.
    let matches = this.findMatches(candidates, argTypes, (from, to) => from === to);
    if (matches.length === 0) {
      // Pass 2: Promotion (int->float, uint->float).
      matches = this.findMatches(candidates, argTypes, canPromote);
    }
    if (matches.length === 0) {
      // Pass 3: Conversion (int<->uint).
      matches = this.findMatches(candidates, argTypes, canConvert);
    }

    if (matches.length === 0) {
      this.error(
        `no matching overload for '${name}(${argTypes.join(', ')})'`,
        line, column
      );
      return null;
    }

    if (matches.length > 1) {
      // Ambiguous -- but don't error if all matches return the same type.
      const returnTypes = new Set(matches.map(m => m.returnType));
      if (returnTypes.size > 1) {
        this.error(
          `ambiguous call to '${name}(${argTypes.join(', ')})'`,
          line, column
        );
      }
    }

    const match = matches[0];

    // Check stage restrictions.
    if (match.stages !== null && this.currentStage !== null) {
      if (!match.stages.includes(this.currentStage)) {
        this.error(
          `function '${name}' is not available in ${this.currentStage} stage`,
          line, column
        );
      }
    }

    return match.returnType;
  }

  private findMatches(
    candidates: OverloadCandidate[],
    argTypes: DataTypeValue[],
    matchFn: (from: DataTypeValue, to: DataTypeValue) => boolean,
  ): OverloadCandidate[]
  {
    const results: OverloadCandidate[] = [];
    for (const c of candidates) {
      if (c.params.length !== argTypes.length) continue;
      let ok = true;
      for (let i = 0; i < c.params.length; i++) {
        if (!matchFn(argTypes[i], c.params[i])) {
          ok = false;
          break;
        }
      }
      if (ok) results.push(c);
    }
    return results;
  }

  // -- Type constructors ------------------------------------------------------

  private resolveTypeConstruct(expr: Ast.TypeConstructExpr): DataTypeValue
  {
    // Resolve argument types (for validation).
    for (const arg of expr.args) {
      this.resolveExprType(arg);
    }

    // The constructed type is expr.type.type (DataType string from TypeInfo).
    return expr.type.type;
  }

  // -- Member access / swizzle ------------------------------------------------

  private resolveMemberAccess(expr: Ast.MemberAccessExpr): DataTypeValue | null
  {
    const objType = this.resolveExprType(expr.object);
    if (objType === null) return null;

    // Vector swizzle.
    if (isVector(objType) || isScalar(objType)) {
      return this.resolveSwizzle(objType, expr.member, expr.line, expr.column);
    }

    // Struct member access.
    if (objType === DataType.Struct) {
      // Try to find the struct name from the expression's type info.
      const structName = this.getStructNameFromExpr(expr.object);
      if (structName && this.structs.has(structName)) {
        const struct = this.structs.get(structName)!;
        const member = struct.members.find(m => m.name === expr.member);
        if (member) {
          return member.type.type;
        }
        this.error(`struct '${structName}' has no member '${expr.member}'`, expr.line, expr.column);
        return null;
      }
      // If we can't find the struct, just return null without error -- might be from an
      // unresolved expression.
      return null;
    }

    this.error(`cannot access member '${expr.member}' on type '${objType}'`, expr.line, expr.column);
    return null;
  }

  private getStructNameFromExpr(expr: Ast.Expr): string | null
  {
    if (expr instanceof Ast.IdentifierExpr) {
      const ti = this.lookup(expr.name);
      if (ti instanceof TypeInfo && ti.structName) {
        return ti.structName;
      }
    }
    if (expr instanceof Ast.FunctionCallExpr) {
      // Struct constructor: FunctionCallExpr with struct name
      if (this.structs.has(expr.name)) {
        return expr.name;
      }
    }
    return null;
  }

  private resolveSwizzle(vecType: DataTypeValue, components: string, line: number, column: number): DataTypeValue | null
  {
    const count = vectorComponentCount(vecType);
    if (count === null) {
      this.error(`cannot swizzle type '${vecType}'`, line, column);
      return null;
    }

    // Check that all components come from the same set.
    let usesPosition = false;
    let usesColor = false;

    for (const ch of components) {
      if (POSITION_SET.has(ch)) {
        usesPosition = true;
      } else if (COLOR_SET.has(ch)) {
        usesColor = true;
      } else {
        this.error(`invalid swizzle component '${ch}'`, line, column);
        return null;
      }
    }

    if (usesPosition && usesColor) {
      this.error(`cannot mix position (xyzw) and color (rgba) swizzle components`, line, column);
      return null;
    }

    // Check component indices.
    const indexMap: Record<string, number> = { x: 0, y: 1, z: 2, w: 3, r: 0, g: 1, b: 2, a: 3 };
    for (const ch of components) {
      const idx = indexMap[ch];
      if (idx >= count) {
        this.error(`swizzle component '${ch}' out of range for ${vecType}`, line, column);
        return null;
      }
    }

    // Result type.
    const scalar = scalarComponentOf(vecType);
    if (components.length === 1) {
      return scalar;
    }
    const resultType = vectorTypeFor(scalar, components.length);
    if (!resultType) {
      this.error(`invalid swizzle length ${components.length}`, line, column);
      return null;
    }
    return resultType;
  }

  // -- Index expression -------------------------------------------------------

  private resolveIndexExpr(expr: Ast.IndexExpr): DataTypeValue | null
  {
    const objType = this.resolveExprType(expr.object);
    this.resolveExprType(expr.index);
    if (objType === null) return null;

    if (isVector(objType)) {
      return scalarComponentOf(objType);
    }

    if (isMatrix(objType)) {
      // Indexing a matrix returns a column vector.
      // For matNxM (N cols, M rows), indexing returns vecM.
      const dims = matrixDimensions(objType);
      if (dims) {
        const ROWS_TO_VEC: Record<number, DataTypeValue> = { 2: DataType.Vec2, 3: DataType.Vec3, 4: DataType.Vec4 };
        return ROWS_TO_VEC[dims.rows] ?? DataType.Float;
      }
      return DataType.Float;
    }

    // Array indexing -- return the element type if we know it.
    return null;
  }

  // -- Type compatibility -----------------------------------------------------

  private isAssignable(targetType: DataTypeValue, valueType: DataTypeValue): boolean
  {
    if (targetType === valueType) return true;

    // Scalar promotion.
    if (isScalar(targetType) && isScalar(valueType)) {
      return canPromote(valueType, targetType);
    }

    // Scalar-to-vector/matrix: float can be assigned to vec/mat targets
    // in compound assignments (vec3 *= float, vec2 += float, etc.)
    if ((isVector(targetType) || isMatrix(targetType)) && isScalar(valueType)) {
      const targetScalar = scalarComponentOf(targetType);
      return valueType === targetScalar || canPromote(valueType, targetScalar);
    }

    // Struct assignment -- DataType.Struct matches DataType.Struct.
    if (targetType === DataType.Struct && valueType === DataType.Struct) {
      return true;
    }

    return false;
  }
}
