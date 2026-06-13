import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TypeChecker } from './type-checker.js';
import { Lexer } from './lexer.js';
import { Parser } from './parser.js';
import type { Diagnostic } from './diagnostic.js';

function check(source: string): { diagnostics: Diagnostic[] } {
  const { tokens } = new Lexer(source).tokenize();
  const { ast } = new Parser(tokens).parse();
  const checker = new TypeChecker(ast);
  return checker.check();
}

function errors(source: string): Diagnostic[] {
  return check(source).diagnostics.filter(d => d.severity === 'error');
}

describe('TypeChecker', () => {
  describe('type validation', () => {
    it('accepts valid fragment shader', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() {
          COLOR = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `).length, 0);
    });

    it('errors on type mismatch in assignment', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() {
          float x = vec2(1.0);
        }
      `).length > 0);
    });

    it('allows implicit int to float promotion', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() {
          float x = 1;
        }
      `).length, 0);
    });
  });

  describe('built-in variables', () => {
    it('allows reading UV in fragment', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { vec2 uv = UV; }
      `).length, 0);
    });

    it('errors on writing to read-only builtin', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() { FRAGCOORD = vec4(0.0); }
      `).length > 0);
    });

    it('errors on using vertex-only builtin in fragment', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() { mat4 m = MODEL_MATRIX; }
      `).length > 0);
    });
  });

  describe('function overload resolution', () => {
    it('resolves sin(float) -> float', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { float x = sin(1.0); }
      `).length, 0);
    });

    it('resolves sin(vec3) -> vec3', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { vec3 x = sin(vec3(1.0)); }
      `).length, 0);
    });

    it('errors on unknown function', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() { float x = foobar(1.0); }
      `).length > 0);
    });
  });

  describe('user-defined functions', () => {
    it('checks user function calls', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        float square(float x) { return x * x; }
        void fragment() { float y = square(2.0); }
      `).length, 0);
    });

    it('errors on wrong argument type', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        float square(float x) { return x * x; }
        void fragment() { float y = square(vec2(1.0)); }
      `).length > 0);
    });
  });

  describe('swizzle validation', () => {
    it('allows valid swizzle', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { vec3 v = vec3(1.0); vec2 xy = v.xy; }
      `).length, 0);
    });

    it('errors on mixed swizzle sets', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() { vec3 v = vec3(1.0); vec2 bad = v.xg; }
      `).length > 0);
    });
  });

  describe('scope and shadowing', () => {
    it('allows shadowing outer variable', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() {
          float x = 1.0;
          { float x = 2.0; }
        }
      `).length, 0);
    });

    it('errors on undeclared variable', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment() { float x = y; }
      `).length > 0);
    });
  });

  describe('entry point constraints', () => {
    it('errors if entry point has parameters', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        void fragment(float x) { }
      `).length > 0);
    });

    it('errors if entry point returns non-void', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        float fragment() { return 1.0; }
      `).length > 0);
    });
  });

  describe('uniform constraints', () => {
    it('errors on assigning to uniform', () => {
      assert.ok(errors(`
        shader_type canvas_item;
        uniform float speed;
        void fragment() { speed = 1.0; }
      `).length > 0);
    });
  });

  describe('struct member access', () => {
    it('allows valid struct member access', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        struct Light { vec3 color; float intensity; };
        void fragment() {
          Light l = Light(vec3(1.0), 0.5);
          vec3 c = l.color;
        }
      `).length, 0);
    });
  });

  describe('binary operator types', () => {
    it('allows vec + vec', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { vec3 a = vec3(1.0) + vec3(2.0); }
      `).length, 0);
    });

    it('allows scalar * vector', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() { vec3 a = 2.0 * vec3(1.0); }
      `).length, 0);
    });
  });

  describe('matrix indexing', () => {
    it('matrix index returns column vector (mat4[i] -> vec4)', () => {
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() {
          mat4 m = mat4(1.0);
          vec4 col = m[0];
        }
      `).length, 0);
    });
  });

  describe('int-uint overload resolution', () => {
    it('int->uint is a conversion not a promotion', () => {
      // If int->uint were a promotion, calling a function with overloads
      // (int)->int and (float)->float with an int argument would be ambiguous
      // because int->float (promotion) and int->uint (if promotion) would
      // both match at the same tier. With int->uint as conversion only,
      // the (int)->int overload wins by exact match.
      assert.equal(errors(`
        shader_type canvas_item;
        void fragment() {
          float x = sin(1);
        }
      `).length, 0);
    });
  });
});
