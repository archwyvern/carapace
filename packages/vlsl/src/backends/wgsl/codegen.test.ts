import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WgslCodeGen } from './codegen.js';
import { Lexer } from '../../lang/lexer.js';
import { Parser } from '../../lang/parser.js';
import { TypeChecker } from '../../lang/type-checker.js';
import { compile } from '../../index.js';
import type { CodeGenResult } from '../backend.js';

function generate(source: string): CodeGenResult {
  const { tokens } = new Lexer(source).tokenize();
  const { ast } = new Parser(tokens).parse();
  new TypeChecker(ast).check();
  const gen = new WgslCodeGen(ast);
  return gen.generate();
}

describe('WgslCodeGen', () => {
  it('generates a minimal fragment shader', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        COLOR = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `);
    assert.ok(result.codeSections.has('fragment'));
    const frag = result.codeSections.get('fragment');
    assert.ok(frag!.includes('vec4f'));
  });

  it('maps built-in types to WGSL', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        float x = 1.0;
        int i = 1;
        uint u = 1u;
        vec2 v = vec2(1.0);
        mat4 m = mat4(1.0);
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('f32'));
    assert.ok(frag.includes('i32'));
    assert.ok(frag.includes('u32'));
    assert.ok(frag.includes('vec2f'));
    assert.ok(frag.includes('mat4x4f'));
  });

  it('generates uniform block', () => {
    const result = generate(`
      shader_type canvas_item;
      uniform float speed = 1.0;
      void fragment() {
        float s = speed;
      }
    `);
    assert.ok(result.uniformBlockMembers.includes('speed'));
    assert.equal(result.uniforms.length, 1);
    assert.equal(result.uniforms[0].name, 'speed');
  });

  it('generates sampler declarations', () => {
    const result = generate(`
      shader_type canvas_item;
      uniform sampler2D noise_tex;
      void fragment() {
        vec4 c = texture(noise_tex, UV);
      }
    `);
    assert.ok(result.textures.length === 1);
    assert.equal(result.textures[0].name, 'noise_tex');
  });

  it('generates user functions', () => {
    const result = generate(`
      shader_type canvas_item;
      float square(float x) { return x * x; }
      void fragment() { float y = square(2.0); }
    `);
    assert.ok(result.userFunctions.includes('square'));
  });

  it('translates swizzles', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        vec4 c = vec4(1.0);
        vec3 rgb = c.rgb;
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('.rgb'));
  });

  it('collects render mode metadata', () => {
    const result = generate(`
      shader_type canvas_item;
      render_mode blend_add, unshaded;
      void fragment() { }
    `);
    assert.deepEqual(result.rawRenderModes, ['blend_add', 'unshaded']);
    assert.equal(result.renderModes.blendMode, 'add');
    assert.equal(result.renderModes.unshaded, true);
  });

  it('reports success with no diagnostics', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() { COLOR = vec4(1.0); }
    `);
    assert.equal(result.diagnostics.length, 0);
  });

  it('translates ternary to select()', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        float x = true ? 1.0 : 0.0;
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('select'));
  });

  it('emits var for mutable and let for const locals', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        float x = 1.0;
        const float y = 2.0;
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('var '));
    assert.ok(frag.includes('let '));
  });

  it('fragment builtin declarations have space before =', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        COLOR = vec4(1.0);
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    // Should NOT contain a type name immediately followed by '=' (no space).
    assert.ok(!frag.includes('f='), 'found "f=" -- missing space before = in builtin declaration');
  });

  it('emits for-loop with expression init', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        int i = 0;
        for (i = 0; i < 10; i++) {
          COLOR.r += 0.1;
        }
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('for ('), 'should contain a for loop');
    // The init should be an assignment expression, not a var declaration.
    assert.ok(frag.includes('i = 0;'), 'init should be an assignment expression');
  });

  it('translates prefix ++ to compound assignment', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        int i = 0;
        ++i;
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('+= 1'), 'prefix ++ should become += 1');
    assert.ok(!frag.includes('++i'), 'should not emit WGSL prefix ++');
  });

  it('translates prefix -- to compound assignment', () => {
    const result = generate(`
      shader_type canvas_item;
      void fragment() {
        int i = 5;
        --i;
      }
    `);
    const frag = result.codeSections.get('fragment')!;
    assert.ok(frag.includes('-= 1'), 'prefix -- should become -= 1');
  });

  it('resolves local variable types for library name remapping', () => {
    const result = compile(`
      shader_type canvas_item;
      #include <noise>
      void fragment() {
        vec2 p = UV;
        float n = noise_simplex(42, p);
      }
    `);
    assert.equal(result.diagnostics.filter(d => d.severity === 'error').length, 0,
      'should compile without errors');
    const frag = result.codeSections.get('fragment')!;
    // The WGSL name should include a dimension suffix (e.g. noise_simplex_2d),
    // proving that the local variable type for 'p' was resolved.
    assert.ok(frag.includes('noise_simplex_2d'),
      'should remap noise_simplex to noise_simplex_2d when called with a vec2 local');
  });
});
