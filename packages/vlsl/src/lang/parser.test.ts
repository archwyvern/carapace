import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from './parser.js';
import { Lexer } from './lexer.js';

function parse(source: string) {
  const { tokens } = new Lexer(source).tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Parser', () => {
  describe('shader_type', () => {
    it('parses shader_type canvas_item', () => {
      const { ast } = parse('shader_type canvas_item;');
      assert.equal(ast.shaderType, 'canvas_item');
    });

    it('parses shader_type particles', () => {
      const { ast } = parse('shader_type particles;');
      assert.equal(ast.shaderType, 'particles');
    });

    it('errors on missing shader_type', () => {
      const { diagnostics } = parse('uniform float x;');
      assert.ok(diagnostics.length > 0);
    });
  });

  describe('render_mode', () => {
    it('parses render modes', () => {
      const { ast } = parse('shader_type canvas_item;\nrender_mode blend_add, unshaded;');
      assert.deepEqual(ast.renderModes, ['blend_add', 'unshaded']);
    });
  });

  describe('uniforms', () => {
    it('parses a simple uniform', () => {
      const { ast } = parse('shader_type canvas_item;\nuniform float speed;');
      assert.equal(ast.uniforms.length, 1);
      assert.equal(ast.uniforms[0].name, 'speed');
      assert.equal(ast.uniforms[0].type.type, 'float');
    });

    it('parses uniform with hint_range', () => {
      const { ast } = parse('shader_type canvas_item;\nuniform float x : hint_range(0.0, 1.0);');
      assert.equal(ast.uniforms[0].hints.length, 1);
      assert.equal(ast.uniforms[0].hints[0].kind, 'hint_range');
    });

    it('parses uniform with default value', () => {
      const { ast } = parse('shader_type canvas_item;\nuniform float x = 1.0;');
      assert.ok(ast.uniforms[0].defaultValue !== null);
    });

    it('parses global uniform', () => {
      const { ast } = parse('shader_type canvas_item;\nglobal uniform float time;');
      assert.equal(ast.uniforms[0].scope, 'global');
    });
  });

  describe('struct', () => {
    it('parses a struct declaration', () => {
      const { ast } = parse('shader_type canvas_item;\nstruct MyData { vec2 pos; float size; };');
      assert.equal(ast.structs.length, 1);
      assert.equal(ast.structs[0].name, 'MyData');
      assert.equal(ast.structs[0].members.length, 2);
    });
  });

  describe('functions', () => {
    it('parses a void function', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { }');
      assert.equal(ast.functions.length, 1);
      assert.equal(ast.functions[0].name, 'fragment');
    });

    it('parses function with parameters', () => {
      const { ast } = parse('shader_type canvas_item;\nfloat add(float a, float b) { return a + b; }');
      assert.equal(ast.functions[0].params.length, 2);
      assert.equal(ast.functions[0].params[0].name, 'a');
    });

    it('parses function with out parameter', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid get(out float x) { x = 1.0; }');
      assert.equal(ast.functions[0].params[0].qualifier, 'out');
    });
  });

  describe('statements', () => {
    it('parses if/else', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { if (true) { } else { } }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'IfStmt');
      assert.ok(body[0].elseBranch !== null);
    });

    it('parses for loop', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { for (int i = 0; i < 10; i++) { } }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'ForStmt');
    });

    it('parses for loop with expression init', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { int i = 0; for (i = 0; i < 10; i++) { } }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[1].constructor.name, 'ForStmt');
      const init = body[1].init;
      assert.equal(init.constructor.name, 'ExpressionStmt');
      assert.equal(init.expression.constructor.name, 'AssignExpr');
    });

    it('parses variable declaration with initializer', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float x = 1.0; }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'VarDeclStmt');
      assert.equal(body[0].name, 'x');
    });

    it('parses return with expression', () => {
      const { ast } = parse('shader_type canvas_item;\nfloat f() { return 1.0; }');
      const ret: any = ast.functions[0].body.statements[0];
      assert.equal(ret.constructor.name, 'ReturnStmt');
      assert.ok(ret.expression !== null);
    });

    it('parses discard', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { discard; }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'DiscardStmt');
    });

    it('parses while loop', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { while (true) { break; } }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'WhileStmt');
    });

    it('parses switch statement', () => {
      const src = 'shader_type canvas_item;\nvoid fragment() { switch (1) { case 0: break; default: break; } }';
      const { ast } = parse(src);
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body[0].constructor.name, 'SwitchStmt');
      assert.equal(body[0].cases.length, 2);
    });
  });

  describe('expressions', () => {
    it('parses binary operators with precedence', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float x = 1.0 + 2.0 * 3.0; }');
      const init = (ast.functions[0].body.statements[0] as any).initializer;
      assert.equal(init.constructor.name, 'BinaryExpr');
      assert.equal(init.op, '+');
      assert.equal(init.right.constructor.name, 'BinaryExpr');
      assert.equal(init.right.op, '*');
    });

    it('parses ternary', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float x = true ? 1.0 : 0.0; }');
      const init = (ast.functions[0].body.statements[0] as any).initializer;
      assert.equal(init.constructor.name, 'TernaryExpr');
    });

    it('parses type constructors', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { vec3 v = vec3(1.0, 2.0, 3.0); }');
      const init = (ast.functions[0].body.statements[0] as any).initializer;
      assert.equal(init.constructor.name, 'TypeConstructExpr');
      assert.equal(init.args.length, 3);
    });

    it('parses function calls', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float x = sin(1.0); }');
      const init = (ast.functions[0].body.statements[0] as any).initializer;
      assert.equal(init.constructor.name, 'FunctionCallExpr');
      assert.equal(init.name, 'sin');
    });

    it('parses member access (swizzle)', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { vec3 v = vec3(0.0); float x = v.x; }');
      const init = (ast.functions[0].body.statements[1] as any).initializer;
      assert.equal(init.constructor.name, 'MemberAccessExpr');
    });

    it('parses array indexing', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float a[3]; float x = a[0]; }');
      const init = (ast.functions[0].body.statements[1] as any).initializer;
      assert.equal(init.constructor.name, 'IndexExpr');
    });

    it('parses assignment operators', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { float x = 0.0; x += 1.0; }');
      const stmt: any = ast.functions[0].body.statements[1];
      assert.equal(stmt.expression.constructor.name, 'AssignExpr');
      assert.equal(stmt.expression.op, '+=');
    });

    it('parses prefix/postfix operators', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid fragment() { int i = 0; i++; --i; }');
      const stmts: any[] = ast.functions[0].body.statements;
      assert.equal(stmts[1].expression.constructor.name, 'PostfixExpr');
      assert.equal(stmts[2].expression.constructor.name, 'UnaryExpr');
    });

    it('parses struct constructor', () => {
      const { ast } = parse('shader_type canvas_item;\nstruct S { float x; };\nvoid fragment() { S s = S(1.0); }');
      const init = (ast.functions[0].body.statements[0] as any).initializer;
      assert.equal(init.constructor.name, 'FunctionCallExpr');
      assert.equal(init.name, 'S');
    });
  });

  describe('const and varying', () => {
    it('parses top-level const', () => {
      const { ast } = parse('shader_type canvas_item;\nconst float PI2 = 6.28;');
      assert.equal(ast.constants.length, 1);
      assert.equal(ast.constants[0].name, 'PI2');
    });

    it('parses varying', () => {
      const { ast } = parse('shader_type canvas_item;\nvarying float value;');
      assert.equal(ast.varyings.length, 1);
      assert.equal(ast.varyings[0].name, 'value');
    });

    it('parses varying with interpolation qualifier', () => {
      const { ast } = parse('shader_type canvas_item;\nvarying flat int id;');
      assert.equal(ast.varyings[0].interpolation, 'flat');
    });
  });

  describe('buffer', () => {
    it('parses buffer declaration', () => {
      const { ast } = parse('shader_type canvas_item;\nbuffer MyBuf : readonly { float data[]; };');
      assert.equal(ast.buffers.length, 1);
      assert.equal(ast.buffers[0].name, 'MyBuf');
      assert.ok(ast.buffers[0].qualifiers.includes('readonly'));
    });
  });

  describe('specialization constants', () => {
    it('parses spec const', () => {
      const { ast } = parse('shader_type canvas_item;\nconst spec float quality = 1.0;');
      assert.equal(ast.specConstants.length, 1);
      assert.equal(ast.specConstants[0].name, 'quality');
    });
  });

  describe('struct multi-declarator members', () => {
    it('parses multiple members sharing a type', () => {
      const { ast } = parse('shader_type canvas_item;\nstruct S { vec3 a, b; };');
      assert.equal(ast.structs[0].members.length, 2);
      assert.equal(ast.structs[0].members[0].name, 'a');
      assert.equal(ast.structs[0].members[1].name, 'b');
      assert.equal(ast.structs[0].members[0].type.type, 'vec3');
      assert.equal(ast.structs[0].members[1].type.type, 'vec3');
    });
  });

  describe('centroid and sample interpolation qualifiers', () => {
    it('parses varying with centroid interpolation', () => {
      const { ast } = parse('shader_type canvas_item;\nvarying centroid float x;');
      assert.equal(ast.varyings[0].interpolation, 'centroid');
      assert.equal(ast.varyings[0].name, 'x');
    });

    it('parses varying with sample interpolation', () => {
      const { ast } = parse('shader_type canvas_item;\nvarying sample float y;');
      assert.equal(ast.varyings[0].interpolation, 'sample');
      assert.equal(ast.varyings[0].name, 'y');
    });
  });

  describe('const multi-declarator', () => {
    it('parses top-level const with multiple declarators', () => {
      const { ast } = parse('shader_type canvas_item;\nconst float a = 1.0, b = 2.0;');
      assert.equal(ast.constants.length, 2);
      assert.equal(ast.constants[0].name, 'a');
      assert.equal(ast.constants[1].name, 'b');
    });
  });

  describe('var decl multi-declarator', () => {
    it('parses multiple variable declarations in one statement', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid f() { int a = 1, b = 2; }');
      const body: any[] = ast.functions[0].body.statements;
      assert.equal(body.length, 2);
      assert.equal(body[0].constructor.name, 'VarDeclStmt');
      assert.equal(body[0].name, 'a');
      assert.equal(body[1].constructor.name, 'VarDeclStmt');
      assert.equal(body[1].name, 'b');
    });
  });

  describe('parameter const before qualifier', () => {
    it('parses const out parameter', () => {
      const { ast } = parse('shader_type canvas_item;\nvoid f(const out float x) { }');
      const param = ast.functions[0].params[0];
      assert.equal(param.isConst, true);
      assert.equal(param.qualifier, 'out');
    });
  });
});
