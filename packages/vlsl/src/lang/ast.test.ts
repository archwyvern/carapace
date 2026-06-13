import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ShaderAst, FunctionDef, BlockStmt, ReturnStmt,
         BinaryExpr, IdentifierExpr, LiteralExpr, VarDeclStmt,
         UniformDecl, StructDecl, TypeConstructExpr,
         FunctionCallExpr, AssignExpr,
         ParamDecl, BreakStmt, ContinueStmt, DiscardStmt,
         WhileStmt, DoWhileStmt,
         ExpressionStmt, EmptyStmt, PostfixExpr, UnaryExpr,
         TernaryExpr, MemberAccessExpr, IndexExpr,
         VaryingDecl, ConstDecl, SpecConstDecl, BufferDecl,
         UniformGroupDecl, LocalConstDecl, MethodCallExpr,
         ArrayConstructExpr, BraceInitExpr, SwizzleExpr } from './ast.js';
import { TypeInfo, DataType } from './types.js';

describe('AST nodes', () => {
  it('creates a ShaderAst root', () => {
    const ast = new ShaderAst('canvas_item');
    assert.equal(ast.shaderType, 'canvas_item');
    assert.deepEqual(ast.renderModes, []);
    assert.deepEqual(ast.functions, []);
    assert.deepEqual(ast.uniforms, []);
    assert.deepEqual(ast.structs, []);
    assert.deepEqual(ast.varyings, []);
    assert.deepEqual(ast.constants, []);
    assert.deepEqual(ast.buffers, []);
    assert.deepEqual(ast.specConstants, []);
  });

  it('creates a function definition', () => {
    const body = new BlockStmt([new ReturnStmt(null)]);
    const fn = new FunctionDef(
      new TypeInfo(DataType.Void), 'fragment', [], body
    );
    assert.equal(fn.name, 'fragment');
    assert.equal(fn.returnType.type, DataType.Void);
    assert.equal(fn.body.statements.length, 1);
  });

  it('creates expression nodes', () => {
    const left = new IdentifierExpr('x');
    const right = new LiteralExpr(1.0, DataType.Float);
    const bin = new BinaryExpr('+', left, right);
    assert.equal(bin.op, '+');
    assert.equal((bin.left as IdentifierExpr).name, 'x');
    assert.equal((bin.right as LiteralExpr).value, 1.0);
  });

  it('creates a variable declaration', () => {
    const init = new LiteralExpr(0.0, DataType.Float);
    const decl = new VarDeclStmt(new TypeInfo(DataType.Float), 'speed', init);
    assert.equal(decl.name, 'speed');
    assert.equal((decl.initializer as LiteralExpr).value, 0.0);
  });

  it('creates all statement types', () => {
    assert.ok(new BreakStmt());
    assert.ok(new ContinueStmt());
    assert.ok(new DiscardStmt());
    assert.ok(new EmptyStmt());
    assert.ok(new ExpressionStmt(new IdentifierExpr('x')));
    assert.ok(new WhileStmt(new LiteralExpr(true, DataType.Bool), new BlockStmt([])));
    assert.ok(new DoWhileStmt(new BlockStmt([]), new LiteralExpr(true, DataType.Bool)));
  });

  it('creates all expression types', () => {
    assert.ok(new AssignExpr('=', new IdentifierExpr('x'), new LiteralExpr(1, DataType.Int)));
    assert.ok(new TernaryExpr(new LiteralExpr(true, DataType.Bool), new LiteralExpr(1, DataType.Int), new LiteralExpr(0, DataType.Int)));
    assert.ok(new UnaryExpr('-', new LiteralExpr(1, DataType.Int), true));
    assert.ok(new PostfixExpr(new IdentifierExpr('i'), '++'));
    assert.ok(new MemberAccessExpr(new IdentifierExpr('v'), 'x'));
    assert.ok(new IndexExpr(new IdentifierExpr('a'), new LiteralExpr(0, DataType.Int)));
    assert.ok(new FunctionCallExpr('sin', [new LiteralExpr(1.0, DataType.Float)]));
    assert.ok(new MethodCallExpr(new IdentifierExpr('a'), 'length', []));
    assert.ok(new TypeConstructExpr(new TypeInfo(DataType.Vec3), [new LiteralExpr(1.0, DataType.Float)]));
    assert.ok(new ArrayConstructExpr(new TypeInfo(DataType.Float), null, [new LiteralExpr(1.0, DataType.Float)]));
    assert.ok(new BraceInitExpr([new LiteralExpr(1.0, DataType.Float)]));
    assert.ok(new SwizzleExpr(new IdentifierExpr('v'), 'xyz'));
  });

  it('creates all declaration types', () => {
    assert.ok(new StructDecl('S', [{ type: new TypeInfo(DataType.Float), name: 'x', arraySize: 0 }]));
    assert.ok(new UniformDecl(null, new TypeInfo(DataType.Float), 'speed', [], null, 0));
    assert.ok(new VaryingDecl(null, null, new TypeInfo(DataType.Float), 'v', 0));
    assert.ok(new ConstDecl(null, new TypeInfo(DataType.Float), 'PI', new LiteralExpr(3.14, DataType.Float), 0));
    assert.ok(new SpecConstDecl(new TypeInfo(DataType.Float), 'q', [], new LiteralExpr(1.0, DataType.Float)));
    assert.ok(new BufferDecl('buf', ['readonly'], [{ type: new TypeInfo(DataType.Float), name: 'data', arraySize: -1 }]));
    assert.ok(new ParamDecl(null, false, null, new TypeInfo(DataType.Float), 'x', 0));
    assert.ok(new UniformGroupDecl('group', null));
    assert.ok(new LocalConstDecl(null, new TypeInfo(DataType.Float), 'c', new LiteralExpr(1.0, DataType.Float), 0));
  });

  it('stores line and column', () => {
    const expr = new IdentifierExpr('x', 10, 5);
    assert.equal(expr.line, 10);
    assert.equal(expr.column, 5);
  });
});
