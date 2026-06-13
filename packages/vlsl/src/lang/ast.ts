import { TypeInfo, type DataTypeValue } from './types.js';
import type { TokenKindValue } from './tokens.js';

// AST node classes for the shader compiler.
// These are plain data classes -- no logic, just property storage.

// Union types for type narrowing
export type Expr =
  | AssignExpr | TernaryExpr | BinaryExpr | UnaryExpr | PostfixExpr
  | MemberAccessExpr | IndexExpr | FunctionCallExpr | MethodCallExpr
  | TypeConstructExpr | ArrayConstructExpr | BraceInitExpr
  | IdentifierExpr | LiteralExpr | SwizzleExpr;

export type Stmt =
  | BlockStmt | VarDeclStmt | LocalConstDecl | IfStmt | ForStmt
  | WhileStmt | DoWhileStmt | SwitchStmt | ReturnStmt | BreakStmt
  | ContinueStmt | DiscardStmt | ExpressionStmt | EmptyStmt;

export type Decl =
  | StructDecl | UniformDecl | VaryingDecl | ConstDecl
  | SpecConstDecl | BufferDecl | FunctionDef | UniformGroupDecl;

export interface StructMember {
  type: TypeInfo;
  name: string;
  arraySize: number;
  precision?: string | null;
}

export interface UniformHint {
  kind: TokenKindValue;
  args?: unknown[];
}

// --- Root ---

export class ShaderAst {
  shaderType: string | null;
  renderModes: string[];
  structs: StructDecl[];
  uniforms: UniformDecl[];
  varyings: VaryingDecl[];
  constants: ConstDecl[];
  specConstants: SpecConstDecl[];
  buffers: BufferDecl[];
  functions: FunctionDef[];
  line: number;
  column: number;

  constructor(shaderType: string | null, line = 0, column = 0) {
    this.shaderType = shaderType;
    this.renderModes = [];
    this.structs = [];
    this.uniforms = [];
    this.varyings = [];
    this.constants = [];
    this.specConstants = [];
    this.buffers = [];
    this.functions = [];
    this.line = line;
    this.column = column;
  }
}

// --- Declarations (top-level) ---

export class StructDecl {
  name: string;
  members: StructMember[];
  line: number;
  column: number;

  constructor(name: string, members: StructMember[], line = 0, column = 0) {
    this.name = name;
    this.members = members;
    this.line = line;
    this.column = column;
  }
}

export class UniformDecl {
  scope: string | null;
  type: TypeInfo;
  name: string;
  hints: UniformHint[];
  defaultValue: Expr | null;
  arraySize: number;
  line: number;
  column: number;

  constructor(scope: string | null, type: TypeInfo, name: string, hints: UniformHint[], defaultValue: Expr | null, arraySize: number, line = 0, column = 0) {
    this.scope = scope;
    this.type = type;
    this.name = name;
    this.hints = hints;
    this.defaultValue = defaultValue;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class VaryingDecl {
  interpolation: string | null;
  precision: string | null;
  type: TypeInfo;
  name: string;
  arraySize: number;
  line: number;
  column: number;

  constructor(interpolation: string | null, precision: string | null, type: TypeInfo, name: string, arraySize: number, line = 0, column = 0) {
    this.interpolation = interpolation;
    this.precision = precision;
    this.type = type;
    this.name = name;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class ConstDecl {
  precision: string | null;
  type: TypeInfo;
  name: string;
  initializer: Expr;
  arraySize: number;
  line: number;
  column: number;

  constructor(precision: string | null, type: TypeInfo, name: string, initializer: Expr, arraySize: number, line = 0, column = 0) {
    this.precision = precision;
    this.type = type;
    this.name = name;
    this.initializer = initializer;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class SpecConstDecl {
  type: TypeInfo;
  name: string;
  hints: UniformHint[];
  defaultValue: Expr | null;
  line: number;
  column: number;

  constructor(type: TypeInfo, name: string, hints: UniformHint[], defaultValue: Expr | null, line = 0, column = 0) {
    this.type = type;
    this.name = name;
    this.hints = hints;
    this.defaultValue = defaultValue;
    this.line = line;
    this.column = column;
  }
}

export class BufferDecl {
  name: string;
  qualifiers: string[];
  members: StructMember[];
  line: number;
  column: number;

  constructor(name: string, qualifiers: string[], members: StructMember[], line = 0, column = 0) {
    this.name = name;
    this.qualifiers = qualifiers;
    this.members = members;
    this.line = line;
    this.column = column;
  }
}

export class FunctionDef {
  returnType: TypeInfo;
  name: string;
  params: ParamDecl[];
  body: BlockStmt;
  line: number;
  column: number;

  constructor(returnType: TypeInfo, name: string, params: ParamDecl[], body: BlockStmt, line = 0, column = 0) {
    this.returnType = returnType;
    this.name = name;
    this.params = params;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

export class ParamDecl {
  qualifier: string | null;
  isConst: boolean;
  precision: string | null;
  type: TypeInfo;
  name: string;
  arraySize: number;
  line: number;
  column: number;

  constructor(qualifier: string | null, isConst: boolean, precision: string | null, type: TypeInfo, name: string, arraySize: number, line = 0, column = 0) {
    this.qualifier = qualifier;
    this.isConst = isConst;
    this.precision = precision;
    this.type = type;
    this.name = name;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class UniformGroupDecl {
  name: string;
  subgroup: string | null;
  line: number;
  column: number;

  constructor(name: string, subgroup: string | null, line = 0, column = 0) {
    this.name = name;
    this.subgroup = subgroup;
    this.line = line;
    this.column = column;
  }
}

// --- Statements ---

export class BlockStmt {
  statements: Stmt[];
  line: number;
  column: number;

  constructor(statements: Stmt[], line = 0, column = 0) {
    this.statements = statements;
    this.line = line;
    this.column = column;
  }
}

export class VarDeclStmt {
  type: TypeInfo;
  name: string;
  initializer: Expr | null;
  arraySize: number;
  line: number;
  column: number;

  constructor(type: TypeInfo, name: string, initializer: Expr | null, arraySize = 0, line = 0, column = 0) {
    this.type = type;
    this.name = name;
    this.initializer = initializer;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class LocalConstDecl {
  precision: string | null;
  type: TypeInfo;
  name: string;
  initializer: Expr;
  arraySize: number;
  line: number;
  column: number;

  constructor(precision: string | null, type: TypeInfo, name: string, initializer: Expr, arraySize: number, line = 0, column = 0) {
    this.precision = precision;
    this.type = type;
    this.name = name;
    this.initializer = initializer;
    this.arraySize = arraySize;
    this.line = line;
    this.column = column;
  }
}

export class IfStmt {
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt | null;
  line: number;
  column: number;

  constructor(condition: Expr, thenBranch: Stmt, elseBranch: Stmt | null, line = 0, column = 0) {
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
    this.line = line;
    this.column = column;
  }
}

export class ForStmt {
  init: Stmt | null;
  condition: Expr | null;
  increment: Expr | null;
  body: Stmt;
  line: number;
  column: number;

  constructor(init: Stmt | null, condition: Expr | null, increment: Expr | null, body: Stmt, line = 0, column = 0) {
    this.init = init;
    this.condition = condition;
    this.increment = increment;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

export class WhileStmt {
  condition: Expr;
  body: Stmt;
  line: number;
  column: number;

  constructor(condition: Expr, body: Stmt, line = 0, column = 0) {
    this.condition = condition;
    this.body = body;
    this.line = line;
    this.column = column;
  }
}

export class DoWhileStmt {
  body: Stmt;
  condition: Expr;
  line: number;
  column: number;

  constructor(body: Stmt, condition: Expr, line = 0, column = 0) {
    this.body = body;
    this.condition = condition;
    this.line = line;
    this.column = column;
  }
}

export class SwitchStmt {
  expression: Expr;
  cases: CaseClause[];
  line: number;
  column: number;

  constructor(expression: Expr, cases: CaseClause[], line = 0, column = 0) {
    this.expression = expression;
    this.cases = cases;
    this.line = line;
    this.column = column;
  }
}

export class CaseClause {
  expression: Expr | null;
  statements: Stmt[];
  line: number;
  column: number;

  constructor(expression: Expr | null, statements: Stmt[], line = 0, column = 0) {
    this.expression = expression;
    this.statements = statements;
    this.line = line;
    this.column = column;
  }
}

export class ReturnStmt {
  expression: Expr | null;
  line: number;
  column: number;

  constructor(expression: Expr | null, line = 0, column = 0) {
    this.expression = expression;
    this.line = line;
    this.column = column;
  }
}

export class BreakStmt {
  line: number;
  column: number;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

export class ContinueStmt {
  line: number;
  column: number;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

export class DiscardStmt {
  line: number;
  column: number;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

export class ExpressionStmt {
  expression: Expr;
  line: number;
  column: number;

  constructor(expression: Expr, line = 0, column = 0) {
    this.expression = expression;
    this.line = line;
    this.column = column;
  }
}

export class EmptyStmt {
  line: number;
  column: number;

  constructor(line = 0, column = 0) {
    this.line = line;
    this.column = column;
  }
}

// --- Expressions ---

export class AssignExpr {
  op: string;
  target: Expr;
  value: Expr;
  line: number;
  column: number;

  constructor(op: string, target: Expr, value: Expr, line = 0, column = 0) {
    this.op = op;
    this.target = target;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

export class TernaryExpr {
  condition: Expr;
  trueExpr: Expr;
  falseExpr: Expr;
  line: number;
  column: number;

  constructor(condition: Expr, trueExpr: Expr, falseExpr: Expr, line = 0, column = 0) {
    this.condition = condition;
    this.trueExpr = trueExpr;
    this.falseExpr = falseExpr;
    this.line = line;
    this.column = column;
  }
}

export class BinaryExpr {
  op: string;
  left: Expr;
  right: Expr;
  line: number;
  column: number;

  constructor(op: string, left: Expr, right: Expr, line = 0, column = 0) {
    this.op = op;
    this.left = left;
    this.right = right;
    this.line = line;
    this.column = column;
  }
}

export class UnaryExpr {
  op: string;
  operand: Expr;
  prefix: boolean;
  line: number;
  column: number;

  constructor(op: string, operand: Expr, prefix: boolean, line = 0, column = 0) {
    this.op = op;
    this.operand = operand;
    this.prefix = prefix;
    this.line = line;
    this.column = column;
  }
}

export class PostfixExpr {
  operand: Expr;
  op: string;
  line: number;
  column: number;

  constructor(operand: Expr, op: string, line = 0, column = 0) {
    this.operand = operand;
    this.op = op;
    this.line = line;
    this.column = column;
  }
}

export class MemberAccessExpr {
  object: Expr;
  member: string;
  line: number;
  column: number;

  constructor(object: Expr, member: string, line = 0, column = 0) {
    this.object = object;
    this.member = member;
    this.line = line;
    this.column = column;
  }
}

export class IndexExpr {
  object: Expr;
  index: Expr;
  line: number;
  column: number;

  constructor(object: Expr, index: Expr, line = 0, column = 0) {
    this.object = object;
    this.index = index;
    this.line = line;
    this.column = column;
  }
}

export class FunctionCallExpr {
  name: string;
  args: Expr[];
  line: number;
  column: number;

  constructor(name: string, args: Expr[], line = 0, column = 0) {
    this.name = name;
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

export class MethodCallExpr {
  object: Expr;
  method: string;
  args: Expr[];
  line: number;
  column: number;

  constructor(object: Expr, method: string, args: Expr[], line = 0, column = 0) {
    this.object = object;
    this.method = method;
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

export class TypeConstructExpr {
  type: TypeInfo;
  args: Expr[];
  line: number;
  column: number;

  constructor(type: TypeInfo, args: Expr[], line = 0, column = 0) {
    this.type = type;
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

export class ArrayConstructExpr {
  elementType: TypeInfo;
  size: number | null;
  args: Expr[];
  line: number;
  column: number;

  constructor(elementType: TypeInfo, size: number | null, args: Expr[], line = 0, column = 0) {
    this.elementType = elementType;
    this.size = size;
    this.args = args;
    this.line = line;
    this.column = column;
  }
}

export class BraceInitExpr {
  elements: Expr[];
  line: number;
  column: number;

  constructor(elements: Expr[], line = 0, column = 0) {
    this.elements = elements;
    this.line = line;
    this.column = column;
  }
}

export class IdentifierExpr {
  name: string;
  line: number;
  column: number;

  constructor(name: string, line = 0, column = 0) {
    this.name = name;
    this.line = line;
    this.column = column;
  }
}

export class LiteralExpr {
  value: unknown;
  dataType: DataTypeValue;
  line: number;
  column: number;

  constructor(value: unknown, dataType: DataTypeValue, line = 0, column = 0) {
    this.value = value;
    this.dataType = dataType;
    this.line = line;
    this.column = column;
  }
}

export class SwizzleExpr {
  object: Expr;
  components: string;
  line: number;
  column: number;

  constructor(object: Expr, components: string, line = 0, column = 0) {
    this.object = object;
    this.components = components;
    this.line = line;
    this.column = column;
  }
}
